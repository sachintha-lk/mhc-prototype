# MHC Prototype Deployment Guide

This guide helps you deploy the Mental Health Companion prototype on AWS using CDK.

## Prerequisites
- AWS CLI configured with admin credentials
- Node.js >= 18
- AWS CDK v2 installed (`npm install -g aws-cdk`)
- Your domain registered in Route 53 (for SSL)

## Steps

### 1. Build the Frontend
```sh
cd web
npm install
npm run build
```

### 2. Bootstrap CDK (if first time)
```sh
cd ../infra
npm install
cdk bootstrap
```

### 3. Deploy the Stacks
```sh
cdk deploy --all
```
- This will deploy:
  - NetworkStack (VPC, security groups)
  - DataStack (Aurora, Redis, KMS, Secrets)
  - ComputeStack (Lambda, API Gateway)
  - FrontendHostingStack (S3, CloudFront, ACM)

### 4. Configure Environment Variables
- Update `web/.env` with your deployed API URL (see CloudFormation outputs)
- Update domain in `frontend-hosting-stack.ts` for ACM/CloudFront

### 5. Upload Frontend
- The CDK deployment will automatically upload the built frontend to S3 and invalidate CloudFront cache.

### 6. Access the App
- Use the CloudFront URL output to access your deployed frontend.

## Notes
- For SSL, ACM certificate must be in us-east-1.
- For custom domain, update Route 53 DNS records to point to CloudFront.
- For Lex bot integration, configure via AWS Console and set Lambda permissions.

## Business Requirements Coverage
- Secure chat, message persistence, intent handling, scalable infra, secure storage, frontend hosting, SSL.
- Extend Lambda and frontend for more features as needed (profile, analytics, notifications, etc).

## Troubleshooting
- Check CloudFormation/CDK outputs for resource URLs and errors.
- Use AWS Console for manual checks and Lex bot setup.

