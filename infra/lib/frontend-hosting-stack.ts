import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class FrontendHostingStack extends cdk.Stack {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.siteBucket = new s3.Bucket(this, "MhcWebBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Origin Access Control for secure CloudFront access to S3
    const originAccessControl = new cloudfront.S3OriginAccessControl(
      this,
      "OAC",
      {
        description: "OAC for Mental Health Companion website",
      }
    );

    // CloudFront distribution without custom domain for quick deployment
    this.distribution = new cloudfront.Distribution(
      this,
      "MhcWebDistribution",
      {
        defaultRootObject: "index.html",
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            this.siteBucket,
            {
              originAccessControl: originAccessControl,
            }
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      }
    );

    new s3deploy.BucketDeployment(this, "DeployWeb", {
      sources: [s3deploy.Source.asset("../web/dist")],
      destinationBucket: this.siteBucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });

    new cdk.CfnOutput(this, "WebUrl", {
      value: this.distribution.distributionDomainName,
    });
  }
}
