const AWS = require("aws-sdk");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const secretsManager = new AWS.SecretsManager();
let pgPool = null;

async function getDbCredentials(secretName) {
  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();
    return JSON.parse(data.SecretString);
  } catch (error) {
    console.error("Error getting DB credentials:", error);
    throw error;
  }
}

async function initDatabase() {
  if (!pgPool) {
    const cred = await getDbCredentials(
      process.env.DB_SECRET_NAME || "mhc/aurora"
    );
    pgPool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: cred.username,
      password: cred.password,
      database: process.env.DB_NAME || "mhc",
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
}

async function createUser(userData) {
  const client = await pgPool.connect();
  try {
    const { email, name, preferences = {}, emergencyContact = {} } = userData;

    // Check if user already exists
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      throw new Error("User already exists with this email");
    }

    const sql = `
      INSERT INTO users (email, name, preferences, emergency_contact, created_at) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
      RETURNING id, email, name, created_at
    `;

    const result = await client.query(sql, [
      email,
      name,
      JSON.stringify(preferences),
      JSON.stringify(emergencyContact),
    ]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getUser(userId) {
  const client = await pgPool.connect();
  try {
    const sql = `
      SELECT id, email, name, preferences, emergency_contact, created_at, last_login, is_active
      FROM users 
      WHERE id = $1 AND is_active = true
    `;

    const result = await client.query(sql, [userId]);
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

async function updateUser(userId, updateData) {
  const client = await pgPool.connect();
  try {
    const allowedFields = ["name", "preferences", "emergency_contact"];
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        if (key === "preferences" || key === "emergency_contact") {
          updates.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error("No valid fields to update");
    }

    values.push(userId);
    const sql = `
      UPDATE users 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, email, name, preferences, emergency_contact
    `;

    const result = await client.query(sql, values);
    if (result.rows.length === 0) {
      throw new Error("User not found or update failed");
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getUserStats(userId) {
  const client = await pgPool.connect();
  try {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m.sentiment = 'crisis' THEN 1 END) as crisis_messages,
        COUNT(CASE WHEN ca.id IS NOT NULL THEN 1 END) as crisis_alerts,
        COUNT(DISTINCT a.id) as total_appointments,
        AVG(f.rating) as average_feedback_rating
      FROM users u
      LEFT JOIN conversations c ON u.id = c.user_id
      LEFT JOIN messages m ON c.id = m.conversation_id
      LEFT JOIN crisis_alerts ca ON u.id = ca.user_id
      LEFT JOIN appointments a ON u.id = a.user_id
      LEFT JOIN feedback f ON u.id = f.user_id
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id
    `;

    const result = await client.query(statsQuery, [userId]);
    return (
      result.rows[0] || {
        total_conversations: 0,
        total_messages: 0,
        crisis_messages: 0,
        crisis_alerts: 0,
        total_appointments: 0,
        average_feedback_rating: null,
      }
    );
  } finally {
    client.release();
  }
}

async function createSession(userId, ipAddress, userAgent) {
  const client = await pgPool.connect();
  try {
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const sql = `
      INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING session_token, expires_at
    `;

    const result = await client.query(sql, [
      userId,
      sessionToken,
      expiresAt,
      ipAddress,
      userAgent,
    ]);

    // Update last login
    await client.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [userId]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

async function validateSession(sessionToken) {
  const client = await pgPool.connect();
  try {
    const sql = `
      SELECT us.user_id, us.expires_at, u.email, u.name
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = $1 AND us.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
    `;

    const result = await client.query(sql, [sessionToken]);
    if (result.rows.length === 0) {
      return null;
    }

    // Update last activity
    await client.query(
      "UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = $1",
      [sessionToken]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

exports.handler = async (event) => {
  console.log("Profile handler received event:", JSON.stringify(event));

  try {
    await initDatabase();

    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const headers = event.headers || {};

    let response;

    switch (httpMethod) {
      case "POST":
        if (event.path?.includes("/login")) {
          // Handle login
          const { email } = body;
          if (!email) {
            throw new Error("Email is required for login");
          }

          // For demo purposes, create user if not exists
          const client = await pgPool.connect();
          try {
            let user = await client.query(
              "SELECT * FROM users WHERE email = $1",
              [email]
            );
            if (user.rows.length === 0) {
              // Create demo user
              const newUser = await createUser({
                email,
                name: body.name || "Demo User",
                preferences: { notifications: true, crisis_alerts: true },
              });
              user = { rows: [newUser] };
            }

            const session = await createSession(
              user.rows[0].id,
              headers["x-forwarded-for"] || "unknown",
              headers["user-agent"] || "unknown"
            );

            response = {
              user: user.rows[0],
              session: session,
            };
          } finally {
            client.release();
          }
        } else {
          // Create new user
          response = await createUser(body);
        }
        break;

      case "GET":
        const sessionToken = headers.authorization?.replace("Bearer ", "");
        if (!sessionToken) {
          throw new Error("Authorization token required");
        }

        const sessionData = await validateSession(sessionToken);
        if (!sessionData) {
          throw new Error("Invalid or expired session");
        }

        if (event.path?.includes("/stats")) {
          response = await getUserStats(sessionData.user_id);
        } else {
          const userData = await getUser(sessionData.user_id);
          const stats = await getUserStats(sessionData.user_id);
          response = { ...userData, stats };
        }
        break;

      case "PUT":
        const updateSessionToken = headers.authorization?.replace(
          "Bearer ",
          ""
        );
        if (!updateSessionToken) {
          throw new Error("Authorization token required");
        }

        const updateSessionData = await validateSession(updateSessionToken);
        if (!updateSessionData) {
          throw new Error("Invalid or expired session");
        }

        response = await updateUser(updateSessionData.user_id, body);
        break;

      default:
        throw new Error(`Unsupported HTTP method: ${httpMethod}`);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error in profile handler:", error);

    return {
      statusCode: error.message.includes("not found")
        ? 404
        : error.message.includes("already exists")
        ? 409
        : error.message.includes("required")
        ? 400
        : 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
