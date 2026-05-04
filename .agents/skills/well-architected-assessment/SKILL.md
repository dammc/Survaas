---
name: well-architected-assessment
description: "Assess Survaas architecture or changes against all six AWS Well-Architected pillars with actionable recommendations."
argument-hint: "Provide scope and objective for the assessment."
---

# Well-Architected Assessment

## Purpose
Evaluate Survaas work against the AWS Well-Architected Framework and prioritize improvements.

## When to use
- Architecture reviews.
- Production-readiness assessments.
- Risk reviews before or after non-trivial infrastructure changes.

## Procedure
1. Identify affected components, workflows, and operators.
2. Assess each pillar explicitly:
   - Operational Excellence
   - Security
   - Reliability
   - Performance Efficiency
   - Cost Optimization
   - Sustainability
3. Record strengths, risks, and specific remediation actions.
4. Map findings to code/tests/docs and, when relevant, `.agents/backlog.md`.
5. Provide phased next actions (now/next/later).

## Guardrails
- Use the AWS Well-Architected framework as authority.
- Avoid generic advice without repository-specific implementation paths.

## Validation
- Verify recommendations are actionable in current Survaas structure.
- Confirm risks are severity-ranked and scoped.

## Done criteria
- Every pillar has explicit findings and next actions.
- Critical/high findings include concrete mitigation steps.

## Expected output
- Scope reviewed.
- Findings by pillar.
- Prioritized remediation plan.
