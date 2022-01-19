import * as cdk from "aws-cdk-lib";
import { RestApiStack } from "./rest-api-stack";
import { WebsiteHostingStack } from "./website-hosting-stack";
import {Construct} from 'constructs';
import * as pipelines from "aws-cdk-lib/pipelines";
import * as iam from "aws-cdk-lib/aws-iam";
import {CodeBuildStep} from 'aws-cdk-lib/pipelines';

export class CoffeeListingAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    let appStage = new AppStage(this, "AppStage", { stackName: this.stackName });

    let pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      pipelineName: `Pipeline-${this.stackName}`,
      selfMutation: false,
      publishAssetsInParallel: false,
      synth: new CodeBuildStep("Synth", {
        input: pipelines.CodePipelineSource.connection(
            "markkpamy/extended-cdk-workshop-coffee-listing-app",
            "main",
            {
              connectionArn: "arn:aws:codestar-connections:eu-west-3:407400551832:connection/426860c9-aa75-4b9d-b78f-52db0c2b436d"
            }),
        commands: ["npm ci", "npm run build", "npx cdk synth"],
      }),
      codeBuildDefaults: {
        rolePolicy: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:*"],
            resources: ["*"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["cloudfront:*"],
            resources: ["*"],
          }),
        ],
      },
    });

    pipeline.addStage(appStage, {
      post: [
        new pipelines.ShellStep("DeployFrontEnd", {
          envFromCfnOutputs: {
            SNOWPACK_PUBLIC_CLOUDFRONT_URL: appStage.cfnOutCloudFrontUrl,
            SNOWPACK_PUBLIC_API_IMAGES_URL: appStage.cfnOutApiImagesUrl,
            BUCKET_NAME: appStage.cfnOutBucketName,
            DISTRIBUTION_ID: appStage.cfnOutDistributionId,
          },
          commands: [
            "cd frontend",
            "npm ci",
            "npm run build",
            "aws s3 cp ./src/build s3://$BUCKET_NAME/frontend --recursive",
            `aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"`,
          ],
        }),
      ],
    });
  }
}

interface AppStageProps extends cdk.StageProps {
  stackName: string;
}
class AppStage extends cdk.Stage {
  public readonly cfnOutApiImagesUrl: cdk.CfnOutput;
  public readonly cfnOutCloudFrontUrl: cdk.CfnOutput;
  public readonly cfnOutBucketName: cdk.CfnOutput;
  public readonly cfnOutDistributionId: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);
    let websiteHosting = new WebsiteHostingStack(this, "WebsiteHostingStack", {
      stackName: `WebsiteHostingStack-${props.stackName}`,
    });
    let restApi = new RestApiStack(this, "RestApiStack", {
      stackName: `RestApiStack-${props.stackName}`,
      bucket: websiteHosting.bucket,
      distribution: websiteHosting.distribution,
    });

    this.cfnOutApiImagesUrl = restApi.cfnOutApiImagesUrl;
    this.cfnOutCloudFrontUrl = websiteHosting.cfnOutCloudFrontUrl;
    this.cfnOutBucketName = websiteHosting.cfnOutBucketName;
    this.cfnOutDistributionId = websiteHosting.cfnOutDistributionId;
  }
}
