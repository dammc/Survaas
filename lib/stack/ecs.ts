import { NestedStack, Stack, StackProps, Size } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as smr from 'aws-cdk-lib/aws-secretsmanager';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
/**
 * Props interface for SurveyEcsStack
 * @interface SurveyEcsStackProps
 * @extends StackProps
 */
interface SurveyEcsStackProps extends StackProps {
    /** Name of the application */
    appName: string,
    /** Admin username for the survey application */
    surveyAdminName: string,
    /** Admin password for the survey application */
    surveyAdminPassword: string,
    /** Docker image asset for the container */
    imageAsset: ecr_assets.DockerImageAsset,
    /** VPC where resources will be deployed */
    vpc: ec2.Vpc,
    /** KMS key for encryption */
    kmsKey: kms.IKey,
    /** security group for the load balancer */
    loadBalancerSecurityGroup: ec2.SecurityGroup,
    /** security group for the service */
    serviceSecurityGroup: ec2.SecurityGroup,
    /** the secret with credentials of the RDS database */
    dbSecret: smr.Secret,
}

/**
 * Stack that creates ECS resources for running a survey application
 * @extends Stack
 */
export class SurveyEcsStack extends Stack {
    /** Task definition for the Fargate service */
    public readonly surveyTaskDefinition: ecs.FargateTaskDefinition;
    /** ECS cluster where the service runs */
    public readonly surveyCluster: ecs.Cluster;
    /** Container image for the survey application */
    public readonly surveyContainer: ecs.ContainerImage;
    /** Container definition within the task */
    public readonly surveyContainerDefinition: ecs.ContainerDefinition;
    /** EBS volume for persistent storage */
    public readonly surveyVolume: ecs.ServiceManagedVolume;
    /** Nested stack containing the service */
    public readonly nestedServiceStack: NestedStack;
    /** Load balanced Fargate service */
    public readonly surveyLoadBalancedService: ecs_patterns.ApplicationLoadBalancedFargateService;

    /**
     * Creates a new SurveyEcsStack
     * @param scope - Parent construct
     * @param id - Construct ID
     * @param props - Stack properties
     */
    constructor(scope: Construct, id: string, props: SurveyEcsStackProps) {
        super(scope, id, props);

        this.surveyCluster = new ecs.Cluster(this, 'ECSCluster', {
            vpc: props.vpc,
        });

        this.surveyTaskDefinition = new ecs.FargateTaskDefinition(this, props.appName + 'TaskDefiniton');

        this.surveyVolume = new ecs.ServiceManagedVolume(this, props.appName + 'Ebs', {
            name: props.appName + 'Ebs',
            managedEBSVolume: {
                size: Size.gibibytes(15),
                kmsKeyId: props.kmsKey,
                volumeType: ec2.EbsDeviceVolumeType.GP3,
                fileSystemType: ecs.FileSystemType.XFS,
            },
        });
        this.surveyTaskDefinition.addVolume({ name: this.surveyVolume.name });

        this.surveyContainer = ecs.ContainerImage.fromDockerImageAsset(props.imageAsset);

        this.surveyContainerDefinition = this.surveyTaskDefinition.addContainer(props.appName + 'Container', {
            image: this.surveyContainer,
            environment: {
                'LIMESURVEY_ADMIN_USER': props.surveyAdminName,
                'LIMESURVEY_TABLE_PREFIX': 'survaas_',
                'LIMESURVEY_ADMIN_PASSWORD': props.surveyAdminPassword,
            },
            secrets: {
                'LIMESURVEY_DB': ecs.Secret.fromSecretsManager(props.dbSecret),
                'LIMESURVEY_DB_HOST': ecs.Secret.fromSecretsManager(
                    smr.Secret.fromSecretCompleteArn(this, props.appName + 'DbHost', props.dbSecret.secretArn + ':host::')),
                'LIMESURVEY_DB_PASSWORD': ecs.Secret.fromSecretsManager(smr.Secret.fromSecretCompleteArn(
                    this, props.appName + 'DbPassWord', props.dbSecret.secretArn + ':password::')),
                'LIMESURVEY_DB_USER': ecs.Secret.fromSecretsManager(smr.Secret.fromSecretCompleteArn(
                    this, props.appName + 'DbUser', props.dbSecret.secretArn + ':username::')),
                'LIMESURVEY_DB_NAME': ecs.Secret.fromSecretsManager(smr.Secret.fromSecretCompleteArn(
                    this, props.appName + 'DbName', props.dbSecret.secretArn + ':dbname::')),
            },
        });
        this.surveyContainerDefinition.addPortMappings({
            containerPort: 80,
        });

        this.surveyVolume.mountIn(this.surveyContainerDefinition, {
            containerPath: '/var/www/html/plugins',
            readOnly: false,
        });
        this.surveyVolume.mountIn(this.surveyContainerDefinition, {
            containerPath: '/var/www/html/upload',
            readOnly: false,
        });
        this.surveyVolume.mountIn(this.surveyContainerDefinition, {
            containerPath: '/var/www/html/application/config',
            readOnly: false,
        });
        this.surveyVolume.mountIn(this.surveyContainerDefinition, {
            containerPath: '/var/lime/sessions',
            readOnly: false,
        });

        this.nestedServiceStack = new NestedStack(this, 'NestedServiceStack');

        this.surveyLoadBalancedService =
            new ecs_patterns.ApplicationLoadBalancedFargateService(this.nestedServiceStack, 'LoadBalancedSurveyService', {
                cluster: this.surveyCluster,
                loadBalancer: new ApplicationLoadBalancer(this, props.appName + 'ApplicationLoadbalancer', {
                    vpc: props.vpc,
                    securityGroup: props.loadBalancerSecurityGroup,
                    internetFacing: true,
                }),
                taskDefinition: this.surveyTaskDefinition,
                securityGroups: [props.serviceSecurityGroup],
            });
    }
};