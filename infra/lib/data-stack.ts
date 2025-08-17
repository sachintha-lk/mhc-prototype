import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as elasticache from "aws-cdk-lib/aws-elasticache";

export interface DataStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSg: ec2.SecurityGroup;
  redisSg: ec2.SecurityGroup;
}

export class DataStack extends cdk.Stack {
  public readonly auroraSecret: secretsmanager.Secret;
  public readonly redisSecret: secretsmanager.Secret;
  public readonly kmsKey: kms.Key;
  public readonly auroraCluster: rds.DatabaseCluster;
  public readonly redisCluster: elasticache.CfnReplicationGroup;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // Enhanced KMS Key for healthcare data encryption
    this.kmsKey = new kms.Key(this, "MhcDataKmsKey", {
      alias: "mhc-data-encryption",
      enableKeyRotation: true,
      description: "KMS key for Mental Health Companion data encryption",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
    });

    // Aurora database credentials with stronger password
    this.auroraSecret = new secretsmanager.Secret(this, "AuroraSecret", {
      secretName: "mhc/aurora",
      description: "Aurora PostgreSQL credentials for Mental Health Companion",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "mhcadmin" }),
        generateStringKey: "password",
        excludeCharacters: "\"@/\\'",
        passwordLength: 32,
        includeSpace: false,
      },
    });

    // Redis AUTH token for security
    this.redisSecret = new secretsmanager.Secret(this, "RedisSecret", {
      secretName: "mhc/redis-auth",
      description: "Redis AUTH token for secure caching",
      generateSecretString: {
        excludeCharacters: "\"@/\\'",
        passwordLength: 64,
        includeSpace: false,
        excludePunctuation: true,
      },
    });

    // Aurora Serverless v2 Cluster - Production Ready Configuration
    this.auroraCluster = new rds.DatabaseCluster(this, "AuroraCluster", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4, // Latest stable version
      }),
      // Serverless v2 configuration for auto-scaling
      serverlessV2MinCapacity: 0.5, // Minimum ACUs for cost efficiency
      serverlessV2MaxCapacity: 16, // Maximum ACUs for high load

      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        availabilityZones: props.vpc.availabilityZones.slice(0, 2), // Ensure Multi-AZ
      },
      credentials: rds.Credentials.fromSecret(this.auroraSecret),
      clusterIdentifier: "mhc-aurora-cluster",
      defaultDatabaseName: "mhc",
      securityGroups: [props.dbSg],

      // Enhanced security and encryption
      storageEncrypted: true,
      storageEncryptionKey: this.kmsKey,

      // Backup and maintenance configuration
      backup: {
        retention: cdk.Duration.days(7), // 7-day backup retention for compliance
        preferredWindow: "03:00-04:00", // Low-traffic window
      },
      preferredMaintenanceWindow: "sun:04:00-sun:05:00",

      // Performance monitoring and insights
      cloudwatchLogsExports: ["postgresql"],
      monitoringInterval: cdk.Duration.seconds(60),
      enablePerformanceInsights: true,
      performanceInsightEncryptionKey: this.kmsKey,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,

      // Deletion protection (disable for demo, enable for production)
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Use RETAIN in production

      // Multi-AZ deployment with writer and reader instances
      writer: rds.ClusterInstance.serverlessV2("writer", {
        enablePerformanceInsights: true,
        performanceInsightEncryptionKey: this.kmsKey,
      }),
      readers: [
        rds.ClusterInstance.serverlessV2("reader1", {
          scaleWithWriter: true,
          enablePerformanceInsights: true,
          performanceInsightEncryptionKey: this.kmsKey,
        }),
      ],
    });

    // Redis Subnet Group for Multi-AZ deployment
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "RedisSubnetGroup",
      {
        description: "Multi-AZ subnet group for Redis replication group",
        subnetIds: props.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }).subnetIds,
        cacheSubnetGroupName: "mhc-redis-subnet-group",
      }
    );

    // Redis Parameter Group for optimized performance
    const redisParameterGroup = new elasticache.CfnParameterGroup(
      this,
      "RedisParameterGroup",
      {
        cacheParameterGroupFamily: "redis7.x",
        description: "Optimized Redis parameters for Mental Health Companion",
        properties: {
          "maxmemory-policy": "allkeys-lru", // Evict least recently used keys when memory is full
          timeout: "300", // 5-minute timeout for idle connections
          "tcp-keepalive": "300", // Keep TCP connections alive
        },
      }
    );

    // Redis Replication Group for High Availability and Auto-Failover
    this.redisCluster = new elasticache.CfnReplicationGroup(
      this,
      "RedisReplicationGroup",
      {
        replicationGroupDescription:
          "Mental Health Companion Redis cluster with automatic failover",

        // High availability and failover configuration
        multiAzEnabled: true,
        automaticFailoverEnabled: true,
        numCacheClusters: 2, // 1 primary + 1 replica for Multi-AZ

        // Performance and capacity
        cacheNodeType: "cache.t4g.micro", // ARM-based Graviton2 for better price/performance
        engine: "redis",
        engineVersion: "7.0", // Latest Redis version with improved performance
        port: 6379,

        // Security configuration
        atRestEncryptionEnabled: true,
        transitEncryptionEnabled: true,
        authToken: this.redisSecret.secretValue.unsafeUnwrap(),
        kmsKeyId: this.kmsKey.keyArn,

        // Network and security groups
        cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName,
        securityGroupIds: [props.redisSg.securityGroupId],
        cacheParameterGroupName: redisParameterGroup.ref,

        // Backup and maintenance
        preferredMaintenanceWindow: "sun:05:00-sun:06:00",
        snapshotRetentionLimit: 5, // 5 days of daily snapshots
        snapshotWindow: "03:00-05:00", // Daily backup window

        // Tagging for resource management
        tags: [
          { key: "Environment", value: "dev" },
          { key: "Application", value: "MentalHealthCompanion" },
          { key: "Component", value: "Cache" },
          { key: "CostCenter", value: "StudentServices" },
        ],
      }
    );

    // CloudFormation outputs for cross-stack references
    new cdk.CfnOutput(this, "AuroraWriterEndpoint", {
      value: this.auroraCluster.clusterEndpoint.hostname,
      description: "Aurora PostgreSQL writer endpoint",
      exportName: "MhcAuroraWriterEndpoint",
    });

    new cdk.CfnOutput(this, "AuroraReaderEndpoint", {
      value: this.auroraCluster.clusterReadEndpoint.hostname,
      description: "Aurora PostgreSQL reader endpoint",
      exportName: "MhcAuroraReaderEndpoint",
    });

    new cdk.CfnOutput(this, "RedisConfigurationEndpoint", {
      value:
        this.redisCluster.attrConfigurationEndPointAddress ||
        this.redisCluster.attrPrimaryEndPointAddress,
      description:
        "Redis cluster configuration endpoint for automatic failover",
      exportName: "MhcRedisConfigEndpoint",
    });

    new cdk.CfnOutput(this, "RedisPrimaryEndpoint", {
      value: this.redisCluster.attrPrimaryEndPointAddress,
      description: "Redis primary endpoint",
      exportName: "MhcRedisPrimaryEndpoint",
    });

    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: this.auroraSecret.secretArn,
      description: "Aurora database credentials secret ARN",
      exportName: "MhcDatabaseSecretArn",
    });

    new cdk.CfnOutput(this, "RedisSecretArn", {
      value: this.redisSecret.secretArn,
      description: "Redis AUTH token secret ARN",
      exportName: "MhcRedisSecretArn",
    });

    new cdk.CfnOutput(this, "KmsKeyArn", {
      value: this.kmsKey.keyArn,
      description: "KMS key ARN for data encryption",
      exportName: "MhcKmsKeyArn",
    });
  }
}
