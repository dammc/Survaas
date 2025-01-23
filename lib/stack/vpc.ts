import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
/**
 * Interface extending StackProps to include application name
 */
interface SurveyVpcStackProps extends StackProps {
    /** Name of the application */
    appName: string,
}

/**
 * Stack that creates VPC and security group infrastructure for the survey application
 */
export class SurveyVpcStack extends Stack {

    /** VPC where resources will be deployed */
    public readonly vpc: ec2.Vpc;

    /** Security group for database resources */
    public readonly dbSecurityGroup: ec2.SecurityGroup;

    /** Security group for load balancer */
    public readonly loadBalancerSecurityGroup: ec2.SecurityGroup;

    /** Security group for analytics resources */
    public readonly analyticsSecurityGroup: ec2.SecurityGroup;

    /** Security group for ECS service */
    public readonly serviceSecurityGroup: ec2.SecurityGroup;

    /** SSM parameter storing load balancer security group ID */
    public readonly ssmLoadBalancerSecurityGroupId: ssm.StringParameter;

    /** SSM parameter storing service security group ID */
    public readonly ssmServiceSecurityGroupId: ssm.StringParameter;

    /**
     * Creates a new VPC stack with associated security groups
     * @param scope The scope in which to define this construct
     * @param id The scoped construct ID
     * @param props Configuration properties
     */
    constructor(scope: Construct, id: string, props: SurveyVpcStackProps) {
        super(scope, id, props);

        // vpc
        this.vpc = new ec2.Vpc(this, props.appName + 'Vpc', {
            maxAzs: 2,
            subnetConfiguration: [
                {
                    subnetType: ec2.SubnetType.PUBLIC,
                    name: 'Public',
                    cidrMask: 18
                },
                {
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    name: 'Private',
                    cidrMask: 18
                }
            ],
            natGatewayProvider: ec2.NatProvider.gateway(),
            natGateways: 1,
        });

        this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
            vpc: this.vpc,
            description: 'SecurityGroup of the DB cluster',
        });

        this.loadBalancerSecurityGroup = new ec2.SecurityGroup(this, 'LoadBalancerSecurityGroup', {
            vpc: this.vpc,
            description: 'SecurityGroup of the loadbalancer for the survey ECS cluster',
        });

        this.serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
            vpc: this.vpc,
            description: 'SecurityGroup of the ECS cluster',
        });

        this.analyticsSecurityGroup = new ec2.SecurityGroup(this, 'AnalyticsSecurityGroup', {
            vpc: this.vpc,
            description: 'SecurityGroup of the Sagemaker Domain',
        });

        this.ssmLoadBalancerSecurityGroupId = new ssm.StringParameter(this, 'LoadBalancerSecurityGroupId', {
            parameterName: props.appName + 'LoadBalancerSecurityGroupId',
            stringValue: this.loadBalancerSecurityGroup.securityGroupId,
        });

        this.ssmServiceSecurityGroupId = new ssm.StringParameter(this, 'ServiceSecurityGroupId', {
            parameterName: props.appName + 'ServiceSecurityGroupId',
            stringValue: this.serviceSecurityGroup.securityGroupId,
        });

        // add ingress from service security group to db security group
        this.dbSecurityGroup.addIngressRule(
            ec2.Peer.securityGroupId(this.serviceSecurityGroup.securityGroupId),
            ec2.Port.MYSQL_AURORA,
        );

        // add ingress from loadbalancer security group to db security group
        this.dbSecurityGroup.addIngressRule(
            ec2.Peer.securityGroupId(this.analyticsSecurityGroup.securityGroupId),
            ec2.Port.MYSQL_AURORA,
        );

        // add ingress from loadbalancer security group to service security group
        this.serviceSecurityGroup.addIngressRule(
            ec2.Peer.securityGroupId(this.loadBalancerSecurityGroup.securityGroupId),
            ec2.Port.HTTP,
        );

    }
}
