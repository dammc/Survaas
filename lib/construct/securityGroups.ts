import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Construct that creates and manages security groups for different components of the infrastructure
 */
export class SecurityGroupsConstruct extends Construct {
    /**
     * Security group for the database cluster
     */
    public readonly dbSecurityGroup: ec2.SecurityGroup;

    /**
     * Security group for the load balancer
     */
    public readonly loadBalancerSecurityGroup: ec2.SecurityGroup;

    /**
     * Security group for the ECS service
     */
    public readonly serviceSecurityGroup: ec2.SecurityGroup;

    /**
     * Security group for the EFS file system
     */
    public readonly efsSecurityGroup: ec2.SecurityGroup;

    /**
     * Security group for the SageMaker analytics domain
     */
    public readonly analyticsSecurityGroup: ec2.SecurityGroup;

    /**
     * Creates new security groups and configures their ingress rules
     * @param scope The scope in which to define this construct
     * @param id The scoped construct ID
     * @param vpc The VPC where the security groups will be created
     * @param loadBalancerSecurityGroup Optional shared load balancer security group
     */
    constructor(scope: Construct, id: string, vpc: ec2.Vpc, loadBalancerSecurityGroup?: ec2.SecurityGroup) {
        super(scope, id);

        this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
            vpc: vpc,
            description: 'SecurityGroup of the DB cluster',
        });

        this.loadBalancerSecurityGroup = loadBalancerSecurityGroup ?? new ec2.SecurityGroup(this, 'LoadBalancerSecurityGroup', {
            vpc: vpc,
            description: 'SecurityGroup of the loadbalancer for the survey ECS cluster',
        });

        this.serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
            vpc: vpc,
            description: 'SecurityGroup of the ECS cluster',
        });

        this.efsSecurityGroup = new ec2.SecurityGroup(this, 'EfsSecurityGroup', {
            vpc: vpc,
            description: 'SecurityGroup of the EFS file system used by ECS tasks',
        });

        this.analyticsSecurityGroup = new ec2.SecurityGroup(this, 'AnalyticsSecurityGroup', {
            vpc: vpc,
            description: 'SecurityGroup of the Sagemaker Domain',
        });

        // add ingress from service security group to db security group
        this.dbSecurityGroup.addIngressRule(
            ec2.Peer.securityGroupId(this.serviceSecurityGroup.securityGroupId),
            ec2.Port.POSTGRES,
        );

        // add ingress from analytics security group to db security group
        this.dbSecurityGroup.addIngressRule(
            ec2.Peer.securityGroupId(this.analyticsSecurityGroup.securityGroupId),
            ec2.Port.POSTGRES,
        );

        // add ingress from loadbalancer security group to service security group
        this.serviceSecurityGroup.addIngressRule(
            ec2.Peer.securityGroupId(this.loadBalancerSecurityGroup.securityGroupId),
            ec2.Port.HTTP,
        );

        // allow ECS tasks to reach EFS mount targets over NFS
        this.efsSecurityGroup.addIngressRule(
            ec2.Peer.securityGroupId(this.serviceSecurityGroup.securityGroupId),
            ec2.Port.tcp(2049),
        );
    }
}   
