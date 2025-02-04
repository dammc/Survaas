import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { EncryptionStack } from './kms';
import { RdsStack } from './rds';
import { SagemakerStack } from './sagemaker';
import { SecurityGroupsConstruct } from '../construct/securityGroups';
import * as smr from 'aws-cdk-lib/aws-secretsmanager';
import { SurveyImageStack } from './ecr';
import { SurveyEcsStack } from './ecs';
import { SurveyVpcConstruct } from '../construct/vpc';
/**
 * Interface for SurvaasClusterStack properties
 * @interface SurvaasClusterStackProps
 * @extends cdk.StackProps
 */
interface SurvaasClusterStackProps extends cdk.StackProps {
  /** Name of the application */
  appName: string,
  /** Admin username for the survey application */
  surveyAdminName: string,
  /** Admin password for the survey application */
  surveyAdminPassword: string,
  /** VPC where application resources will be deployed */
  surveyVpcConstruct: SurveyVpcConstruct,
}

/**
 * Main CDK stack class for the Survaas application
 * @class SurvaasClusterStack
 * @extends cdk.Stack
 */
export class SurvaasClusterStack extends cdk.Stack {
  /** Stack containing KMS encryption resources */
  public readonly encryptionStack: EncryptionStack;
  /** Stack containing RDS database resources */
  public readonly rdsStack: RdsStack;
  /** Stack containing SageMaker resources */
  public readonly sagemakerStack: SagemakerStack;
  /** Stack containing ECR image resources */
  public readonly surveyImageStack: SurveyImageStack;
  /** Stack containing ECS resources */
  public readonly surveyEcsStack: SurveyEcsStack;
  /** Security groups for the application */
  public readonly securityGroups: SecurityGroupsConstruct; 

  /**
   * Creates a new instance of SurvaasClusterStack
   * @param scope - Parent construct
   * @param id - Construct ID
   * @param props - Stack properties
   */
  constructor(scope: Construct, id: string, props: SurvaasClusterStackProps) {
    super(scope, id, props);

    this.encryptionStack = new EncryptionStack(this, 'SurvaasEncryptionStack', {
      appName: props.appName,
      env: {
        account: this.account,
        region: this.region,
      },
    });

    this.securityGroups = new SecurityGroupsConstruct(this, 'SecurityGroups', props.surveyVpcConstruct.vpc);

    this.rdsStack = new RdsStack(this, 'SurveyDb', {
      appName: props.appName,
      vpc: props.surveyVpcConstruct.vpc,
      dbSecurityGroup: this.securityGroups.dbSecurityGroup,
      kmsKey: this.encryptionStack.surveyKmsKey,
      env: {
        account: this.account,
        region: this.region,
      },
    });

    this.sagemakerStack = new SagemakerStack(this, 'SagemakerStack', {
      appName: props.appName,
      vpc: props.surveyVpcConstruct.vpc,
      securityGroupIds: [this.securityGroups.analyticsSecurityGroup.securityGroupId],
      dbClusterArn: this.rdsStack.dbCluster.clusterArn,
      dbClusterSecretArn: <string> this.rdsStack.dbCluster.secret?.secretArn,
      kmsKey: this.encryptionStack.analyticsKmsKey,
      env: {
        account: this.account,
        region: this.region,
      },
    });
    this.sagemakerStack.addDependency(this.rdsStack);

    this.surveyImageStack = new SurveyImageStack(this, 'SurveyImageStack', {});

    this.surveyEcsStack = new SurveyEcsStack(this, props.appName + 'EcsStack', {
      appName: props.appName,
      surveyAdminName: props.surveyAdminName,
      surveyAdminPassword: props.surveyAdminPassword,
      imageAsset: this.surveyImageStack.surveyImage,
      vpc: props.surveyVpcConstruct.vpc,
      kmsKey: this.encryptionStack.surveyKmsKey,
      dbSecret: <smr.Secret> this.rdsStack.dbCluster.secret,
      env: {
        account: this.account,
        region: this.region,
      },
      loadBalancerSecurityGroup: this.securityGroups.loadBalancerSecurityGroup,
      serviceSecurityGroup: this.securityGroups.serviceSecurityGroup,
    });
    this.surveyEcsStack.addDependency(this.rdsStack);
  }
}
