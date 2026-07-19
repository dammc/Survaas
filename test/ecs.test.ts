import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SurveyEcsStack } from '../lib/stack/ecs';
import { SurveyVpcConstruct } from '../lib/construct/vpc';
import { SecurityGroupsConstruct } from '../lib/construct/securityGroups';
import { EncryptionStack } from '../lib/stack/kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

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
      } as unknown as ecs.ContainerImage;
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

    const sharedLoadBalancerSecurityGroup = new ec2.SecurityGroup(parentStack, 'SharedLoadBalancerSecurityGroup', {
      vpc: vpc,
    });

    const sharedLoadBalancer = new elbv2.ApplicationLoadBalancer(parentStack, 'SharedSurveyApplicationLoadbalancer', {
      vpc: vpc,
      securityGroup: sharedLoadBalancerSecurityGroup,
      internetFacing: true,
    });

    const sharedListener = sharedLoadBalancer.addListener('SharedSurveyHttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, { messageBody: 'No route configured' }),
    });
    
    // Create security groups in the stack
    const securityGroups = new SecurityGroupsConstruct(parentStack, 'TestSecurityGroups', vpc, sharedLoadBalancerSecurityGroup);
    
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
    const mockImageAsset = { imageUri: 'mock-uri:latest' } as unknown as ecr_assets.DockerImageAsset;
    
    // Create ECS stack
    stack = new SurveyEcsStack(app, 'TestEcsStack', {
      appName: 'TestApp',
      surveyAdminSecret: surveyAdminSecret,
      imageAsset: mockImageAsset,
      vpc: vpc,
      kmsKey: encryptionStack.surveyKmsKey,
      dbSecret: dbSecret,
      serviceSecurityGroup: securityGroups.serviceSecurityGroup,
      efsSecurityGroup: securityGroups.efsSecurityGroup,
      sharedListener: sharedListener,
      hostHeaders: ['test-app.example.local'],
      listenerPriority: 100,
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

    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0);
    template.resourceCountIs('AWS::EFS::FileSystem', 1);
    template.resourceCountIs('AWS::EFS::AccessPoint', 1);
    template.resourceCountIs('AWS::Logs::LogGroup', 1);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30,
      KmsKeyId: Match.anyValue(),
    });

    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Volumes: Match.arrayWith([
        Match.objectLike({
          EFSVolumeConfiguration: Match.objectLike({
            TransitEncryption: 'ENABLED',
            AuthorizationConfig: Match.objectLike({
              AccessPointId: Match.anyValue(),
              IAM: 'ENABLED',
            }),
          }),
        }),
      ]),
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          LogConfiguration: Match.objectLike({
            LogDriver: 'awslogs',
            Options: Match.objectLike({
              'awslogs-group': Match.anyValue(),
              'awslogs-stream-prefix': 'TestApp',
            }),
          }),
          MountPoints: Match.arrayWith([
            Match.objectLike({ SourceVolume: 'TestAppEfsVolume' }),
          ]),
        }),
      ]),
    });

    template.hasResourceProperties('AWS::EFS::FileSystem', {
      FileSystemPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'elasticfilesystem:ClientMount',
              'elasticfilesystem:ClientWrite',
              'elasticfilesystem:ClientRootAccess',
            ]),
          }),
        ]),
      },
    });

    const nestedTemplate = Template.fromStack(stack.nestedServiceStack);
    nestedTemplate.resourceCountIs('AWS::ECS::Service', 1);
    nestedTemplate.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
    nestedTemplate.resourceCountIs('AWS::ElasticLoadBalancingV2::ListenerRule', 1);
    nestedTemplate.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
      Priority: 100,
      Conditions: Match.arrayWith([
        Match.objectLike({
          Field: 'host-header',
        }),
      ]),
    });

    const services = nestedTemplate.findResources('AWS::ECS::Service');
    const service = Object.values(services)[0] as {
      Properties: {
        VolumeConfigurations?: unknown;
      };
    };
    expect(service.Properties.VolumeConfigurations).toBeUndefined();

    const fileSystems = template.findResources('AWS::EFS::FileSystem');
    const fileSystem = Object.values(fileSystems)[0] as {
      Properties: {
        FileSystemPolicy: {
          Statement: Array<{
            Principal?: {
              AWS?: unknown;
            };
          }>;
        };
      };
    };
    const principals = fileSystem.Properties.FileSystemPolicy.Statement
      .map((statement) => statement.Principal?.AWS)
      .filter((principal) => principal !== undefined);
    expect(principals).not.toContain('*');
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

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'elasticfilesystem:ClientMount',
              'elasticfilesystem:ClientWrite',
              'elasticfilesystem:ClientRootAccess',
            ]),
            Condition: Match.objectLike({
              StringEquals: Match.objectLike({
                'elasticfilesystem:AccessPointArn': Match.anyValue(),
              }),
            }),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});