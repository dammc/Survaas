import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { EncryptionStack } from '../lib/stack/kms';

describe('EncryptionStack', () => {
  let app: cdk.App;
  let stack: EncryptionStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const parentStack = new cdk.Stack(app, 'ParentStack');
    
    stack = new EncryptionStack(parentStack, 'TestEncryptionStack', {
      appName: 'TestApp',
      env: { 
        account: parentStack.account, 
        region: parentStack.region 
      }
    });
    
    template = Template.fromStack(stack);
  });

  test('KMS Keys are created with correct configuration', () => {
    // Verify KMS Keys are created
    template.resourceCountIs('AWS::KMS::Key', 2);
    
    // Verify KMS Keys have proper configuration
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('KMS Aliases are created for the keys', () => {
    // Verify KMS Aliases are created
    template.resourceCountIs('AWS::KMS::Alias', 2);
    
    // Verify KMS Aliases have proper configuration
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: Match.stringLikeRegexp('alias/.*TestApp.*'),
    });
  });
});