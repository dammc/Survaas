import { NestedStack, RemovalPolicy, Stack, StackProps, Token } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as smr from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
/**
 * Props interface for SurveyEcsStack
 * @interface SurveyEcsStackProps
 * @extends StackProps
 */
interface SurveyEcsStackProps extends StackProps {
    /** Name of the application */
    appName: string,
    /** Secret containing survey admin credentials */
    surveyAdminSecret: smr.ISecret,
    /** Docker image asset for the container */
    imageAsset: ecr_assets.DockerImageAsset,
    /** VPC where resources will be deployed */
    vpc: ec2.Vpc,
    /** KMS key for encryption */
    kmsKey: kms.IKey,
    /** security group for the service */
    serviceSecurityGroup: ec2.SecurityGroup,
    /** security group for the EFS file system */
    efsSecurityGroup: ec2.SecurityGroup,
    /** the secret with credentials of the RDS database */
    dbSecret: smr.Secret,
    /** shared listener used across all SurvaasClusterStacks */
    sharedListener: elbv2.ApplicationListener,
    /** host-based routing values for this service */
    hostHeaders: string[],
    /** explicit listener priority from root config */
    listenerPriority: number,
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
    /** CloudWatch log group for container logs */
    public readonly surveyContainerLogGroup: logs.LogGroup;
    /** EFS file system for persistent storage */
    public readonly surveyFileSystem: efs.FileSystem;
    /** EFS access point used for scoped task mounts */
    public readonly surveyAccessPoint: efs.AccessPoint;
    /** Nested stack containing the service */
    public readonly nestedServiceStack: NestedStack;
    /** Fargate service routed by the shared listener */
    public readonly surveyLoadBalancedService: ecs.FargateService;
    /** Target group used by the shared listener rule */
    public readonly surveyTargetGroup: elbv2.ApplicationTargetGroup;
    /** Host-based listener rule attached to the shared listener */
    public readonly surveyListenerRule: elbv2.ApplicationListenerRule;

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
            managedStorageConfiguration: {
                fargateEphemeralStorageKmsKey: props.kmsKey,
              },
        });

        this.surveyTaskDefinition = new ecs.FargateTaskDefinition(this, props.appName + 'TaskDefiniton',
            {
                cpu: 256,
                memoryLimitMiB: 512,
            }
        );

        const taskRolePrincipal = new iam.ArnPrincipal(this.surveyTaskDefinition.taskRole.roleArn);

        this.surveyFileSystem = new efs.FileSystem(this, props.appName + 'Efs', {
            vpc: props.vpc,
            allowAnonymousAccess: true,
            encrypted: true,
            fileSystemPolicy: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: ['elasticfilesystem:ClientMount', 'elasticfilesystem:ClientWrite', 'elasticfilesystem:ClientRootAccess'],
                        principals: [taskRolePrincipal],
                        resources: ['*'],
                        conditions: {
                            Bool: {
                                'elasticfilesystem:AccessedViaMountTarget': 'true',
                            },
                        },
                    }),
                ],
            }),
            kmsKey: props.kmsKey,
            removalPolicy: RemovalPolicy.DESTROY,
            securityGroup: props.efsSecurityGroup,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        this.surveyAccessPoint = this.surveyFileSystem.addAccessPoint(props.appName + 'EfsAccessPoint', {
            path: '/survaas',
            createAcl: {
                ownerGid: '0',
                ownerUid: '0',
                permissions: '0770',
            },
            posixUser: {
                gid: '0',
                uid: '0',
            },
        });

        const surveyVolumeName = props.appName + 'EfsVolume';
        this.surveyTaskDefinition.addVolume({ 
            name: surveyVolumeName,
            efsVolumeConfiguration: {
                fileSystemId: this.surveyFileSystem.fileSystemId,
                transitEncryption: 'ENABLED',
                authorizationConfig: {
                    accessPointId: this.surveyAccessPoint.accessPointId,
                    iam: 'ENABLED',
                },
            },
        });

        this.surveyTaskDefinition.taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: ['elasticfilesystem:ClientMount', 'elasticfilesystem:ClientWrite', 'elasticfilesystem:ClientRootAccess'],
            resources: [this.surveyFileSystem.fileSystemArn],
            conditions: {
                StringEquals: {
                    'elasticfilesystem:AccessPointArn': this.surveyAccessPoint.accessPointArn,
                },
            },
        }));

        this.surveyContainer = ecs.ContainerImage.fromDockerImageAsset(props.imageAsset);

        this.surveyContainerLogGroup = new logs.LogGroup(this, props.appName + 'ContainerLogs', {
            logGroupName: '/survaas/' + props.appName + '/ecs',
            encryptionKey: props.kmsKey,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        this.surveyContainerDefinition = this.surveyTaskDefinition.addContainer(props.appName + 'Container', {
            image: this.surveyContainer,
            logging: ecs.LogDrivers.awsLogs({
                logGroup: this.surveyContainerLogGroup,
                streamPrefix: props.appName,
            }),
            environment: {
                'LIMESURVEY_ADMIN_USER': 'admin',
                'LIMESURVEY_TABLE_PREFIX': 'survaas_',
            },
            secrets: {
                'LIMESURVEY_ADMIN_PASSWORD': ecs.Secret.fromSecretsManager(props.surveyAdminSecret, 'adminPassword'),
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

        this.surveyContainerDefinition.addMountPoints({
            containerPath: '/var/www/html/plugins',
            sourceVolume: surveyVolumeName,
            readOnly: false,
        });
        this.surveyContainerDefinition.addMountPoints({
            containerPath: '/var/www/html/upload',
            sourceVolume: surveyVolumeName,
            readOnly: false,
        });
        this.surveyContainerDefinition.addMountPoints({
            containerPath: '/var/www/html/application/config',
            sourceVolume: surveyVolumeName,
            readOnly: false,
        });
        this.surveyContainerDefinition.addMountPoints({
            containerPath: '/var/lime/sessions',
            sourceVolume: surveyVolumeName,
            readOnly: false,
        });

        const normalizedHostHeaders = props.hostHeaders
            .map((hostHeader) => {
                const trimmedHostHeader = hostHeader.trim();
                return Token.isUnresolved(trimmedHostHeader) ? trimmedHostHeader : trimmedHostHeader.toLowerCase();
            })
            .filter((hostHeader) => hostHeader.length > 0);

        if (normalizedHostHeaders.length === 0) {
            throw new Error('SurveyEcsStack requires at least one host header for listener routing.');
        }

        this.nestedServiceStack = new NestedStack(this, 'NestedServiceStack');

        this.surveyLoadBalancedService = new ecs.FargateService(this.nestedServiceStack, 'SurveyFargateService', {
            cluster: this.surveyCluster,
            circuitBreaker: { rollback: false },
            desiredCount: 1,
            minHealthyPercent: 50,
            taskDefinition: this.surveyTaskDefinition,
            securityGroups: [props.serviceSecurityGroup],
        });

        this.surveyTargetGroup = new elbv2.ApplicationTargetGroup(this.nestedServiceStack, 'SurveyTargetGroup', {
            vpc: props.vpc,
            protocol: elbv2.ApplicationProtocol.HTTP,
            port: 80,
            targets: [this.surveyLoadBalancedService],
            healthCheck: {
                path: '/healthz',
                healthyHttpCodes: '200',
            },
        });

        this.surveyListenerRule = new elbv2.ApplicationListenerRule(this.nestedServiceStack, 'SurveyListenerRule', {
            listener: props.sharedListener,
            priority: props.listenerPriority,
            conditions: [elbv2.ListenerCondition.hostHeaders(normalizedHostHeaders)],
            action: elbv2.ListenerAction.forward([this.surveyTargetGroup]),
        });
    }
};