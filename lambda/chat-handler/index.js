const AWS = require("aws-sdk");
const { Pool } = require("pg");
const IORedis = require("ioredis");

const secretsManager = new AWS.SecretsManager();
const comprehend = new AWS.Comprehend();
let pgPool = null;
let redisClient = null;

// Crisis keywords for immediate detection
const crisisKeywords = [
  "suicide",
  "kill myself",
  "end it all",
  "worthless",
  "hopeless",
  "better off dead",
  "nobody cares",
  "want to die",
  "hurt myself",
  "self harm",
  "overdose",
  "give up",
  "no point",
  "cant go on",
];

// Mental health response templates
const responses = {
  crisis: [
    "I'm very concerned about what you're sharing. Your life has value and you're not alone. Please reach out to emergency services (995) or a trusted person immediately. I'm here to support you.",
    "These feelings you're describing are serious, and I want you to know that help is available. Please contact emergency services or a crisis helpline right away. Your safety is the most important thing right now.",
  ],
  anxiety: [
    "It sounds like you're experiencing anxiety, which is very common among students. Let's try some breathing exercises together. Take a slow breath in for 4 counts, hold for 4, then out for 4.",
    "Anxiety can feel overwhelming, but there are effective ways to manage it. Have you tried grounding techniques? Try naming 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.",
  ],
  stress: [
    "Academic stress is very common. Breaking tasks into smaller, manageable parts can help. What specific aspect of your studies is causing you the most stress right now?",
    "Stress can be managed with good techniques. Regular sleep, exercise, and time management can make a big difference. What areas would you like to work on first?",
  ],
  depression: [
    "Thank you for sharing these difficult feelings with me. Depression is treatable, and you don't have to go through this alone. Have you considered speaking with a counselor?",
    "These feelings of sadness are valid, and seeking help shows strength. Small steps like getting outside, staying connected with friends, or maintaining a routine can help.",
  ],
  supportive: [
    "Thank you for reaching out. It takes courage to talk about mental health. I'm here to listen and support you.",
    "You've taken an important step by seeking support. Remember that asking for help is a sign of strength, not weakness.",
  ],
};

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

async function detectSentiment(text) {
  try {
    const params = {
      Text: text,
      LanguageCode: "en",
    };
    const result = await comprehend.detectSentiment(params).promise();
    return {
      sentiment: result.Sentiment,
      confidence: Math.max(...Object.values(result.SentimentScore)),
    };
  } catch (error) {
    console.warn("Sentiment analysis failed:", error);
    return { sentiment: "NEUTRAL", confidence: 0.5 };
  }
}

function detectCrisis(text) {
  const lowerText = text.toLowerCase();
  const crisisDetected = crisisKeywords.some((keyword) =>
    lowerText.includes(keyword)
  );
  return crisisDetected;
}

function categorizeIntent(text) {
  const lowerText = text.toLowerCase();

  if (detectCrisis(text)) return "crisis";
  if (
    lowerText.includes("anxious") ||
    lowerText.includes("worry") ||
    lowerText.includes("panic")
  )
    return "anxiety";
  if (
    lowerText.includes("stress") ||
    lowerText.includes("overwhelmed") ||
    lowerText.includes("pressure")
  )
    return "stress";
  if (
    lowerText.includes("sad") ||
    lowerText.includes("depressed") ||
    lowerText.includes("empty")
  )
    return "depression";

  return "supportive";
}

function generateResponse(intent, userText) {
  const responseOptions = responses[intent] || responses.supportive;
  const randomResponse =
    responseOptions[Math.floor(Math.random() * responseOptions.length)];

  // Add personalization based on user text
  if (intent === "anxiety" && userText.toLowerCase().includes("exam")) {
    return (
      "Exam anxiety is very common. " +
      randomResponse +
      " Remember, your worth isn't determined by test scores."
    );
  }

  return randomResponse;
}

async function saveMessageToDb(
  client,
  conversationId,
  role,
  content,
  metadata = {}
) {
  const sql = `INSERT INTO messages (conversation_id, role, content, sentiment, confidence_score, intent_name, escalation_flag, metadata) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`;
  const values = [
    conversationId,
    role,
    content,
    metadata.sentiment || null,
    metadata.confidence || null,
    metadata.intent || null,
    metadata.escalationFlag || false,
    JSON.stringify(metadata),
  ];
  const result = await client.query(sql, values);
  return result.rows[0].id;
}

async function createCrisisAlert(client, userId, messageId, conversationId) {
  const sql = `INSERT INTO crisis_alerts (user_id, message_id, conversation_id, severity, status, notes) 
               VALUES ($1, $2, $3, $4, $5, $6)`;
  await client.query(sql, [
    userId,
    messageId,
    conversationId,
    "critical",
    "pending",
    "Automated crisis detection triggered",
  ]);
}

exports.handler = async (event) => {
  console.log("Chat handler received event:", JSON.stringify(event));

  try {
    const isLex =
      event.sessionState || event.invocationSource === "FulfillmentCodeHook";
    await initClients(
      process.env.DB_SECRET_NAME,
      process.env.REDIS_HOST,
      process.env.REDIS_AUTH
    );

    if (isLex) {
      // Handle Lex integration
      const intent = event.sessionState.intent.name;
      const userText = event.inputTranscript || "";
      const intentCategory = categorizeIntent(userText);
      const response = generateResponse(intentCategory, userText);

      const client = await pgPool.connect();
      try {
        const convRes = await client.query(
          "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id",
          [null, `Lex conversation - ${intent}`]
        );
        const convId = convRes.rows[0].id;

        const sentimentData = await detectSentiment(userText);
        const isCrisis = detectCrisis(userText);

        const userMessageId = await saveMessageToDb(
          client,
          convId,
          "user",
          userText,
          {
            sentiment: sentimentData.sentiment,
            confidence: sentimentData.confidence,
            intent: intentCategory,
            escalationFlag: isCrisis,
            source: "lex",
          }
        );

        if (isCrisis) {
          await createCrisisAlert(client, null, userMessageId, convId);
        }

        await saveMessageToDb(client, convId, "assistant", response, {
          intent: intentCategory,
          responseType: "automated",
          source: "lex",
        });
      } finally {
        client.release();
      }

      return {
        sessionState: {
          dialogAction: { type: "Close" },
          intent: { name: intent, state: "Fulfilled" },
        },
        messages: [{ contentType: "PlainText", content: response }],
      };
    }

    // Handle direct API calls
    const body = JSON.parse(event.body || "{}");
    const userText = body.text || body.message || "Hi";
    const userId = body.userId || null;
    const conversationId = body.conversationId || null;

    const client = await pgPool.connect();
    try {
      let convId = conversationId;

      // Create new conversation if not provided
      if (!convId) {
        const convRes = await client.query(
          "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id",
          [userId, `Chat session - ${new Date().toISOString()}`]
        );
        convId = convRes.rows[0].id;
      }

      // Analyze user message
      const sentimentData = await detectSentiment(userText);
      const intentCategory = categorizeIntent(userText);
      const isCrisis = detectCrisis(userText);

      // Save user message
      const userMessageId = await saveMessageToDb(
        client,
        convId,
        "user",
        userText,
        {
          sentiment: sentimentData.sentiment,
          confidence: sentimentData.confidence,
          intent: intentCategory,
          escalationFlag: isCrisis,
          source: "api",
        }
      );

      // Handle crisis situations
      if (isCrisis) {
        await createCrisisAlert(client, userId, userMessageId, convId);
        console.log("CRISIS ALERT: Crisis detected in conversation", convId);
      }

      // Generate response
      const response = generateResponse(intentCategory, userText);

      // Save assistant response
      await saveMessageToDb(client, convId, "assistant", response, {
        intent: intentCategory,
        responseType: "automated",
        source: "api",
      });

      // Cache conversation in Redis for quick access
      if (redisClient) {
        try {
          await redisClient.setex(
            `conversation:${convId}`,
            3600,
            JSON.stringify({
              id: convId,
              lastMessage: response,
              sentiment: sentimentData.sentiment,
              intent: intentCategory,
              crisis: isCrisis,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (redisError) {
          console.warn("Redis caching failed:", redisError);
        }
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: JSON.stringify({
          reply: response,
          conversationId: convId,
          sentiment: sentimentData.sentiment,
          intent: intentCategory,
          crisis: isCrisis,
          confidence: sentimentData.confidence,
          timestamp: new Date().toISOString(),
        }),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in chat handler:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error:
          "I apologize, but I encountered a technical issue. Please try again, or contact support if the problem persists.",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
