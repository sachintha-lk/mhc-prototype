const { Pool } = require("pg");
const IORedis = require("ioredis");
const AWS = require("aws-sdk");

const secretsManager = new AWS.SecretsManager();
const sns = new AWS.SNS();
let pgPool = null;
let redisClient = null;

// Available counselors and their specializations
const counselors = [
  { name: "Dr. Lisa Wong", specialization: "anxiety_depression", maxDaily: 8 },
  { name: "Dr. Michael Tan", specialization: "stress_management", maxDaily: 6 },
  { name: "Dr. Sarah Lee", specialization: "crisis_intervention", maxDaily: 4 },
  { name: "Dr. James Chen", specialization: "group_therapy", maxDaily: 10 },
];

// Time slots (in 24-hour format)
const timeSlots = [
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

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

async function initClients(secretName, redisEndpoint, redisAuth) {
  if (!pgPool) {
    const cred = await getDbCredentials(secretName);
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
  if (!redisClient && redisEndpoint) {
    redisClient = new IORedis(redisEndpoint, {
      password: redisAuth,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }
}

async function getAvailableSlots(date, counselorSpecialization = null) {
  const client = await pgPool.connect();
  try {
    let counselorFilter = "";
    let queryParams = [date];

    if (counselorSpecialization) {
      // Filter by counselor specialization
      const matchingCounselors = counselors.filter(
        (c) => c.specialization === counselorSpecialization
      );
      if (matchingCounselors.length > 0) {
        counselorFilter = "AND counselor_name = ANY($2)";
        queryParams.push(matchingCounselors.map((c) => c.name));
      }
    }

    const bookedSlotsQuery = `
      SELECT counselor_name, EXTRACT(HOUR FROM appointment_date) as hour
      FROM appointments 
      WHERE DATE(appointment_date) = $1 
      AND status NOT IN ('cancelled', 'completed')
      ${counselorFilter}
    `;

    const bookedSlots = await client.query(bookedSlotsQuery, queryParams);
    const bookedMap = new Map();

    bookedSlots.rows.forEach((slot) => {
      const key = `${slot.counselor_name}-${slot.hour}`;
      bookedMap.set(key, true);
    });

    const availableSlots = [];

    counselors.forEach((counselor) => {
      if (
        counselorSpecialization &&
        counselor.specialization !== counselorSpecialization
      ) {
        return;
      }

      timeSlots.forEach((time) => {
        const hour = parseInt(time.split(":")[0]);
        const key = `${counselor.name}-${hour}`;

        if (!bookedMap.has(key)) {
          availableSlots.push({
            counselor: counselor.name,
            specialization: counselor.specialization,
            time: time,
            datetime: `${date} ${time}:00`,
          });
        }
      });
    });

    return availableSlots;
  } finally {
    client.release();
  }
}

async function bookAppointment(userId, appointmentData) {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    const {
      counselorName,
      appointmentDate,
      type = "counseling",
      notes = "",
    } = appointmentData;

    // Check if slot is still available
    const conflictCheck = await client.query(
      `SELECT id FROM appointments 
       WHERE counselor_name = $1 
       AND appointment_date = $2 
       AND status NOT IN ('cancelled', 'completed')`,
      [counselorName, appointmentDate]
    );

    if (conflictCheck.rows.length > 0) {
      throw new Error("This time slot is no longer available");
    }

    // Check if user already has an appointment on the same day
    const userConflictCheck = await client.query(
      `SELECT id FROM appointments 
       WHERE user_id = $1 
       AND DATE(appointment_date) = DATE($2) 
       AND status NOT IN ('cancelled', 'completed')`,
      [userId, appointmentDate]
    );

    if (userConflictCheck.rows.length > 0) {
      throw new Error("You already have an appointment scheduled for this day");
    }

    // Create the appointment
    const insertQuery = `
      INSERT INTO appointments (user_id, counselor_name, appointment_date, type, status, notes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, counselor_name, appointment_date, type, status
    `;

    const result = await client.query(insertQuery, [
      userId,
      counselorName,
      appointmentDate,
      type,
      "scheduled",
      notes,
    ]);

    await client.query("COMMIT");

    // Cache the appointment for quick access
    if (redisClient) {
      try {
        await redisClient.setex(
          `appointment:${result.rows[0].id}`,
          86400, // 24 hours
          JSON.stringify(result.rows[0])
        );

        // Add to user's appointment list
        await redisClient.lpush(
          `user_appointments:${userId}`,
          result.rows[0].id
        );
      } catch (redisError) {
        console.warn("Redis caching failed:", redisError);
      }
    }

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getUserAppointments(userId, limit = 10) {
  const client = await pgPool.connect();
  try {
    const query = `
      SELECT id, counselor_name, appointment_date, duration_minutes, type, status, notes, created_at
      FROM appointments 
      WHERE user_id = $1 
      ORDER BY appointment_date DESC
      LIMIT $2
    `;

    const result = await client.query(query, [userId, limit]);
    return result.rows;
  } finally {
    client.release();
  }
}

async function updateAppointmentStatus(appointmentId, status, notes = null) {
  const client = await pgPool.connect();
  try {
    const allowedStatuses = [
      "scheduled",
      "confirmed",
      "completed",
      "cancelled",
      "rescheduled",
    ];
    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid appointment status");
    }

    let updateQuery = "UPDATE appointments SET status = $1";
    let queryParams = [status, appointmentId];

    if (notes) {
      updateQuery += ", notes = $3";
      queryParams = [status, appointmentId, notes];
    }

    updateQuery += " WHERE id = $2 RETURNING *";

    const result = await client.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      throw new Error("Appointment not found");
    }

    // Update cache
    if (redisClient) {
      try {
        await redisClient.setex(
          `appointment:${appointmentId}`,
          86400,
          JSON.stringify(result.rows[0])
        );
      } catch (redisError) {
        console.warn("Redis cache update failed:", redisError);
      }
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

async function sendAppointmentNotification(appointment, type) {
  try {
    const message = {
      appointmentId: appointment.id,
      counselor: appointment.counselor_name,
      date: appointment.appointment_date,
      type: type, // 'confirmation', 'reminder', 'cancellation'
      timestamp: new Date().toISOString(),
    };

    // For demo purposes, just log the notification
    console.log(`Appointment ${type} notification:`, message);

    // In production, you would send to SNS topic for email/SMS notifications
    // await sns.publish({
    //   TopicArn: process.env.NOTIFICATION_TOPIC_ARN,
    //   Message: JSON.stringify(message)
    // }).promise();
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

exports.handler = async (event) => {
  console.log("Appointment handler received event:", JSON.stringify(event));

  try {
    await initClients(
      process.env.DB_SECRET_NAME,
      process.env.REDIS_HOST,
      process.env.REDIS_AUTH
    );

    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const queryParameters = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const headers = event.headers || {};

    // Extract user ID from session (simplified for demo)
    const userId = headers["x-user-id"] || body.userId || 1; // Default to demo user

    let response;

    switch (httpMethod) {
      case "GET":
        if (event.path?.includes("/available")) {
          // Get available appointment slots
          const date =
            queryParameters.date || new Date().toISOString().split("T")[0];
          const specialization = queryParameters.specialization;
          response = await getAvailableSlots(date, specialization);
        } else if (pathParameters.appointmentId) {
          // Get specific appointment
          const appointmentId = pathParameters.appointmentId;
          const client = await pgPool.connect();
          try {
            const result = await client.query(
              "SELECT * FROM appointments WHERE id = $1 AND user_id = $2",
              [appointmentId, userId]
            );
            if (result.rows.length === 0) {
              throw new Error("Appointment not found");
            }
            response = result.rows[0];
          } finally {
            client.release();
          }
        } else {
          // Get user's appointments
          const limit = parseInt(queryParameters.limit) || 10;
          response = await getUserAppointments(userId, limit);
        }
        break;

      case "POST":
        // Book new appointment
        const appointmentData = {
          counselorName: body.counselorName,
          appointmentDate: body.appointmentDate,
          type: body.type || "counseling",
          notes: body.notes || "",
        };

        response = await bookAppointment(userId, appointmentData);

        // Send confirmation notification
        await sendAppointmentNotification(response, "confirmation");
        break;

      case "PUT":
        // Update appointment status
        const appointmentId = pathParameters.appointmentId;
        if (!appointmentId) {
          throw new Error("Appointment ID is required");
        }

        response = await updateAppointmentStatus(
          appointmentId,
          body.status,
          body.notes
        );

        // Send notification for status change
        if (body.status === "cancelled") {
          await sendAppointmentNotification(response, "cancellation");
        }
        break;

      default:
        throw new Error(`Unsupported HTTP method: ${httpMethod}`);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error in appointment handler:", error);

    return {
      statusCode: error.message.includes("not found")
        ? 404
        : error.message.includes("already")
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
