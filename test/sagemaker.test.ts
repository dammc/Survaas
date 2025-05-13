import * as cdk from 'aws-cdk-lib';
import { SagemakerStack } from '../lib/stack/sagemaker';
import { SurveyVpcConstruct } from '../lib/construct/vpc';
import { SecurityGroupsConstruct } from '../lib/construct/securityGroups';
import { EncryptionStack } from '../lib/stack/kms';

describe('SagemakerStack', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: SurveyVpcConstruct;
  let securityGroups: SecurityGroupsConstruct;
  let encryptionStack: EncryptionStack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    
    // Create VPC in the stack
    vpc = new SurveyVpcConstruct(stack, 'TestVpc');
    
    // Create security groups in the stack
    securityGroups = new SecurityGroupsConstruct(stack, 'TestSecurityGroups', vpc.vpc);
    
    // Create encryption stack in the stack
    encryptionStack = new EncryptionStack(stack, 'TestEncryptionStack', {
      appName: 'TestApp',
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
  });

  test('SagemakerStack can be instantiated', () => {
    // This test verifies that the stack can be instantiated without errors
    expect(() => {
      new SagemakerStack(stack, 'TestSagemakerStack', {
        appName: 'TestApp',
        vpc: vpc.vpc,
        securityGroupIds: [securityGroups.analyticsSecurityGroup.securityGroupId],
        dbClusterArn: 'arn:aws:rds:us-east-1:123456789012:cluster:test-cluster',
        dbClusterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
        kmsKey: encryptionStack.analyticsKmsKey,
        env: { 
          account: '123456789012', 
          region: 'us-east-1' 
        }
      });
    }).not.toThrow();
  });
});