import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Construct that creates VPC for the survey application
 */
export class SurveyVpcConstruct extends Construct {

    /** VPC where resources will be deployed */
    public readonly vpc: ec2.Vpc;

    /**
     * Creates a new VPC construct with associated NAT gateway
     * @param scope The scope in which to define this construct
     * @param id The scoped construct ID
     * @param props Configuration properties
     */
    constructor(scope: Construct, id: string) {
        super(scope, id);

        // vpc
        this.vpc = new ec2.Vpc(this, 'SurvaasDefaultVpc', {
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

    }
}
