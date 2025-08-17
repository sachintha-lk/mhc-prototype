import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

export interface DataStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSg: ec2.SecurityGroup;
  redisSg: ec2.SecurityGroup;
}

export class DataStack extends cdk.Stack {
  public readonly auroraSecret: secretsmanager.Secret;
  public readonly redisSecret: secretsmanager.Secret;
  public readonly kmsKey: kms.Key;
  public readonly auroraCluster: rds.ServerlessCluster;
  public readonly redisCluster: elasticache.CfnCacheCluster;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // KMS Key for encryption
    this.kmsKey = new kms.Key(this, 'MhcDataKmsKey', {
      alias: 'mhc-data',
      enableKeyRotation: true
    });

    // Secrets Manager entries
    this.auroraSecret = new secretsmanager.Secret(this, 'AuroraSecret', {
      secretName: 'mhc/aurora',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'mhcadmin' }),
        generateStringKey: 'password',
        excludePunctuation: true
      }
    });

    this.redisSecret = new secretsmanager.Secret(this, 'RedisSecret', {
      secretName: 'mhc/redis-auth',
      generateSecretString: {
        generateStringKey: 'password',
        excludePunctuation: true
      }
    });

    // Aurora Serverless v2 Cluster
    this.auroraCluster = new rds.ServerlessCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_13_6 }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      credentials: rds.Credentials.fromSecret(this.auroraSecret),
      clusterIdentifier: 'mhc-aurora',
      defaultDatabaseName: 'mhc',
      scaling: { minCapacity: 0.5, autoPause: true },
      storageEncryptionKey: this.kmsKey,
      securityGroups: [props.dbSg],
      enableDataApi: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT
    });

    // ElastiCache Redis Cluster
    this.redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [props.redisSg.securityGroupId],
      cacheSubnetGroupName: new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
        description: 'Redis subnet group',
        subnetIds: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds
      }).ref,
      authToken: this.redisSecret.secretValue.toString(),
      transitEncryptionEnabled: true,
      atRestEncryptionEnabled: true
    });
  }
}
