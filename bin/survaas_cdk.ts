#!/usr/bin/env node
import 'source-map-support/register';
import { promises as fs } from 'fs';
import * as cdk from 'aws-cdk-lib';
import { SurvaasCdkStack } from '../lib/root';

import { CdkGraph } from "@aws/pdk/cdk-graph";
import { CdkGraphDiagramPlugin } from '@aws/pdk/cdk-graph-plugin-diagram'
/**
 * @fileoverview Main CDK application entry point for Survaas infrastructure
 * @module bin/app
 */


/**
 * Main async function to initialize and configure the CDK app
 * @async
 */
(async () => {
/**
 * Create new CDK app instance
 */
const app = new cdk.App();

/**
 * Create default Survaas stack with configuration
 * @param {cdk.App} app - CDK app instance
 * @param {string} id - Stack identifier
 * @param {object} props - Stack properties including app name, admin credentials and environment
 */
new SurvaasCdkStack(app, 'SurvaasDefaultCdkStack', {
  appName: 'SurvaasDefault', //replace with your app name
  surveyAdminName: 'admin', // replace with your db user
  surveyAdminPassword: 'password', // // replace with your db password
  env: { account: 'ACOUNT_ID', region: 'REGION' },
});

// add new apps below. appNames have to be unique.
/*
new SurvaasCdkStack(app, 'SurvaasCustomCdkStack', {
  appName: 'SurvaasCustom', //replace with your app name
  surveyAdminName: 'admin', // replace with your db user
  surveyAdminPassword: 'password', // // replace with your db password
  env: { account: 'ACOUNT_ID', region: 'REGION' },
});
*/

/**
 * Initialize CDK Graph for architecture diagram generation
 * @param {cdk.App} app - CDK app instance
 * @param {object} options - Graph configuration options including plugins
 */
const graph = new CdkGraph(app, {
  plugins: [new CdkGraphDiagramPlugin(
    {
      defaults: {
        theme: "dark",
      },
    },
  )],
});

/**
 * Synthesize the app
 */
app.synth();

/**
 * Generate and save architecture diagram
 * @async
 */
await graph.report();
await fs.copyFile('cdk.out/cdkgraph/diagram.png', 'img/detailed_architecture.png');
})();