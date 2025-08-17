const { Pool } = require('pg');
const IORedis = require('ioredis');
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();
let pgPool = null;
let redisClient = null;

async function getDbCredentials(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

async function initClients(secretName, redisEndpoint, redisAuth) {
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
  if (!redisClient) {
    redisClient = new IORedis(redisEndpoint, { password: redisAuth });
  }
}

exports.handler = async (event) => {
  await initClients(process.env.DB_SECRET_NAME, process.env.REDIS_HOST, process.env.REDIS_AUTH);
  const body = JSON.parse(event.body || '{}');
  // Appointment booking logic
  const { userId, slotId, details } = body;
  const client = await pgPool.connect();
  try {
    const res = await client.query('insert into appointments (user_id, slot_id, details) values ($1, $2, $3) returning id', [userId, slotId, details]);
    // Optionally use Redis for queue management
    await redisClient.lpush('appointmentQueue', JSON.stringify({ userId, slotId }));
    return { statusCode: 200, body: JSON.stringify({ appointmentId: res.rows[0].id }) };
  } finally {
    client.release();
  }
};
