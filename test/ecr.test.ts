jest.mock('aws-cdk-lib/aws-ecr-assets', () => ({
  DockerImageAsset: jest.fn().mockImplementation(() => ({
    repository: { repositoryUri: 'mock-uri' },
    imageUri: 'mock-uri:latest',
    assetHash: 'mock-hash',
  })),
}));

import * as cdk from 'aws-cdk-lib';
import { SurveyImageStack } from '../lib/stack/ecr';

describe('SurveyImageStack', () => {
  let app: cdk.App;
  let stack: SurveyImageStack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new SurveyImageStack(app, 'TestImageStack', {
      env: { 
        account: '123456789012', 
        region: 'us-east-1' 
      }
    });
  });

  test('Docker image asset is created', () => {
    // This test verifies that the stack can be synthesized
    // The actual Docker image asset is mocked, so we're just checking
    // that the stack can be created without errors
    expect(stack.surveyImage).toBeDefined();
    expect(stack.surveyImage.imageUri).toBe('mock-uri:latest');
  });
});