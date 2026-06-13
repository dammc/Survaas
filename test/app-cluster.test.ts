import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { SurvaasClusterStack } from '../lib/stack/appCluster';
import { SurveyVpcConstruct } from '../lib/construct/vpc';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

describe('SurvaasClusterStack', () => {
  let app: cdk.App;
  let parentStack: cdk.Stack;
  let vpc: SurveyVpcConstruct;
  let sharedListener: elbv2.ApplicationListener;
  let sharedLoadBalancerSecurityGroup: ec2.SecurityGroup;

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

    sharedLoadBalancerSecurityGroup = new ec2.SecurityGroup(parentStack, 'SharedLoadBalancerSecurityGroup', {
      vpc: vpc.vpc,
    });

    const sharedLoadBalancer = new elbv2.ApplicationLoadBalancer(parentStack, 'SharedSurveyApplicationLoadbalancer', {
      vpc: vpc.vpc,
      securityGroup: sharedLoadBalancerSecurityGroup,
      internetFacing: true,
    });

    sharedListener = sharedLoadBalancer.addListener('SharedSurveyHttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, { messageBody: 'No route configured' }),
    });
  });

  test('SurvaasClusterStack can be instantiated', () => {
    // This test verifies that the stack can be instantiated without errors
    expect(() => {
      const stack = new SurvaasClusterStack(parentStack, 'TestClusterStack', {
        appName: 'TestApp',
        surveyVpcConstruct: vpc,
        sharedListener: sharedListener,
        sharedLoadBalancerSecurityGroup: sharedLoadBalancerSecurityGroup,
        routeConfig: {
          hostHeaders: ['test-app.example.local'],
          priority: 100,
        },
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
      ecsTemplate.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0);
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

      const nestedTemplate = Template.fromStack(stack.surveyEcsStack.nestedServiceStack);
      nestedTemplate.resourceCountIs('AWS::ElasticLoadBalancingV2::ListenerRule', 1);
    }).not.toThrow();
  });
});