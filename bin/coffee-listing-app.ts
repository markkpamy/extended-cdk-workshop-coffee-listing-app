#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CoffeeListingAppStack } from "../lib/coffee-listing-app-stack";
import { CodeArtifactStack } from "../lib/code-artifact-stack";

const app = new cdk.App();
new CoffeeListingAppStack(app, "CoffeeListingAppStack", {
  stackName: "CoffeeListingAppStack",
});
new CodeArtifactStack(app, "CodeArtifactStack", {
  stackName: "CodeArtifactStack",
});
