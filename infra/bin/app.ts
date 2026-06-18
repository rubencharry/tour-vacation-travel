#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TourVacationStack } from '../lib/tour-vacation-stack';

const app = new cdk.App();
new TourVacationStack(app, 'TourVacationStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
