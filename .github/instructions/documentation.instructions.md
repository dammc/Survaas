---
name: documentation
description: "Documentation expectations for README, docs, and operational guidance in Survaas."
applyTo: "**/*.md,docs/**"
---

# Documentation Rules (Survaas)

## Must
- Keep docs aligned with actual CDK behavior and test strategy.
- Update operator/developer guidance when commands or workflows change.
- Mention security impact and residual risk for security-relevant changes.
- Keep Well-Architected pillar notes explicit in major architecture updates.

## Should
- Keep docs concise, actionable, and command-verifiable.
- Include links to relevant AWS service docs for non-obvious behavior.
- Maintain consistency with existing terminology (SurvaasClusterStack, default VPC, etc.).

## Must Not
- Remove or dilute warnings about non-production-ready defaults.
- Introduce deployment instructions requiring privileged credentials in autonomous workflows.
