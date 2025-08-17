# MHC Infrastructure

This directory contains the AWS CDK infrastructure code for the MHC prototype.

## Prerequisites

- Node.js (v18+)
- AWS CLI configured with appropriate credentials
- AWS CDK installed (`npm install -g aws-cdk`)

## Environment Configuration

The infrastructure can be deployed to multiple environments (dev, prod, etc.) with different configurations.

### Configuration Files

Environment-specific configurations are stored in the `config/` directory:

- `config/dev.json` - Development environment configuration
- `config/prod.json` - Production environment configuration

Each file contains:
- AWS account and region information
- Environment-specific parameters (domain names, CIDR ranges, etc.)

### Deployment Options

#### Option 1: Using the deploy.sh script

```bash
# Use default environment (dev)
./deploy.sh bootstrap

# Specify environment
./deploy.sh --env=prod deploy

# Specify account and region
./deploy.sh --account=123456789012 --region=us-west-2 --env=dev deploy
```

#### Option 2: Using environment variables

```bash
# Set environment variables manually
export CDK_DEPLOY_ACCOUNT=123456789012
export CDK_DEPLOY_REGION=us-east-1

# Run CDK commands
npx cdk bootstrap
npx cdk deploy
```

#### Option 3: Using CDK context

```bash
npx cdk deploy --context env=prod
```

## Available Stacks

- **NetworkStack**: VPC, subnets, and security groups
- **DataStack**: Aurora Serverless and Redis clusters
- **ComputeStack**: Lambda functions and API Gateway
- **FrontendHostingStack**: S3 bucket and CloudFront distribution for web hosting

## Important Commands

- `npx cdk bootstrap`: Deploy CDK Toolkit resources to your AWS account
- `npx cdk synth`: Generate CloudFormation templates
- `npx cdk deploy`: Deploy all stacks to your AWS account
- `npx cdk deploy StackName`: Deploy a specific stack
- `npx cdk destroy`: Destroy all stacks
- `npx cdk diff`: Compare deployed stacks with current state
