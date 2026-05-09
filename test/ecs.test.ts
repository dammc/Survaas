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
  let stack: SurveyEcsStack;
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
    const parentStack = new cdk.Stack(app, 'TestStack', {
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    
    // Create VPC in the stack
    const vpc = new SurveyVpcConstruct(parentStack, 'TestVpc').vpc;
    
    // Create security groups in the stack
    const securityGroups = new SecurityGroupsConstruct(parentStack, 'TestSecurityGroups', vpc);
    
    // Create encryption stack in the stack
    const encryptionStack = new EncryptionStack(parentStack, 'TestEncryptionStack', {
      appName: 'TestApp',
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    
    // Create DB secret in the stack
    const dbSecret = new secretsmanager.Secret(parentStack, 'TestDbSecret');
    const surveyAdminSecret = new secretsmanager.Secret(parentStack, 'TestSurveyAdminSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ adminUsername: 'admin' }),
        generateStringKey: 'adminPassword',
      },
    });
    
    // Create a mock image asset
    const mockImageAsset = { imageUri: 'mock-uri:latest' } as any;
    
    // Create ECS stack
    stack = new SurveyEcsStack(app, 'TestEcsStack', {
      appName: 'TestApp',
      surveyAdminSecret: surveyAdminSecret,
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

  test('Admin username is fixed and admin password is provided via Secrets Manager', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([
            {
              Name: 'LIMESURVEY_ADMIN_USER',
              Value: 'admin',
            },
            {
              Name: 'LIMESURVEY_TABLE_PREFIX',
              Value: 'survaas_',
            },
          ]),
        }),
      ]),
    });

    const taskDefinitions = template.findResources('AWS::ECS::TaskDefinition');
    const taskDefinition = Object.values(taskDefinitions)[0] as {
      Properties: {
        ContainerDefinitions: Array<{
          Environment: Array<{ Name: string }>;
          Secrets: Array<{ Name: string; ValueFrom: unknown }>;
        }>;
      };
    };
    const environment = taskDefinition.Properties.ContainerDefinitions[0].Environment;
    const secrets = taskDefinition.Properties.ContainerDefinitions[0].Secrets;
    const adminPasswordSecret = secrets.find((entry) => entry.Name === 'LIMESURVEY_ADMIN_PASSWORD');

    expect(environment.find((entry) => entry.Name === 'LIMESURVEY_ADMIN_PASSWORD')).toBeUndefined();
    expect(secrets.find((entry) => entry.Name === 'LIMESURVEY_ADMIN_USER')).toBeUndefined();
    expect(adminPasswordSecret).toBeDefined();
    expect(JSON.stringify(adminPasswordSecret?.ValueFrom)).toContain('adminPassword');

    const secretNames = secrets.map((entry) => entry.Name);
    expect(secretNames).toEqual(expect.arrayContaining([
      'LIMESURVEY_ADMIN_PASSWORD',
      'LIMESURVEY_DB',
      'LIMESURVEY_DB_HOST',
      'LIMESURVEY_DB_PASSWORD',
      'LIMESURVEY_DB_USER',
      'LIMESURVEY_DB_NAME',
    ]));
  });

  test('Task role includes permission to retrieve secrets', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['secretsmanager:GetSecretValue']),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});