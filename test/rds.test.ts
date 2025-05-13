import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RdsStack } from '../lib/stack/rds';
import { SurveyVpcConstruct } from '../lib/construct/vpc';
import { SecurityGroupsConstruct } from '../lib/construct/securityGroups';
import { EncryptionStack } from '../lib/stack/kms';

describe('RdsStack', () => {
  let app: cdk.App;
  let stack: RdsStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const parentStack = new cdk.Stack(app, 'ParentStack');
    
    // Create VPC in the parent stack
    const vpc = new SurveyVpcConstruct(parentStack, 'TestVpc').vpc;
    
    // Create security groups in the parent stack
    const securityGroups = new SecurityGroupsConstruct(parentStack, 'TestSecurityGroups', vpc);
    
    // Create encryption stack in the parent stack
    const encryptionStack = new EncryptionStack(parentStack, 'TestEncryptionStack', {
      appName: 'TestApp',
      env: { 
        account: parentStack.account, 
        region: parentStack.region 
      }
    });
    
    // Create RDS stack with the same environment as parent stack
    stack = new RdsStack(parentStack, 'TestRdsStack', {
      appName: 'TestApp',
      vpc: vpc,
      dbSecurityGroup: securityGroups.dbSecurityGroup,
      kmsKey: encryptionStack.surveyKmsKey,
      env: { 
        account: parentStack.account, 
        region: parentStack.region 
      }
    });
    
    template = Template.fromStack(stack);
  });

  test('RDS Aurora Cluster is created with correct configuration', () => {
    // Verify RDS Cluster is created
    template.resourceCountIs('AWS::RDS::DBCluster', 1);
    
    // Verify RDS Cluster has encryption enabled
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-mysql',
      StorageEncrypted: true,
    });
  });

  test('RDS Instances are created with correct configuration', () => {
    // Verify RDS Instances are created
    template.resourceCountIs('AWS::RDS::DBInstance', 2);
    
    // Verify RDS Instances have proper configuration
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'aurora-mysql',
      PubliclyAccessible: false,
    });
  });

  test('RDS Secret is created for database credentials', () => {
    // Verify Secrets Manager secret is created
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  });

  test('RDS Subnet Group is created in private subnets', () => {
    // Verify DB Subnet Group is created
    template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1);
  });
});