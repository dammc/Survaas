import * as cdk from 'aws-cdk-lib';
import { SurvaasClusterStack } from '../lib/stack/appCluster';
import { SurveyVpcConstruct } from '../lib/construct/vpc';
import * as ecs from 'aws-cdk-lib/aws-ecs';

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
      } as any;
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
      new SurvaasClusterStack(parentStack, 'TestClusterStack', {
        appName: 'TestApp',
        surveyAdminName: 'admin',
        surveyAdminPassword: 'password',
        surveyVpcConstruct: vpc,
        env: { 
          account: '123456789012', 
          region: 'us-east-1' 
        }
      });
    }).not.toThrow();
  });
});