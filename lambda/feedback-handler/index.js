const { Pool } = require('pg');
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();
let pgPool = null;

async function getDbCredentials(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

async function initClients(secretName) {
  if (!pgPool) {
    const cred = await getDbCredentials(secretName);
    pgPool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: cred.username,
      password: cred.password,
      database: process.env.DB_NAME || 'mhc'
    });
  }
}

// Feedback Lambda
exports.handler = async (event) => {
  await initClients(process.env.DB_SECRET_NAME);
  const body = JSON.parse(event.body || '{}');
  // Feedback submission logic
  const { userId, rating, comments } = body;
  const client = await pgPool.connect();
  try {
    const res = await client.query('insert into feedback (user_id, rating, comments) values ($1, $2, $3) returning id', [userId, rating, comments]);
    return { statusCode: 200, body: JSON.stringify({ feedbackId: res.rows[0].id }) };
  } finally {
    client.release();
  }
};
