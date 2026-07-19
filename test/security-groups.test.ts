import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { SecurityGroupsConstruct } from '../lib/construct/securityGroups';
import { SurveyVpcConstruct } from '../lib/construct/vpc';

describe('SecurityGroupsConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    
    // Create VPC using the original construct
    const vpc = new SurveyVpcConstruct(stack, 'TestVpc').vpc;
    
    // Create security groups construct
    new SecurityGroupsConstruct(stack, 'TestSecurityGroups', vpc);
    
    template = Template.fromStack(stack);
  });

  test('All required security groups are created', () => {
    // Verify all security groups are created
    template.resourceCountIs('AWS::EC2::SecurityGroup', 5); // DB, LB, Service, EFS, Analytics
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: 'tcp',
          FromPort: 2049,
          ToPort: 2049,
          SourceSecurityGroupId: Match.anyValue(),
        }),
      ]),
    });

    const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
    const serviceSecurityGroup = Object.values(securityGroups).find((resource) => {
      return (resource as { Properties?: { GroupDescription?: string } }).Properties?.GroupDescription === 'SecurityGroup of the ECS cluster';
    }) as {
      Properties: {
        SecurityGroupEgress?: Array<{
          IpProtocol?: string;
          CidrIp?: string;
          FromPort?: number;
          ToPort?: number;
        }>;
      };
    };

    expect(serviceSecurityGroup).toBeDefined();
    expect(serviceSecurityGroup.Properties.SecurityGroupEgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ IpProtocol: 'tcp', FromPort: 5432, ToPort: 5432 }),
        expect.objectContaining({ IpProtocol: 'tcp', FromPort: 2049, ToPort: 2049 }),
        expect.objectContaining({ IpProtocol: 'tcp', FromPort: 443, ToPort: 443, CidrIp: '0.0.0.0/0' }),
        expect.objectContaining({ IpProtocol: 'udp', FromPort: 53, ToPort: 53 }),
        expect.objectContaining({ IpProtocol: 'tcp', FromPort: 53, ToPort: 53 }),
      ]),
    );

    const hasDefaultOpenEgress = (serviceSecurityGroup.Properties.SecurityGroupEgress ?? []).some((rule) => {
      return rule.IpProtocol === '-1' && rule.CidrIp === '0.0.0.0/0';
    });
    expect(hasDefaultOpenEgress).toBe(false);
  });

  test('A provided shared load balancer security group is reused', () => {
    const sharedApp = new cdk.App();
    const sharedStack = new cdk.Stack(sharedApp, 'SharedLbStack');
    const sharedVpc = new SurveyVpcConstruct(sharedStack, 'SharedVpc').vpc;
    const sharedLoadBalancerSecurityGroup = new ec2.SecurityGroup(sharedStack, 'SharedLoadBalancerSecurityGroup', {
      vpc: sharedVpc,
    });

    const securityGroups = new SecurityGroupsConstruct(
      sharedStack,
      'SharedTestSecurityGroups',
      sharedVpc,
      sharedLoadBalancerSecurityGroup,
    );

    expect(securityGroups.loadBalancerSecurityGroup).toBe(sharedLoadBalancerSecurityGroup);

    const sharedTemplate = Template.fromStack(sharedStack);
    sharedTemplate.resourceCountIs('AWS::EC2::SecurityGroup', 5); // Shared LB + DB + Service + EFS + Analytics
  });
});