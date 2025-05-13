import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SurvaasRootStack } from '../lib/root';

describe('SurvaasRootStack', () => {
  let app: cdk.App;
  let stack: SurvaasRootStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new SurvaasRootStack(app, 'TestSurvaasRootStack', {
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    template = Template.fromStack(stack);
  });

  test('VPC is created with correct configuration', () => {
    // Verify VPC is created with the expected properties
    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.hasResourceProperties('AWS::EC2::VPC', {
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });

    // Verify subnets are created as expected (2 AZs with public and private subnets)
    template.resourceCountIs('AWS::EC2::Subnet', 4); // 2 public + 2 private
  });

  test('NAT Gateway is properly configured', () => {
    // Verify NAT Gateway is created
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
    
    // Verify NAT Gateway has an Elastic IP
    template.resourceCountIs('AWS::EC2::EIP', 1);
  });
});