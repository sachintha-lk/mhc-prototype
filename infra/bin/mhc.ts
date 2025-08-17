#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { NetworkStack } from '../lib/network-stack';
import { ComputeStack } from '../lib/compute-stack';
import { DataStack } from '../lib/data-stack';
import { FrontendHostingStack } from '../lib/frontend-hosting-stack';

const app = new cdk.App();

// Get deployment environment from context or fall back to 'dev'
const deployEnv = app.node.tryGetContext('env') || 'dev';
console.log(`Deploying to environment: ${deployEnv}`);

// Load configuration file based on environment
let config: any = {};
const configPath = path.join(__dirname, '..', 'config', `${deployEnv}.json`);
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(`Loaded configuration from ${configPath}`);
} else {
  console.warn(`No configuration file found at ${configPath}, using defaults`);
}

// Define environment (account & region) with multiple fallbacks
const env = config.env || { 
  account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
};

const net = new NetworkStack(app, 'NetworkStack', { env });
const data = new DataStack(app, 'DataStack', {
  vpc: net.vpc,
  dbSg: net.dbSg,
  redisSg: net.redisSg,
  env
});
new ComputeStack(app, 'ComputeStack', { 
  network: net,
  env
});
new FrontendHostingStack(app, 'FrontendHostingStack', { env });
