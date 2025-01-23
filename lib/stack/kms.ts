import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
/**
 * Stack that creates KMS encryption keys for the application
 */
/**
 * Properties for the EncryptionStack
 */
interface EncryptionStackprops extends StackProps {
    /** Name of the application */
    appName: string,
}

/**
 * Creates KMS encryption keys for different parts of the application
 */
export class EncryptionStack extends Stack {
    /** KMS key used for encrypting analytics data */
    readonly analyticsKmsKey: kms.Key;
    
    /** KMS key used for encrypting survey data */
    readonly surveyKmsKey: kms.Key;

    /**
     * Creates a new EncryptionStack
     * @param scope The scope in which to define this construct
     * @param id The scoped construct ID
     * @param props Configuration properties
     */
    constructor(scope: Construct, id: string, props: EncryptionStackprops){
        super(scope, id, props)

        this.analyticsKmsKey = new kms.Key(this, 'analyticsKmsKey', {
            alias: props.appName + 'AnalyticsKmsKey',
            description: 'KMS key for analytics related data',
            enableKeyRotation: true,
        });

        this.surveyKmsKey = new kms.Key(this, 'surveyKmsKey', {
            alias: props.appName + 'SurveyKmsKey', 
            description: 'KMS key for survey data',
            enableKeyRotation: true,
        });
    }
}