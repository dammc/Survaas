import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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
    template.resourceCountIs('AWS::EC2::SecurityGroup', 4); // DB, LB, Service, Analytics
  });
});