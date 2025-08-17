import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NetworkStack } from './network-stack';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';

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

    const profileLambda = new lambda.Function(this, 'ProfileHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambda/profile-handler'),
      vpc: props.network.vpc,
      securityGroups: [props.network.lambdaSg]
    });
    const serviceLambda = new lambda.Function(this, 'ServiceHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambda/service-handler'),
      vpc: props.network.vpc,
      securityGroups: [props.network.lambdaSg]
    });
    const appointmentLambda = new lambda.Function(this, 'AppointmentHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambda/appointment-handler'),
      vpc: props.network.vpc,
      securityGroups: [props.network.lambdaSg]
    });
    const feedbackLambda = new lambda.Function(this, 'FeedbackHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambda/feedback-handler'),
      vpc: props.network.vpc,
      securityGroups: [props.network.lambdaSg]
    });

    const dbSecret = secretsmanager.Secret.fromSecretNameV2(this, 'DbSecret', 'mhc/aurora');
    dbSecret.grantRead(chatLambda);

    const api = new apigw.RestApi(this, 'MhcApi', {
      restApiName: 'MHC Service',
      deployOptions: { stageName: 'prod' }
    });
    api.root.addResource('chat').addMethod('POST', new apigw.LambdaIntegration(chatLambda));
    api.root.addResource('profile').addMethod('POST', new apigw.LambdaIntegration(profileLambda));
    api.root.addResource('service').addMethod('GET', new apigw.LambdaIntegration(serviceLambda));
    api.root.addResource('appointment').addMethod('POST', new apigw.LambdaIntegration(appointmentLambda));
    api.root.addResource('feedback').addMethod('POST', new apigw.LambdaIntegration(feedbackLambda));

    const alarmTopic = new sns.Topic(this, 'AlarmTopic');

    const chatLambdaErrorAlarm = new cloudwatch.Alarm(this, 'ChatLambdaErrorAlarm', {
      metric: chatLambda.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1
    });
    chatLambdaErrorAlarm.addAlarmAction(new SnsAction(alarmTopic));

    const webAcl = new waf.CfnWebACL(this, 'MhcWebACL', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSet'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'MhcWebACL'
      }
    });

    new budgets.CfnBudget(this, 'MhcBudget', {
      budget: {
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: 50, unit: 'USD' },
        costFilters: {},
        costTypes: { includeTax: true, includeSubscription: true, useBlended: false, useAmortized: false },
        timePeriod: {}
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 50
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: 'your-email@example.com' }]
        }
      ]
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
  }
}
