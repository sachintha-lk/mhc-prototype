const AWS = require('aws-sdk');
const { Pool } = require('pg');
const IORedis = require('ioredis');

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

async function saveMessageToDb(client, conversationId, role, content) {
  const sql = 'insert into messages (conversation_id, role, content) values ($1,$2,$3)';
  await client.query(sql, [conversationId, role, content]);
}

exports.handler = async (event) => {
  const isLex = event.sessionState || (event.invocationSource === 'FulfillmentCodeHook');
  await initClients(process.env.DB_SECRET_NAME, process.env.REDIS_HOST, process.env.REDIS_AUTH);

  if (isLex) {
    const intent = event.sessionState.intent.name;
    const userText = (event.inputTranscript || '');
    const message = `Lex understood intent ${intent}. You said: ${userText}`;
    const client = await pgPool.connect();
    try {
      const convRes = await client.query("insert into conversations (user_id) values (null) returning id");
      const convId = convRes.rows[0].id;
      await saveMessageToDb(client, convId, 'user', userText);
      await saveMessageToDb(client, convId, 'assistant', message);
    } finally {
      client.release();
    }
    return {
      sessionState: { dialogAction: { type: 'Close' }, intent: { name: intent, state: 'Fulfilled' } },
      messages: [{ contentType: 'PlainText', content: message }]
    };
  }

  const body = JSON.parse(event.body || '{}');
  const text = body.text || 'hi';
  const client = await pgPool.connect();
  try {
    const convRes = await client.query("insert into conversations (user_id) values ($1) returning id", [null]);
    const convId = convRes.rows[0].id;
    await saveMessageToDb(client, convId, 'user', text);
    const reply = `Received: ${text}`;
    await saveMessageToDb(client, convId, 'assistant', reply);
    return { statusCode: 200, body: JSON.stringify({ reply, convId }) };
  } finally {
    client.release();
  }
};
