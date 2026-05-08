---
name: aws-cdk
description: "AWS CDK v2 TypeScript architecture and infrastructure change rules for Survaas."
applyTo: "bin/**/*.ts,lib/**/*.ts,test/**/*.ts"
---

# AWS CDK Rules (Survaas)

## Must
- Keep CDK changes deterministic and minimally scoped.
- Preserve construct boundaries (`construct/` vs `stack/`) and naming patterns.
- Keep logical ID drift minimal; if unavoidable, call out replacement risks.
- Use encrypted storage and managed secret references by default.
- Update/add Jest assertion tests for infrastructure behavior changes.
- Run `npm run build`, `npm test`, and `npx cdk synth` after significant CDK edits when local synth is available.

## Should
- Prefer private subnets and narrow SG rules.
- Use explicit removal policies and document lifecycle intent.
- Document Well-Architected pillar impacts in change summaries.
- Check production readiness concerns (HTTPS/WAF, default credentials, backup/restore, observability, log retention, NAT cost).

## Must Not
- Add hardcoded credentials or environment-specific account identifiers.
- Add `cdk deploy`/`cdk destroy` instructions for autonomous runs.
- Introduce broad IAM wildcard statements without written justification.

## Survaas-Specific Risk Notes
- Root stack currently shows insecure default credential examples; do not propagate this pattern.
- ALB is internet-facing and HTTP-only today; preserve or improve security posture only.
- RDS lifecycle settings are currently non-production; call out any related risk in reviews.
