---
name: security
description: "Security review and guardrails for IAM, networking, encryption, secrets, and Docker exposure changes."
applyTo: "lib/**/*.ts,docker/**,bin/**/*.ts"
---

# Security Rules (Survaas)

## Must
- Enforce least privilege for IAM permissions and trust relationships.
- Keep secrets in Secrets Manager/SSM references; never inline values.
- Ensure encryption at rest remains enabled for data-bearing services.
- Keep network exposure explicit and narrowly scoped.
- Record security impact in every infra change summary.
- Preserve or improve current security posture for ECS, RDS, SageMaker, ALB, KMS, and VPC boundaries.

## Must Not
- Add default passwords, API keys, or credentials to source files.
- Broaden security group ingress to open CIDRs without explicit approval.
- Remove encryption settings or key rotation without risk acceptance.

## Focused Security Review Checklist
For each infrastructure PR/task, check and report:
1. Hardcoded credentials
2. Overly broad IAM permissions/trust
3. Public ingress rules and listener exposure
4. Missing encryption
5. Missing deletion protection/removal policy safeguards
6. Insecure defaults in docs/examples
7. Missing log retention/monitoring and restore validation expectations

## Current Survaas Findings to Track as TODOs
- `lib/root.ts`: default admin credential values in stack configuration example.
- `lib/stack/ecs.ts`: internet-facing ALB with HTTP-only listener posture.
- `lib/stack/rds.ts`: `deletionProtection: false` and `RemovalPolicy.DESTROY`.
- `README.md`: calls out HTTPS/WAF as future work; keep this visible until implemented.
