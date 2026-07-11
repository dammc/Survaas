import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { EncryptionStack } from './kms';
import { RdsStack } from './rds';
import { SagemakerStack } from './sagemaker';
import { SecurityGroupsConstruct } from '../construct/securityGroups';
import * as smr from 'aws-cdk-lib/aws-secretsmanager';
import { SurveyImageStack } from './ecr';
import { SurveyEcsStack } from './ecs';
import { SurveyVpcConstruct } from '../construct/vpc';

export interface SurvaasClusterRouteConfig {
  /** Host-based routing conditions for this cluster's service */
  hostHeaders: string[],
  /** Explicit listener rule priority */
  priority: number,
}
/**
 * Interface for SurvaasClusterStack properties
 * @interface SurvaasClusterStackProps
 * @extends cdk.StackProps
 */
interface SurvaasClusterStackProps extends cdk.StackProps {
  /** Name of the application */
  appName: string,
  /** VPC where application resources will be deployed */
  surveyVpcConstruct: SurveyVpcConstruct,
  /** Shared listener used across all SurvaasClusterStacks */
  sharedListener: elbv2.ApplicationListener,
  /** Shared load balancer security group used across all SurvaasClusterStacks */
  sharedLoadBalancerSecurityGroup: ec2.SecurityGroup,
  /** Host-based route configuration for this cluster */
  routeConfig: SurvaasClusterRouteConfig,
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
  /** Secret containing the survey admin credentials */
  public readonly surveyAdminSecret: smr.Secret;
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

    this.securityGroups = new SecurityGroupsConstruct(
      this,
      'SecurityGroups',
      props.surveyVpcConstruct.vpc,
      props.sharedLoadBalancerSecurityGroup,
    );

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

    this.surveyAdminSecret = new smr.Secret(this, 'SurveyAdminSecret', {
      description: `Admin credentials for ${props.appName}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ adminUsername: 'admin' }),
        generateStringKey: 'adminPassword',
      },
    });

    this.surveyEcsStack = new SurveyEcsStack(this, props.appName + 'EcsStack', {
      appName: props.appName,
      surveyAdminSecret: this.surveyAdminSecret,
      imageAsset: this.surveyImageStack.surveyImage,
      vpc: props.surveyVpcConstruct.vpc,
      kmsKey: this.encryptionStack.surveyKmsKey,
      dbSecret: <smr.Secret> this.rdsStack.dbCluster.secret,
      env: {
        account: this.account,
        region: this.region,
      },
      serviceSecurityGroup: this.securityGroups.serviceSecurityGroup,
      sharedListener: props.sharedListener,
      hostHeaders: props.routeConfig.hostHeaders,
      listenerPriority: props.routeConfig.priority,
    });
    this.surveyEcsStack.addDependency(this.rdsStack);
  }
}
