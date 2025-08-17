import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NetworkStack } from './network-stack';

interface ComputeStackProps extends cdk.StackProps {
  network: NetworkStack;
}

export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const chatLambda = new lambda.Function(this, 'ChatHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambda/chat-handler'),
      vpc: props.network.vpc,
      securityGroups: [props.network.lambdaSg],
      environment: {
        DB_SECRET_NAME: 'mhc/aurora',
        DB_HOST: '<AURORA_WRITER_ENDPOINT>',
        DB_PORT: '5432',
        DB_NAME: 'mhc',
        REDIS_HOST: '<REDIS_ENDPOINT>',
        REDIS_AUTH: '<REDIS_AUTH_TOKEN>'
      }
    });

    const dbSecret = secretsmanager.Secret.fromSecretNameV2(this, 'DbSecret', 'mhc/aurora');
    dbSecret.grantRead(chatLambda);

    const api = new apigw.LambdaRestApi(this, 'ChatApi', {
      handler: chatLambda,
      proxy: true
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
  }
}
