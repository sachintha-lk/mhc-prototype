#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { ComputeStack } from '../lib/compute-stack';
import { DataStack } from '../lib/data-stack';
import { FrontendHostingStack } from '../lib/frontend-hosting-stack';

const app = new cdk.App();
const net = new NetworkStack(app, 'NetworkStack');
const data = new DataStack(app, 'DataStack', {
  vpc: net.vpc,
  dbSg: net.dbSg,
  redisSg: net.redisSg
});
new ComputeStack(app, 'ComputeStack', { network: net });
new FrontendHostingStack(app, 'FrontendHostingStack');
