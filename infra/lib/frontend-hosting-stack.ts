import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

export class FrontendHostingStack extends cdk.Stack {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.siteBucket = new s3.Bucket(this, 'MhcWebBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // ACM certificate (must be in us-east-1 for CloudFront)
    const certificate = new certificatemanager.Certificate(this, 'MhcWebCert', {
      domainName: 'your-domain.com', // Replace with your domain
      validation: certificatemanager.CertificateValidation.fromDns()
    });

    this.distribution = new cloudfront.Distribution(this, 'MhcWebDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new cloudfront.origins.S3Origin(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      domainNames: ['your-domain.com'], // Replace with your domain
      certificate
    });

    new s3deploy.BucketDeployment(this, 'DeployWeb', {
      sources: [s3deploy.Source.asset('../web/dist')],
      destinationBucket: this.siteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*']
    });

    new cdk.CfnOutput(this, 'WebUrl', { value: this.distribution.distributionDomainName });
  }
}
