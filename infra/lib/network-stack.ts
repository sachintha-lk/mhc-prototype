import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly lambdaSg: ec2.SecurityGroup;
  public readonly dbSg: ec2.SecurityGroup;
  public readonly redisSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'MhcVpc', {
      maxAzs: 2,
      natGateways: 1
    });

    this.lambdaSg = new ec2.SecurityGroup(this, 'LambdaSG', {
      vpc: this.vpc,
      allowAllOutbound: true
    });

    this.dbSg = new ec2.SecurityGroup(this, 'DbSG', { vpc: this.vpc });
    this.dbSg.addIngressRule(this.lambdaSg, ec2.Port.tcp(5432));

    this.redisSg = new ec2.SecurityGroup(this, 'RedisSG', { vpc: this.vpc });
    this.redisSg.addIngressRule(this.lambdaSg, ec2.Port.tcp(6379));
  }
}
