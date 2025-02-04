import { Stack, StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { aws_kms as kms } from 'aws-cdk-lib'
import { aws_sagemaker as sm } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
/**
 * Interface for SagemakerStack properties extending StackProps
 */
interface SagemakerStackprops extends StackProps {
    /** Name of the application */
    appName: string,
    /** VPC where Sagemaker domain will be deployed */
    vpc: ec2.Vpc;
    /** Security group IDs to associate with the domain */
    securityGroupIds: string[];
    /** ARN of the database cluster */
    dbClusterArn: string,
    /** Secret ARN for db credentials */
    dbClusterSecretArn: string,
    /** KMS key for encryption */
    kmsKey: kms.IKey,
}

/**
 * Stack that creates a Sagemaker domain with associated IAM roles and policies
 */
export class SagemakerStack extends Stack {
    /** IAM execution role for the Sagemaker domain */
    readonly sagemakerDomainExecutionRole: iam.IRole;
    /** The Sagemaker domain resource */
    readonly sagemakerDomain: sm.CfnDomain;
    /** Name of the Sagemaker domain */
    readonly sagemakerDomainName: string;

    /**
     * Creates a new SagemakerStack
     * @param scope - The scope in which to define this construct
     * @param id - The scoped construct ID
     * @param props - Configuration properties for the stack
     */
    constructor(scope: Construct, id: string, props: SagemakerStackprops) {
        super(scope, id, props);

        this.sagemakerDomainName = props.appName + 'SagemakerDomain';

        this.sagemakerDomainExecutionRole = new iam.Role(this, this.sagemakerDomainName + 'ExecutionRole', {
            assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
            roleName: this.sagemakerDomainName + 'ExecutionRole',
            managedPolicies: [
                iam.ManagedPolicy.fromManagedPolicyArn(
                    this,
                    'SagemakerFullAccess',
                    'arn:aws:iam::aws:policy/AmazonSageMakerFullAccess',
                ),
            ],
        });
        props.kmsKey.grant(this.sagemakerDomainExecutionRole, ...[
            'kms:Decrypt',
            'kms:Encrypt',
            'kms:GenerateDataKey*',
            'kms:ReEncrypt*',
            'kms:CreateGrant',
        ],
        );
        this.sagemakerDomainExecutionRole.attachInlinePolicy(new iam.Policy(this, 'sagemakerRdsPolicy', {
            statements: [new iam.PolicyStatement({
                actions: ['rds:DescribeDBClusters'],
                resources: [props.dbClusterArn],
            })],
        }));
        this.sagemakerDomainExecutionRole.attachInlinePolicy(new iam.Policy(this, 'ssmPolicy', {
            statements: [new iam.PolicyStatement({
                actions: [
                    'ssm:GetParameter',
                ],
                resources: ['arn:aws:ssm:eu-central-1:' + this.account + ':parameter/' + props.appName + 'DbSecretArn'],
            })],
        }));
        this.sagemakerDomainExecutionRole.attachInlinePolicy(new iam.Policy(this, 'sagemakerSecretsManagerPolicy', {
            statements: [new iam.PolicyStatement({
                actions: [
                    'secretsmanager:DescribeSecret',
                    'secretsmanager:GetSecretValue',
                ],
                resources: [props.dbClusterSecretArn],
            })],
        }));

        this.sagemakerDomain = new sm.CfnDomain(this, 'SageMakerStudioDomain', {
            authMode: 'SSO',
            defaultUserSettings: {
                executionRole: this.sagemakerDomainExecutionRole.roleArn,
                securityGroups: props.securityGroupIds,
            },
            domainName: props.appName + 'SageMakerStudioDomain',
            subnetIds: props.vpc.privateSubnets.map(sn => sn.subnetId),
            vpcId: props.vpc.vpcId,
            appNetworkAccessType: 'VpcOnly',
            kmsKeyId: props.kmsKey.keyArn,
        });
    }
}