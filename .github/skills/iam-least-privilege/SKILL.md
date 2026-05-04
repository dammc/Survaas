---
name: iam-least-privilege
description: "Review and tighten Survaas IAM policies and trust relationships to least privilege with clear justification for any exceptions."
argument-hint: "Provide IAM scope (roles/policies/files) and intended access."
---

# IAM Least Privilege

## Purpose
Ensure IAM roles and policies in Survaas follow least privilege.

## When to use
- Changes to IAM roles, policy statements, trust policies, or SageMaker permissions.
- Security reviews involving wildcard actions/resources.

## Procedure
1. Enumerate required actions and resources for each role.
2. Remove unused actions and avoid wildcard resources where practical.
3. Scope permissions to ARNs and conditions where possible.
4. Verify trust policies only include required principals and conditions.
5. Update tests/documentation for IAM behavior changes.

## Guardrails
- Do not increase IAM scope without explicit rationale and review notes.
- Preserve service functionality; avoid breaking required runtime permissions.

## Validation
- Run IAM-related tests and `npx cdk synth` when available.
- Inspect synthesized statements for wildcard overreach.

## Done criteria
- IAM permissions are narrowly scoped and justified.
- Any remaining wildcard usage is documented with follow-up plan.

## Expected output
- IAM findings and severity.
- Proposed policy/trust changes.
- Validation evidence.
