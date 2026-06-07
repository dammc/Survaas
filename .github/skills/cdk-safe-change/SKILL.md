---
name: cdk-safe-change
description: "Apply minimal-risk AWS CDK changes in Survaas and validate build, tests, and synthesis behavior safely."
argument-hint: "Provide requested change, target files/stacks, and constraints."
---

# CDK Safe Change

## Purpose
Apply AWS CDK infrastructure changes safely with minimal blast radius.

## When to use
- Any task modifying files in `bin/**/*.ts`, `lib/**/*.ts`, or related CDK tests.
- Any change that can affect logical IDs, IAM, networking, or data lifecycle.

## Procedure
1. Inspect current stack and construct relationships.
2. Define the smallest set of edits needed to satisfy the request.
3. Check for logical ID drift and replacement risk.
4. Update/add corresponding `aws-cdk-lib/assertions` tests.
5. Run `npm run build`, `npm test`, `npx tsc --noEmit`, and `npx cdk synth` when local synth is safe.
6. Summarize security impact plus six-pillar Well-Architected impact.

## Guardrails
- Never run `cdk deploy` or `cdk destroy`.
- Never hardcode secrets, credentials, account IDs, or environment values.
- Do not broaden IAM/network scope without explicit justification.

## Validation
- Build and tests pass, or pre-existing failures are clearly separated.
- Synth output is valid when synth is runnable locally.

## Done criteria
- Minimal deterministic diff.
- Matching tests updated.
- Risks, follow-up actions, and residual concerns documented.

## Expected output
- File-by-file change summary.
- Validation results.
- Prioritized risk notes.
