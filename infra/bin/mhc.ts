#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as fs from "fs";
import * as path from "path";
import { NetworkStack } from "../lib/network-stack";
import { SecurityStack } from "../lib/security-stack";
import { ComputeStack } from "../lib/compute-stack";
import { DataStack } from "../lib/data-stack";
import { FrontendHostingStack } from "../lib/frontend-hosting-stack";
import { LexBotStack } from "../lib/lex-bot-stack";
import { MonitoringStack } from "../lib/monitoring-stack";

const app = new cdk.App();

// Get deployment environment from context or fall back to 'dev'
const deployEnv = app.node.tryGetContext("env") || "dev";
console.log(
  `🚀 Deploying Mental Health Companion to environment: ${deployEnv}`
);

// Load configuration file based on environment
let config: any = {};
const configPath = path.join(__dirname, "..", "config", `${deployEnv}.json`);
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log(`✅ Loaded configuration from ${configPath}`);
} else {
  console.warn(
    `⚠️  No configuration file found at ${configPath}, using defaults`
  );
  config = {
    parameters: {
      domainName: "mhc-demo.example.com",
      vpcCidr: "10.0.0.0/16",
      environment: deployEnv,
      alertEmail: "alerts@example.com",
    },
  };
}

// Define environment (account & region) with multiple fallbacks
const env = config.env || {
  account:
    process.env.CDK_DEPLOY_ACCOUNT ||
    process.env.CDK_DEFAULT_ACCOUNT ||
    process.env.AWS_ACCOUNT_ID ||
    "123456789012", // Fallback account ID
  region:
    process.env.CDK_DEPLOY_REGION ||
    process.env.CDK_DEFAULT_REGION ||
    process.env.AWS_REGION ||
    "ap-southeast-1", // Default to Singapore for APAC users
};

console.log(`📍 Deploying to Account: ${env.account}, Region: ${env.region}`);

// Tag all resources for better management
const tags = {
  Environment: deployEnv,
  Application: "MentalHealthCompanion",
  CostCenter: "StudentServices",
  Owner: "HealthTech-Team",
  Project: "CampusMentalHealthSupport",
};

// Apply tags to all stacks
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

// 1. Network Foundation
console.log("🏗️  Creating Network Infrastructure...");
const networkStack = new NetworkStack(app, "MhcNetworkStack", {
  env,
  description: "VPC and networking infrastructure for Mental Health Companion",
});

// 2. Security Layer
console.log("🔒 Setting up Security Infrastructure...");
const securityStack = new SecurityStack(app, "MhcSecurityStack", {
  env,
  description: "WAF and security controls for Mental Health Companion",
});

// 3. Data Layer - Aurora Serverless v2 + Redis
console.log("💾 Deploying Data Infrastructure...");
const dataStack = new DataStack(app, "MhcDataStack", {
  vpc: networkStack.vpc,
  dbSg: networkStack.dbSg,
  redisSg: networkStack.redisSg,
  env,
  description: "Aurora Serverless v2 and Redis for Mental Health Companion",
});

// 4. Compute Layer - Lambda Functions + API Gateway
console.log("⚡ Setting up Compute Infrastructure...");
const computeStack = new ComputeStack(app, "MhcComputeStack", {
  network: networkStack,
  webAcl: securityStack.webAcl,
  env,
  description: "Lambda functions and API Gateway for Mental Health Companion",
});

// 5. AI/ML Layer - Amazon Lex Bot
console.log("🤖 Creating AI Conversation Bot...");
const lexBotStack = new LexBotStack(app, "MhcLexBotStack", {
  chatLambdaArn: computeStack.chatLambda.functionArn,
  env,
  description: "Amazon Lex bot for mental health conversations",
});

// 6. Monitoring & Observability
console.log("📊 Setting up Monitoring & Alerting...");
const monitoringStack = new MonitoringStack(app, "MhcMonitoringStack", {
  chatLambda: computeStack.chatLambda,
  apiGateway: computeStack.apiGateway,
  auroraCluster: dataStack.auroraCluster,
  environment: deployEnv,
  alertEmail: config.parameters?.alertEmail || "alerts@example.com",
  env,
  description: "CloudWatch monitoring and alerting for Mental Health Companion",
});

// 7. Frontend Hosting - S3 + CloudFront
console.log("🌐 Setting up Frontend Hosting...");
const frontendStack = new FrontendHostingStack(app, "MhcFrontendStack", {
  env,
  description: "S3 and CloudFront hosting for Mental Health Companion frontend",
});

// Add stack dependencies for proper deployment order
dataStack.addDependency(networkStack);
computeStack.addDependency(dataStack);
computeStack.addDependency(securityStack);
lexBotStack.addDependency(computeStack);
monitoringStack.addDependency(computeStack);
monitoringStack.addDependency(dataStack);

// Output deployment summary
console.log(`
🎯 Mental Health Companion Deployment Summary:
=====================================
Environment: ${deployEnv}
Account: ${env.account}
Region: ${env.region}

📦 Stacks to Deploy:
1. MhcNetworkStack     - VPC, Subnets, Security Groups
2. MhcSecurityStack    - WAF, Security Controls  
3. MhcDataStack        - Aurora Serverless v2, Redis
4. MhcComputeStack     - Lambda, API Gateway
5. MhcLexBotStack      - Amazon Lex Chatbot
6. MhcMonitoringStack  - CloudWatch, Alarms, Budget
7. MhcFrontendStack    - S3, CloudFront

🔧 Configuration:
- Domain: ${config.parameters?.domainName || "Not configured"}
- VPC CIDR: ${config.parameters?.vpcCidr || "10.0.0.0/16"}
- Alert Email: ${config.parameters?.alertEmail || "Not configured"}

🚀 Ready for deployment! Run: cdk deploy --all
`);
