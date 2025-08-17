const AWS = require("aws-sdk");
const { Pool } = require("pg");
const IORedis = require("ioredis");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const secretsManager = new AWS.SecretsManager();
const comprehend = new AWS.Comprehend();
let pgPool = null;
let redisClient = null;
let genAI = null;

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

// Initialize Gemini AI
async function initGeminiAI() {
  if (!genAI) {
    try {
      // Try to get API key from environment variable first
      let apiKey = process.env.GEMINI_API_KEY;
      
      // If not in env, try to get from Secrets Manager
      if (!apiKey && process.env.GEMINI_SECRET_NAME) {
        const data = await secretsManager
          .getSecretValue({ SecretId: process.env.GEMINI_SECRET_NAME })
          .promise();
        const secrets = JSON.parse(data.SecretString);
        apiKey = secrets.GEMINI_API_KEY;
      }
      
      if (apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
        console.log("Gemini AI initialized successfully");
      } else {
        console.warn("No Gemini API key found in environment or secrets");
      }
    } catch (error) {
      console.error("Failed to initialize Gemini AI:", error);
    }
  }
}

// Mental health response templates with more sophisticated AI-like responses
const responses = {
  crisis: [
    "I'm very concerned about what you're sharing. Your life has value and you're not alone. Please reach out to emergency services (995) or a trusted person immediately. I'm here to support you.",
    "These feelings you're describing are serious, and I want you to know that help is available. Please contact emergency services or a crisis helpline right away. Your safety is the most important thing right now.",
  ],
  anxiety: [
    "It sounds like you're experiencing anxiety, which is very common among students. Let's try some breathing exercises together. Take a slow breath in for 4 counts, hold for 4, then out for 4.",
    "Anxiety can feel overwhelming, but there are effective ways to manage it. Have you tried grounding techniques? Try naming 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.",
    "I understand how anxiety can make everything feel overwhelming. Would you like to talk about what's specifically triggering these feelings? Sometimes naming our worries can help reduce their power over us.",
    "Anxiety often comes with physical symptoms too. Are you noticing any changes in your breathing, heart rate, or muscle tension? Let's work on some techniques to help your body feel calmer.",
  ],
  stress: [
    "Academic stress is very common. Breaking tasks into smaller, manageable parts can help. What specific aspect of your studies is causing you the most stress right now?",
    "Stress can be managed with good techniques. Regular sleep, exercise, and time management can make a big difference. What areas would you like to work on first?",
    "I hear that you're feeling stressed. That's completely valid given the pressures you're facing. Let's explore some strategies that might help you feel more in control.",
    "Chronic stress can really take a toll. Have you noticed how stress is affecting your daily life? Your sleep, appetite, or ability to concentrate?",
  ],
  depression: [
    "Thank you for sharing these difficult feelings with me. Depression is treatable, and you don't have to go through this alone. Have you considered speaking with a counselor?",
    "These feelings of sadness are valid, and seeking help shows strength. Small steps like getting outside, staying connected with friends, or maintaining a routine can help.",
    "Depression can make everything feel heavy and hopeless. I want you to know that these feelings, while very real, don't define your worth or your future. You matter.",
    "It takes courage to talk about depression. How long have you been feeling this way? Sometimes it helps to track patterns in our mood.",
  ],
  supportive: [
    "Thank you for reaching out. It takes courage to talk about mental health. I'm here to listen and support you.",
    "You've taken an important step by seeking support. Remember that asking for help is a sign of strength, not weakness.",
    "I'm glad you felt comfortable sharing with me. Everyone's mental health journey is different, and there's no right or wrong way to feel.",
    "It sounds like you're going through a challenging time. I want you to know that your feelings are valid and that support is available.",
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

  // Crisis detection first (highest priority)
  if (detectCrisis(text)) return "crisis";

  // Anxiety indicators
  const anxietyKeywords = [
    "anxious",
    "anxiety",
    "worry",
    "worried",
    "panic",
    "nervous",
    "fear",
    "scared",
    "overwhelmed",
    "racing thoughts",
    "cant stop thinking",
    "restless",
  ];
  const anxietyScore = anxietyKeywords.filter((keyword) =>
    lowerText.includes(keyword)
  ).length;

  // Stress indicators
  const stressKeywords = [
    "stress",
    "stressed",
    "pressure",
    "overwhelmed",
    "deadline",
    "too much",
    "cant handle",
    "burnt out",
    "exhausted",
    "tension",
  ];
  const stressScore = stressKeywords.filter((keyword) =>
    lowerText.includes(keyword)
  ).length;

  // Depression indicators
  const depressionKeywords = [
    "sad",
    "sadness",
    "depressed",
    "depression",
    "empty",
    "hopeless",
    "worthless",
    "lonely",
    "alone",
    "no energy",
    "tired",
    "nothing matters",
    "dont care",
  ];
  const depressionScore = depressionKeywords.filter((keyword) =>
    lowerText.includes(keyword)
  ).length;

  // Return intent with highest score
  const scores = {
    anxiety: anxietyScore,
    stress: stressScore,
    depression: depressionScore,
  };

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return "supportive";

  // Return the intent with the highest score
  return Object.keys(scores).find((key) => scores[key] === maxScore);
}

function generateResponse(intent, userText, conversationHistory = []) {
  const responseOptions = responses[intent] || responses.supportive;
  let baseResponse =
    responseOptions[Math.floor(Math.random() * responseOptions.length)];

  // Add contextual personalization based on user text
  const lowerText = userText.toLowerCase();

  if (intent === "anxiety") {
    if (lowerText.includes("exam") || lowerText.includes("test")) {
      baseResponse =
        "Exam anxiety is very common. " +
        baseResponse +
        " Remember, your worth isn't determined by test scores.";
    } else if (lowerText.includes("sleep") || lowerText.includes("night")) {
      baseResponse =
        "Anxiety often affects our sleep patterns. " +
        baseResponse +
        " Consider creating a calming bedtime routine.";
    } else if (lowerText.includes("social") || lowerText.includes("people")) {
      baseResponse =
        "Social anxiety can feel isolating. " +
        baseResponse +
        " Remember, many people feel nervous in social situations.";
    }
  }

  if (intent === "stress") {
    if (lowerText.includes("work") || lowerText.includes("job")) {
      baseResponse =
        "Work stress is incredibly common. " +
        baseResponse +
        " Setting boundaries between work and personal time is crucial.";
    } else if (
      lowerText.includes("deadline") ||
      lowerText.includes("assignment")
    ) {
      baseResponse =
        "Academic deadlines can feel overwhelming. " +
        baseResponse +
        " Try breaking large tasks into smaller, manageable steps.";
    } else if (
      lowerText.includes("family") ||
      lowerText.includes("relationship")
    ) {
      baseResponse =
        "Relationship stress affects us deeply. " +
        baseResponse +
        " Communication and boundaries are key to healthy relationships.";
    }
  }

  if (intent === "depression") {
    if (lowerText.includes("tired") || lowerText.includes("energy")) {
      baseResponse =
        "Depression often affects our energy levels. " +
        baseResponse +
        " Even small activities like a short walk can help.";
    } else if (lowerText.includes("alone") || lowerText.includes("lonely")) {
      baseResponse =
        "Feeling isolated is a common part of depression. " +
        baseResponse +
        " Reaching out, even in small ways, can make a difference.";
    }
  }

  // Add encouraging follow-up questions
  const followUpQuestions = {
    anxiety: [
      " What usually helps you feel calmer when anxiety strikes?",
      " Have you noticed any specific triggers for your anxiety?",
      " Would you like to try a quick grounding exercise together?",
    ],
    stress: [
      " What's one small thing you could do today to reduce your stress?",
      " How has this stress been affecting your daily routine?",
      " What support systems do you have in place?",
    ],
    depression: [
      " What activities used to bring you joy?",
      " How has your sleep and appetite been lately?",
      " Is there someone in your life you feel comfortable talking to?",
    ],
    supportive: [
      " What brought you here today?",
      " How have you been taking care of yourself lately?",
      " What would feeling better look like for you?",
    ],
  };

  // Add a follow-up question 30% of the time
  if (Math.random() < 0.3 && followUpQuestions[intent]) {
    const questions = followUpQuestions[intent];
    const question = questions[Math.floor(Math.random() * questions.length)];
    baseResponse += question;
  }

  return baseResponse;
}

// Generate AI response using Google Gemini
async function generateGeminiResponse(userText, intent, conversationHistory = [], userName = "Student") {
  try {
    await initGeminiAI();
    
    if (!genAI) {
      console.warn("Gemini AI not initialized, falling back to template responses");
      return generateResponse(intent, userText, conversationHistory);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create context-aware system prompt
    const systemPrompt = `You are MindCare, a compassionate and professional mental health companion specifically designed for university students and young adults. Your role is to provide empathetic, evidence-based support while maintaining appropriate boundaries.

CORE PRINCIPLES:
- Be warm, understanding, and non-judgmental
- Provide practical, actionable advice
- Recognize when professional help is needed
- Keep responses conversational and under 150 words
- Use age-appropriate language for college students

CURRENT CONTEXT:
- User's emotional state: ${intent}
- User's name: ${userName}

RESPONSE GUIDELINES:
${intent === 'crisis' ? 
  `CRISIS SITUATION: This user may be in immediate danger. Your response MUST:
  - Express serious concern and validation
  - Strongly encourage immediate professional help
  - Provide crisis resources (Emergency: 995, Samaritans: +94-112-729729)
  - Emphasize that their life has value
  - Be supportive but directive about seeking help` 
  : 
  `Normal conversation about ${intent}. Provide supportive, practical advice and ask engaging follow-up questions.`
}

Remember: You're a supportive companion, not a replacement for professional therapy. If the conversation becomes too clinical or the user needs specialized help, gently recommend professional resources.`;

    // Prepare conversation history for context
    const conversationContext = conversationHistory.slice(-6).map(msg => 
      `${msg.role === 'user' ? 'Student' : 'MindCare'}: ${msg.content}`
    ).join('\n');

    const fullPrompt = `${systemPrompt}

RECENT CONVERSATION:
${conversationContext}

Student: ${userText}

MindCare:`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    let generatedText = response.text();

    // Clean up response
    generatedText = generatedText.trim();
    
    // Remove any AI assistant prefixes that might leak through
    generatedText = generatedText.replace(/^(MindCare:|Assistant:|AI:)\s*/i, '');
    
    // Ensure response isn't too long
    if (generatedText.length > 500) {
      generatedText = generatedText.substring(0, 497) + '...';
    }

    console.log(`Gemini AI response generated for intent: ${intent}`);
    return generatedText;

  } catch (error) {
    console.error("Gemini AI generation failed:", error);
    // Fallback to template responses
    return generateResponse(intent, userText, conversationHistory);
  }
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

      // Get conversation history for context
      let conversationHistory = [];
      try {
        const historyQuery = `
          SELECT role, content, created_at 
          FROM messages 
          WHERE conversation_id = $1 
          ORDER BY created_at DESC 
          LIMIT 10
        `;
        const historyResult = await client.query(historyQuery, [convId]);
        conversationHistory = historyResult.rows.reverse(); // Reverse to get chronological order
      } catch (historyError) {
        console.warn("Failed to fetch conversation history:", historyError);
      }

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

      // Generate AI response using Gemini
      const userName = body.userName || "Student";
      const response = await generateGeminiResponse(userText, intentCategory, conversationHistory, userName);

      // Save assistant response
      await saveMessageToDb(client, convId, "assistant", response, {
        intent: intentCategory,
        responseType: "gemini_ai",
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
