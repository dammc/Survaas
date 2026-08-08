import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { SurvaasClusterRouteConfig, SurvaasClusterStack } from './stack/appCluster';
import { SurveyVpcConstruct } from './construct/vpc';

interface RootClusterConfig extends SurvaasClusterRouteConfig {
  stackId: string,
  appName: string,
}

/**
 * Main CDK stack class for the Survaas application
 * @class SurvaasRootStack
 * @extends cdk.Stack
 */
export class SurvaasRootStack extends cdk.Stack {
  /** Stack containing VPC networking resources */
  public readonly surveyVpcConstruct: SurveyVpcConstruct;
  /** Shared load balancer security group for all survey clusters */
  public readonly sharedLoadBalancerSecurityGroup: ec2.SecurityGroup;
  /** Shared internet-facing application load balancer */
  public readonly sharedLoadBalancer: elbv2.ApplicationLoadBalancer;
  /** Shared HTTP listener used by all survey cluster routes */
  public readonly sharedListener: elbv2.ApplicationListener;
  /** Shared WAF web ACL attached to the shared load balancer */
  public readonly sharedWebAcl: wafv2.CfnWebACL;
  /** WAF association resource for the shared load balancer */
  public readonly sharedWebAclAssociation: wafv2.CfnWebACLAssociation;
  /** Output exposing the survey environment URL */
  public readonly surveyEnvironmentUrlOutput: cdk.CfnOutput;
  /** Root-level cluster route configuration */
  public readonly clusterConfigs: RootClusterConfig[];

  /**
   * Creates a new instance of SurvaasRootStack
   * @param scope - Parent construct
   * @param id - Construct ID
   * @param props - Stack properties
   */
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.surveyVpcConstruct = new SurveyVpcConstruct(this, 'SurvaasDefaultVpc');

    this.sharedLoadBalancerSecurityGroup = new ec2.SecurityGroup(this, 'SharedLoadBalancerSecurityGroup', {
      vpc: this.surveyVpcConstruct.vpc,
      description: 'SecurityGroup of the shared loadbalancer for all survey ECS clusters',
    });

    this.sharedLoadBalancer = new elbv2.ApplicationLoadBalancer(this, 'SharedSurveyApplicationLoadbalancer', {
      vpc: this.surveyVpcConstruct.vpc,
      securityGroup: this.sharedLoadBalancerSecurityGroup,
      internetFacing: true,
    });

    this.sharedListener = this.sharedLoadBalancer.addListener('SharedSurveyHttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, { messageBody: 'No route configured' }),
    });

    this.sharedWebAcl = new wafv2.CfnWebACL(this, 'SharedSurveyWebAcl', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'SharedSurveyWebAcl',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AwsManagedIpReputation',
          priority: 0,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList',
              ruleActionOverrides: [
                {
                name: 'AWSManagedIPReputationList',
                actionToUse: { block: {} },
              },
            ],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AwsManagedIpReputation',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AwsManagedKnownBadInputs',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AwsManagedKnownBadInputs',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AwsManagedCommon',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              ruleActionOverrides: [
                {
                  name: 'SizeRestrictions_BODY',
                  actionToUse: { count: {} },
                },
                {
                  name: 'CrossSiteScripting_BODY',
                  actionToUse: { count: {} },
                },
              ],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AwsManagedCommon',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AwsManagedSqlInjection',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AwsManagedSqlInjection',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'RateLimitByIp',
          priority: 4,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              aggregateKeyType: 'IP',
              limit: 2000,
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitByIp',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    this.sharedWebAclAssociation = new wafv2.CfnWebACLAssociation(this, 'SharedSurveyWebAclAssociation', {
      resourceArn: this.sharedLoadBalancer.loadBalancerArn,
      webAclArn: this.sharedWebAcl.attrArn,
    });

    this.surveyEnvironmentUrlOutput = new cdk.CfnOutput(this, 'SurveyEnvironmentUrl', {
      value: `http://${this.sharedLoadBalancer.loadBalancerDnsName}`,
      description: 'Open this URL to access the survey environment.',
    });

    this.clusterConfigs = [
      {
        stackId: 'SurvaasDefaultClusterStack',
        appName: 'SurvaasDefaultTest', //replace with a unique app name
        hostHeaders: [this.sharedLoadBalancer.loadBalancerDnsName],
        priority: 100,
      },
    ];

    this.validateClusterConfigs(this.clusterConfigs);

    for (const clusterConfig of this.clusterConfigs) {
      new SurvaasClusterStack(this, clusterConfig.stackId, {
        appName: clusterConfig.appName,
        surveyVpcConstruct: this.surveyVpcConstruct,
        sharedListener: this.sharedListener,
        sharedLoadBalancerSecurityGroup: this.sharedLoadBalancerSecurityGroup,
        routeConfig: {
          hostHeaders: clusterConfig.hostHeaders,
          priority: clusterConfig.priority,
        },
        env: { account: this.account, region: this.region },
      });
    }

    // add new apps by appending entries in clusterConfigs above.
  }

  private validateClusterConfigs(clusterConfigs: RootClusterConfig[]): void {
    const usedPriorities = new Set<number>();
    const usedHosts = new Set<string>();

    for (const clusterConfig of clusterConfigs) {
      if (clusterConfig.priority < 1 || clusterConfig.priority > 50000) {
        throw new Error(`Listener priority for '${clusterConfig.stackId}' must be between 1 and 50000.`);
      }

      if (usedPriorities.has(clusterConfig.priority)) {
        throw new Error(`Duplicate listener priority '${clusterConfig.priority}' in root cluster config.`);
      }
      usedPriorities.add(clusterConfig.priority);

      if (clusterConfig.hostHeaders.length === 0) {
        throw new Error(`Cluster '${clusterConfig.stackId}' must define at least one host header.`);
      }

      for (const hostHeader of clusterConfig.hostHeaders) {
        const normalizedHostHeader = hostHeader.trim().toLowerCase();
        if (!normalizedHostHeader) {
          throw new Error(`Cluster '${clusterConfig.stackId}' includes an empty host header.`);
        }
        if (usedHosts.has(normalizedHostHeader)) {
          throw new Error(`Duplicate host header '${normalizedHostHeader}' in root cluster config.`);
        }
        usedHosts.add(normalizedHostHeader);
      }
    }
  }
}
