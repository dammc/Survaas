import * as cdk from 'aws-cdk-lib';
import { SurvaasClusterStack } from '../lib/stack/appCluster';
import { SurveyVpcConstruct } from '../lib/construct/vpc';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Match, Template } from 'aws-cdk-lib/assertions';

describe('SurvaasClusterStack', () => {
  let app: cdk.App;
  let parentStack: cdk.Stack;
  let vpc: SurveyVpcConstruct;

  beforeEach(() => {
    // Mock the ContainerImage.fromDockerImageAsset method
    jest.spyOn(ecs.ContainerImage, 'fromDockerImageAsset').mockImplementation(() => {
      return {
        bind: () => ({
          imageName: 'mock-uri:latest',
          containerDefinitionOptions: {},
        }),
      } as unknown as ecs.ContainerImage;
    });
    
    app = new cdk.App();
    parentStack = new cdk.Stack(app, 'ParentStack', {
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    
    // Create VPC in the parent stack
    vpc = new SurveyVpcConstruct(parentStack, 'TestVpc');
  });

  test('SurvaasClusterStack can be instantiated', () => {
    // This test verifies that the stack can be instantiated without errors
    expect(() => {
      const stack = new SurvaasClusterStack(parentStack, 'TestClusterStack', {
        appName: 'TestApp',
        surveyVpcConstruct: vpc,
        env: { 
          account: '123456789012', 
          region: 'us-east-1' 
        }
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::SecretsManager::Secret', 1);
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        GenerateSecretString: Match.objectLike({
          GenerateStringKey: 'adminPassword',
          SecretStringTemplate: '{"adminUsername":"admin"}',
        }),
      });

      const ecsTemplate = Template.fromStack(stack.surveyEcsStack);
      ecsTemplate.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Environment: Match.arrayWith([
              {
                Name: 'LIMESURVEY_ADMIN_USER',
                Value: 'admin',
              },
            ]),
            Secrets: Match.arrayWith([
              Match.objectLike({
                Name: 'LIMESURVEY_ADMIN_PASSWORD',
                ValueFrom: Match.anyValue(),
              }),
            ]),
          }),
        ]),
      });
    }).not.toThrow();
  });
});