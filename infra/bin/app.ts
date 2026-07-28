#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { TourVacationStack } from '../lib/tour-vacation-stack';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = new cdk.App();
new TourVacationStack(app, 'TourVacationStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
