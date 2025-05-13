import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SurveyImageStack } from '../lib/stack/ecr';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';

describe('SurveyImageStack', () => {
  let app: cdk.App;
  let stack: SurveyImageStack;
  let template: Template;

  beforeEach(() => {
    // Mock the DockerImageAsset to avoid Dockerfile lookup
    jest.spyOn(ecr_assets, 'DockerImageAsset').mockImplementation((scope, id) => {
      return {
        repository: { repositoryUri: 'mock-uri' },
        imageUri: 'mock-uri:latest',
        assetHash: 'mock-hash',
      } as any;
    });
    
    app = new cdk.App();
    stack = new SurveyImageStack(app, 'TestImageStack', {
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
    
    template = Template.fromStack(stack);
  });

  test('Docker image asset is created', () => {
    // This test verifies that the stack can be synthesized
    // The actual Docker image asset is mocked, so we're just checking
    // that the stack can be created without errors
    expect(stack.surveyImage).toBeDefined();
    expect(stack.surveyImage.imageUri).toBe('mock-uri:latest');
  });
});