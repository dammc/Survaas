import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SurvaasClusterStack } from './stack/appCluster';
import { SurveyVpcConstruct } from './construct/vpc';

/**
 * Main CDK stack class for the Survaas application
 * @class SurvaasRootStack
 * @extends cdk.Stack
 */
export class SurvaasRootStack extends cdk.Stack {
  /** Stack containing VPC networking resources */
  public readonly surveyVpcConstruct: SurveyVpcConstruct;

  /**
   * Creates a new instance of SurvaasRootStack
   * @param scope - Parent construct
   * @param id - Construct ID
   * @param props - Stack properties
   */
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.surveyVpcConstruct = new SurveyVpcConstruct(this, 'SurvaasDefaultVpc');

    new SurvaasClusterStack(this, 'SurvaasDefaultClusterStack', {
      appName: 'SurvaasDefault', //replace with a unique app name
      surveyAdminName: 'admin', // replace with your db user
      surveyAdminPassword: 'password', // // replace with your db password
      surveyVpcConstruct: this.surveyVpcConstruct,
      env: { account: this.account, region: this.region },
    });

    // add new apps below. Stack IDs and appNames have to be unique.
    /*
    new SurvaasClusterStack(this, 'SurvaasCustomClusterStack', { // stack ID has to be unique
      appName: 'SurvaasCustom', //replace with a unique app name
      surveyAdminName: 'admin', // replace with your db user
      surveyAdminPassword: 'password', // // replace with your db password
      surveyVpcConstruct: this.surveyVpcConstruct,
      env: { account: this.account, region: this.region },
    });
    */
  }
}
