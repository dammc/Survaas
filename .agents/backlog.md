# Survaas Production-Readiness Backlog

Prioritized future work grouped by AWS Well-Architected pillar.

## P0 (Critical)

### Security
- Enable HTTPS for ALB using ACM and Route 53; redirect HTTP to HTTPS.
- Add AWS WAF in front of the public ALB with baseline managed rules.
- Remove default admin credentials from source defaults and require secret-driven bootstrap values.
- Reduce SageMaker execution role permissions to least privilege; remove unnecessary wildcard resource scope.
- Define and enforce Secrets Manager rotation strategy for database/admin secrets.

### Reliability
- Review RDS lifecycle safety: move from destructive defaults to production-safe deletion protection/removal policy.
- Validate backup and restore procedures for Aurora Serverless v2 (runbook + recovery test evidence).

## P1 (High)

### Operational Excellence
- Add CI pipeline checks for build, test, synth, lint, and docs validation.
- Add deployment-safety runbooks and change review checklist for CDK resource replacements.
- Add observability baseline: ALB, ECS, RDS, and SageMaker operational dashboards/alerts.

### Security
- Define CloudTrail/Config/Security Hub integration expectations for environment baselines.
- Add policy-as-code checks (IAM wildcard detection, SG open-ingress checks).

### Cost Optimization
- Review NAT gateway usage/cost and evaluate architecture alternatives where practical.
- Define log retention defaults to avoid unbounded logging costs.
- Review Aurora capacity ranges against realistic workload profiles.
- Add controls to detect and stop idle SageMaker resources.

## P2 (Medium)

### Performance Efficiency
- Reassess ECS task CPU/memory defaults and autoscaling triggers.
- Tune Aurora Serverless v2 min/max ACU for workload variability.
- Validate SageMaker instance/storage sizing guidance for analytics workflows.

### Sustainability
- Add right-sizing review cadence for ECS, RDS, and SageMaker resources.
- Introduce idle-resource cleanup checks and environment scheduling patterns where safe.
- Prefer efficient defaults that reduce unnecessary compute/storage utilization.

## Tracking Notes
- Keep this backlog aligned with root `AGENTS.md` and `.github/instructions/security.instructions.md` findings.
- When backlog items are addressed, link implementation PRs and test/synth evidence.
