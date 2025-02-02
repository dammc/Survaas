import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_rds as rds } from 'aws-cdk-lib'
import { aws_ec2 as ec2 } from 'aws-cdk-lib'
import { aws_kms as kms } from 'aws-cdk-lib'
import { aws_ssm as ssm } from 'aws-cdk-lib'
/**
 * Interface for RDS stack properties extending StackProps
 * @interface RdsStackProps
 * @extends {StackProps}
 */
interface RdsStackProps extends StackProps {
  /** Name of the application */
  appName: string,
  /** VPC where RDS cluster will be deployed */
  vpc: ec2.IVpc,
  /** Security group for the RDS cluster */
  dbSecurityGroup: ec2.SecurityGroup,
  /** KMS key for encryption */
  kmsKey: kms.IKey,
}

/**
 * Stack that creates an Aurora MySQL RDS cluster
 * @extends {Stack}
 */
export class RdsStack extends Stack {
  /** The created RDS database cluster */
  public readonly dbCluster: rds.DatabaseCluster;
  /** SSM parameter storing the database cluster secret ARN */
  public readonly ssmDbClusterSecretArn: ssm.StringParameter;

  /**
   * Creates a new RDS stack
   * @param {Construct} scope - The scope in which to define this construct
   * @param {string} id - The scoped construct ID
   * @param {RdsStackProps} props - Stack properties
   */
  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    /**
     * Creates an Aurora MySQL database cluster with serverless v2 instances
     */
    this.dbCluster = new rds.DatabaseCluster(this, 'SurveyCluster', {
      engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_08_0 }),
      vpc: props.vpc,
      securityGroups: [props.dbSecurityGroup],
      credentials: { username: props.appName.toLowerCase() + 'admin' },
      clusterIdentifier: props.appName.toLowerCase() + '-db',
      defaultDatabaseName: props.appName + 'Db',
      deletionProtection: false,
      backup: { retention: Duration.days(7) },
      parameterGroup: new rds.ParameterGroup(this, 'ParameterGroup', {
        engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_08_0 }),
      }),
      removalPolicy: RemovalPolicy.DESTROY,
      writer: rds.ClusterInstance.serverlessV2('serverlessWriter', {
        publiclyAccessible: false,
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('serverlessReader', {
          scaleWithWriter: true,
          publiclyAccessible: false,
        }),
      ],
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 2,
      storageEncrypted: true,
      storageEncryptionKey: props.kmsKey,
    });

    /**
     * Creates an SSM parameter to store the database cluster secret ARN
     */
    this.ssmDbClusterSecretArn = new ssm.StringParameter(this, 'SsmDbSecretArn', {
      parameterName: props.appName + 'DbSecretArn',
      stringValue: <string> this.dbCluster.secret?.secretArn,
    })
  }
}