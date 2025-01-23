import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EncryptionStack } from './stack/kms';
import { RdsStack } from './stack/rds';
import { SagemakerStack } from './stack/sagemaker';
import { SurveyImageStack } from './stack/ecr';
import { SurveyEcsStack } from './stack/ecs';
import { SurveyVpcStack } from './stack/vpc';
/**
 * Interface for SurvaasCdkStack properties
 * @interface SurvaasCdkStackProps
 * @extends cdk.StackProps
 */
interface SurvaasCdkStackProps extends cdk.StackProps {
  /** Name of the application */
  appName: string,
  /** Admin username for the survey application */
  surveyAdminName: string,
  /** Admin password for the survey application */
  surveyAdminPassword: string,
}

/**
 * Main CDK stack class for the Survaas application
 * @class SurvaasCdkStack
 * @extends cdk.Stack
 */
export class SurvaasCdkStack extends cdk.Stack {
  /** Stack containing KMS encryption resources */
  public readonly encryptionStack: EncryptionStack;
  /** Stack containing VPC networking resources */
  public readonly surveyVpcStack: SurveyVpcStack;
  /** Stack containing RDS database resources */
  public readonly rdsStack: RdsStack;
  /** Stack containing SageMaker resources */
  public readonly sagemakerStack: SagemakerStack;
  /** Stack containing ECR image resources */
  public readonly surveyImageStack: SurveyImageStack;
  /** Stack containing ECS resources */
  public readonly surveyEcsStack: SurveyEcsStack;

  /**
   * Creates a new instance of SurvaasCdkStack
   * @param scope - Parent construct
   * @param id - Construct ID
   * @param props - Stack properties
   */
  constructor(scope: Construct, id: string, props: SurvaasCdkStackProps) {
    super(scope, id, props);

    this.encryptionStack = new EncryptionStack(this, 'surveyEncryptionStack', {
      appName: props.appName,
      env: {
        account: this.account,
        region: this.region,
      },
    });

    this.surveyVpcStack = new SurveyVpcStack(this, 'SurveyVpc', {
      appName: props.appName,
      env: {
        account: this.account,
        region: this.region,
      }
    });

    this.rdsStack = new RdsStack(this, 'SurveyDb', {
      appName: props.appName,
      vpc: this.surveyVpcStack.vpc,
      clusterSecurityGroup: this.surveyVpcStack.dbSecurityGroup,
      kmsKey: this.encryptionStack.surveyKmsKey,
      env: {
        account: this.account,
        region: this.region,
      },
    });
    this.rdsStack.addDependency(this.surveyVpcStack);

    this.sagemakerStack = new SagemakerStack(this, 'SagemakerStack', {
      appName: props.appName,
      vpc: this.surveyVpcStack.vpc,
      securityGroupIds: [this.surveyVpcStack.analyticsSecurityGroup.securityGroupId],
      dbClusterArn: this.rdsStack.dbCluster.clusterArn,
      kmsKey: this.encryptionStack.analyticsKmsKey,
      env: {
        account: this.account,
        region: this.region,
      },
    });

    this.surveyImageStack = new SurveyImageStack(this, 'SurveyImageStack', {});

    this.surveyEcsStack = new SurveyEcsStack(this, props.appName + 'EcsStack', {
      appName: props.appName,
      surveyAdminName: props.surveyAdminName,
      surveyAdminPassword: props.surveyAdminPassword,
      imageAsset: this.surveyImageStack.surveyImage,
      vpc: this.surveyVpcStack.vpc,
      kmsKey: this.encryptionStack.surveyKmsKey,
      env: {
        account: this.account,
        region: this.region,
      },
    });
    this.surveyEcsStack.addDependency(this.surveyVpcStack);
    this.surveyEcsStack.addDependency(this.rdsStack);
  }
}
