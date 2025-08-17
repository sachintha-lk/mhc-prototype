import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as rds from "aws-cdk-lib/aws-rds";
import * as budgets from "aws-cdk-lib/aws-budgets";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";

export interface MonitoringStackProps extends cdk.StackProps {
  chatLambda: lambda.Function;
  apiGateway: apigateway.RestApi;
  auroraCluster: rds.DatabaseCluster;
  environment: string;
  alertEmail: string;
}

export class MonitoringStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // SNS Topic for alerts
    this.alertTopic = new sns.Topic(this, "MhcAlertTopic", {
      topicName: "mhc-critical-alerts",
      displayName: "Mental Health Companion Critical Alerts",
    });

    // Subscribe email to critical alerts
    this.alertTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(props.alertEmail)
    );

    // Crisis Alert Topic (separate for high priority)
    const crisisAlertTopic = new sns.Topic(this, "MhcCrisisAlertTopic", {
      topicName: "mhc-crisis-alerts",
      displayName: "Mental Health Companion Crisis Alerts",
    });

    crisisAlertTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(props.alertEmail)
    );

    // Lambda Function Alarms
    const lambdaErrorAlarm = new cloudwatch.Alarm(this, "LambdaErrorRate", {
      alarmName: "MHC-Lambda-High-Error-Rate",
      alarmDescription: "Alert when Lambda error rate exceeds 1%",
      metric: props.chatLambda.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: 5, // 5 errors in 5 minutes
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const lambdaDurationAlarm = new cloudwatch.Alarm(this, "LambdaDuration", {
      alarmName: "MHC-Lambda-High-Duration",
      alarmDescription: "Alert when Lambda duration exceeds 10 seconds",
      metric: props.chatLambda.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: "Average",
      }),
      threshold: 10000, // 10 seconds in milliseconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const lambdaThrottleAlarm = new cloudwatch.Alarm(this, "LambdaThrottles", {
      alarmName: "MHC-Lambda-Throttles",
      alarmDescription: "Alert when Lambda functions are being throttled",
      metric: props.chatLambda.metricThrottles({
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: 1, // Any throttling is concerning
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // API Gateway Alarms
    const apiGateway5xxAlarm = new cloudwatch.Alarm(
      this,
      "ApiGateway5xxErrors",
      {
        alarmName: "MHC-API-5xx-Errors",
        alarmDescription: "Alert when API Gateway 5xx error rate is high",
        metric: props.apiGateway.metricServerError({
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 10, // 10 server errors in 5 minutes
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    const apiGateway4xxAlarm = new cloudwatch.Alarm(
      this,
      "ApiGateway4xxErrors",
      {
        alarmName: "MHC-API-4xx-Errors",
        alarmDescription: "Alert when API Gateway 4xx error rate is high",
        metric: props.apiGateway.metricClientError({
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 50, // 50 client errors in 5 minutes
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    const apiGatewayLatencyAlarm = new cloudwatch.Alarm(
      this,
      "ApiGatewayLatency",
      {
        alarmName: "MHC-API-High-Latency",
        alarmDescription: "Alert when API Gateway latency is high",
        metric: props.apiGateway.metricLatency({
          period: cdk.Duration.minutes(5),
          statistic: "Average",
        }),
        threshold: 5000, // 5 seconds
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    // Database Alarms
    const dbConnectionAlarm = new cloudwatch.Alarm(
      this,
      "DatabaseConnections",
      {
        alarmName: "MHC-DB-High-Connections",
        alarmDescription: "Alert when database connection count is high",
        metric: props.auroraCluster.metricDatabaseConnections({
          period: cdk.Duration.minutes(5),
          statistic: "Average",
        }),
        threshold: 80, // 80% of max connections
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    const dbCpuAlarm = new cloudwatch.Alarm(this, "DatabaseCPU", {
      alarmName: "MHC-DB-High-CPU",
      alarmDescription: "Alert when database CPU utilization is high",
      metric: props.auroraCluster.metricCPUUtilization({
        period: cdk.Duration.minutes(5),
        statistic: "Average",
      }),
      threshold: 80, // 80% CPU utilization
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Custom Crisis Detection Alarm
    const crisisDetectionMetric = new cloudwatch.Metric({
      namespace: "MHC/CrisisDetection",
      metricName: "CrisisAlertsTriggered",
      dimensionsMap: {
        Environment: props.environment,
      },
      statistic: "Sum",
      period: cdk.Duration.minutes(1),
    });

    const crisisDetectionAlarm = new cloudwatch.Alarm(this, "CrisisDetection", {
      alarmName: "MHC-Crisis-Detected",
      alarmDescription:
        "CRITICAL: Crisis situation detected in mental health chat",
      metric: crisisDetectionMetric,
      threshold: 1, // Any crisis detection should trigger immediate alert
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add alarm actions
    lambdaErrorAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    lambdaDurationAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    lambdaThrottleAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    apiGateway5xxAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    apiGateway4xxAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    apiGatewayLatencyAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    dbConnectionAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    dbCpuAlarm.addAlarmAction(new SnsAction(this.alertTopic));

    // Crisis alerts go to separate high-priority topic
    crisisDetectionAlarm.addAlarmAction(new SnsAction(crisisAlertTopic));

    // CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, "MhcDashboard", {
      dashboardName: "Mental-Health-Companion-Operations",
    });

    // Application Health Overview
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# 🧠 Mental Health Companion - Operations Dashboard
        
**Environment**: ${props.environment.toUpperCase()}
**Last Updated**: ${new Date().toISOString()}

## 🎯 Key Metrics
- **Response Time**: Real-time chat response performance
- **Crisis Detection**: Active monitoring for mental health emergencies  
- **User Experience**: API performance and availability
- **System Health**: Infrastructure performance metrics

## 🚨 Alert Status
- **Crisis Alerts**: Immediate notification for mental health emergencies
- **System Alerts**: Technical performance and availability issues
        `,
        width: 24,
        height: 6,
      })
    );

    // Lambda Performance Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "💬 Chat Function Performance",
        left: [
          props.chatLambda.metricInvocations({
            label: "Invocations",
            color: cloudwatch.Color.BLUE,
          }),
          props.chatLambda.metricErrors({
            label: "Errors",
            color: cloudwatch.Color.RED,
          }),
        ],
        right: [
          props.chatLambda.metricDuration({
            label: "Duration (ms)",
            color: cloudwatch.Color.GREEN,
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "🔥 Lambda Performance Metrics",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "ConcurrentExecutions",
            dimensionsMap: {
              FunctionName: props.chatLambda.functionName,
            },
            label: "Concurrent Executions",
            color: cloudwatch.Color.ORANGE,
          }),
          props.chatLambda.metricThrottles({
            label: "Throttles",
            color: cloudwatch.Color.RED,
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // API Gateway Performance Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "🌐 API Gateway Performance",
        left: [
          props.apiGateway.metricCount({
            label: "Total Requests",
            color: cloudwatch.Color.BLUE,
          }),
          props.apiGateway.metricClientError({
            label: "4xx Errors",
            color: cloudwatch.Color.ORANGE,
          }),
          props.apiGateway.metricServerError({
            label: "5xx Errors",
            color: cloudwatch.Color.RED,
          }),
        ],
        right: [
          props.apiGateway.metricLatency({
            label: "Latency (ms)",
            color: cloudwatch.Color.GREEN,
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: "📊 API Success Rate",
        metrics: [
          new cloudwatch.MathExpression({
            expression: "100 - (100 * (m1 + m2) / m3)",
            usingMetrics: {
              m1: props.apiGateway.metricClientError(),
              m2: props.apiGateway.metricServerError(),
              m3: props.apiGateway.metricCount(),
            },
            label: "Success Rate (%)",
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // Database Performance Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "🗄️ Database Performance",
        left: [
          props.auroraCluster.metricCPUUtilization({
            label: "CPU Utilization (%)",
            color: cloudwatch.Color.BLUE,
          }),
          props.auroraCluster.metricDatabaseConnections({
            label: "Active Connections",
            color: cloudwatch.Color.GREEN,
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "💾 Database I/O",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/RDS",
            metricName: "ReadLatency",
            dimensionsMap: {
              DBClusterIdentifier: props.auroraCluster.clusterIdentifier,
            },
            label: "Read Latency (ms)",
            color: cloudwatch.Color.BLUE,
          }),
          new cloudwatch.Metric({
            namespace: "AWS/RDS",
            metricName: "WriteLatency",
            dimensionsMap: {
              DBClusterIdentifier: props.auroraCluster.clusterIdentifier,
            },
            label: "Write Latency (ms)",
            color: cloudwatch.Color.RED,
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // Crisis Detection and Mental Health Metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "🚨 Crisis Detection System",
        left: [crisisDetectionMetric],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "🧠 Mental Health Insights",
        left: [
          new cloudwatch.Metric({
            namespace: "MHC/Analytics",
            metricName: "ConversationsStarted",
            statistic: "Sum",
            label: "New Conversations",
            color: cloudwatch.Color.BLUE,
          }),
          new cloudwatch.Metric({
            namespace: "MHC/Analytics",
            metricName: "AnxietyDetected",
            statistic: "Sum",
            label: "Anxiety Cases",
            color: cloudwatch.Color.ORANGE,
          }),
          new cloudwatch.Metric({
            namespace: "MHC/Analytics",
            metricName: "DepressionDetected",
            statistic: "Sum",
            label: "Depression Cases",
            color: cloudwatch.Color.PURPLE,
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // Cost Management
    const costBudget = new budgets.CfnBudget(this, "MhcCostBudget", {
      budget: {
        budgetName: "MentalHealthCompanion-Monthly-Budget",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: {
          amount: 100, // $100 monthly budget
          unit: "USD",
        },
        costFilters: {
          Service: [
            "Amazon Relational Database Service",
            "AWS Lambda",
            "Amazon API Gateway",
            "Amazon ElastiCache",
            "Amazon Lex",
            "Amazon CloudWatch",
          ],
        },
        costTypes: {
          includeTax: true,
          includeSubscription: true,
          useBlended: false,
          useAmortized: false,
          includeUpfront: true,
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 80, // Alert at 80% of budget
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            {
              subscriptionType: "EMAIL",
              address: props.alertEmail,
            },
          ],
        },
        {
          notification: {
            notificationType: "FORECASTED",
            comparisonOperator: "GREATER_THAN",
            threshold: 100, // Alert when forecasted to exceed budget
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            {
              subscriptionType: "EMAIL",
              address: props.alertEmail,
            },
          ],
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, "DashboardUrl", {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: "CloudWatch Dashboard URL",
    });

    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: this.alertTopic.topicArn,
      description: "SNS Topic ARN for system alerts",
    });

    new cdk.CfnOutput(this, "CrisisAlertTopicArn", {
      value: crisisAlertTopic.topicArn,
      description: "SNS Topic ARN for crisis alerts",
    });
  }
}
