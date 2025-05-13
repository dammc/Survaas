import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SurveyEcsStack } from '../lib/stack/ecs';
import { SurveyVpcConstruct } from '../lib/construct/vpc';
import { SecurityGroupsConstruct } from '../lib/construct/securityGroups';
import { EncryptionStack } from '../lib/stack/kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecs from 'aws-cdk-lib/aws-ecs';

describe('SurveyEcsStack', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    // Mock the ContainerImage.fromDockerImageAsset method
    jest.spyOn(ecs.ContainerImage, 'fromDockerImageAsset').mockImplementation(() => {
      return {
        bind: () => ({
          imageName: 'mock-uri:latest',
          containerDefinitionOptions: {},
        }),
      } as any;
    });
    
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    
    // Create VPC in the stack
    const vpc = new SurveyVpcConstruct(stack, 'TestVpc').vpc;
    
    // Create security groups in the stack
    const securityGroups = new SecurityGroupsConstruct(stack, 'TestSecurityGroups', vpc);
    
    // Create encryption stack in the stack
    const encryptionStack = new EncryptionStack(stack, 'TestEncryptionStack', {
      appName: 'TestApp',
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    
    // Create DB secret in the stack
    const dbSecret = new secretsmanager.Secret(stack, 'TestDbSecret');
    
    // Create a mock image asset
    const mockImageAsset = { imageUri: 'mock-uri:latest' } as any;
    
    // Create ECS stack
    new SurveyEcsStack(stack, 'TestEcsStack', {
      appName: 'TestApp',
      surveyAdminName: 'admin',
      surveyAdminPassword: 'password',
      imageAsset: mockImageAsset,
      vpc: vpc,
      kmsKey: encryptionStack.surveyKmsKey,
      dbSecret: dbSecret,
      loadBalancerSecurityGroup: securityGroups.loadBalancerSecurityGroup,
      serviceSecurityGroup: securityGroups.serviceSecurityGroup,
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    
    template = Template.fromStack(stack);
  });

  test('ECS resources are created', () => {
    // This test verifies that the stack can be synthesized
    // We're just checking that the stack can be created without errors
    expect(template).toBeDefined();
  });
});