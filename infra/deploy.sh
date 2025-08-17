#!/usr/bin/env bash

# Default values
DEFAULT_ACCOUNT="YOUR_AWS_ACCOUNT_ID"
DEFAULT_REGION="us-east-1"
DEFAULT_ENV="dev"

# Parse named parameters
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --account=*) ACCOUNT="${1#*=}"; shift ;;
    --region=*) REGION="${1#*=}"; shift ;;
    --env=*) ENVIRONMENT="${1#*=}"; shift ;;
    *) break ;;
  esac
done

# Set environment variables for CDK
export CDK_DEPLOY_ACCOUNT=${ACCOUNT:-$DEFAULT_ACCOUNT}
export CDK_DEPLOY_REGION=${REGION:-$DEFAULT_REGION}
DEPLOY_ENV=${ENVIRONMENT:-$DEFAULT_ENV}

# Show deployment info
echo "Deploying environment: $DEPLOY_ENV"
echo "AWS Account: $CDK_DEPLOY_ACCOUNT, Region: $CDK_DEPLOY_REGION"

# Run CDK command with context for environment
npx cdk "$@" --context env=$DEPLOY_ENV
