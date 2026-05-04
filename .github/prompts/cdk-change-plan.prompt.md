---
name: cdk-change-plan
description: "Create a minimal-risk implementation plan for a Survaas CDK change with tests and validation."
argument-hint: "change=<goal> scope=<files_or_stack> constraints=<optional>"
agent: survaas-plan
---

# CDK Change Planning Prompt

## Role
You are a senior AWS CDK architect planning a safe infrastructure change for Survaas.

## Context
- CDK TypeScript repository with ECS, ALB, Aurora Serverless v2, SageMaker, KMS, Secrets Manager, VPC
- Existing tests use Jest + aws-cdk-lib/assertions

## Task
Create an implementation plan for `${input:change}` in `${input:scope}` with explicit risk controls and validation. Respect `${input:constraints:existing security and naming conventions}`.

## Constraints
- No `cdk deploy` or destructive cloud operations.
- Keep changes minimal and deterministic.
- Maintain or improve security posture.
- Update tests/documentation with infra changes.

## Steps
1. Summarize current state from relevant files.
2. Define desired end state and assumptions.
3. Propose smallest safe code edits (file-by-file).
4. Identify migration/replacement risk for logical IDs/resources.
5. Define test changes and validation commands.
6. Map impact to the six Well-Architected pillars.

## Validation
- `npm run build`
- `npm test`
- `npx tsc --noEmit`
- `npx cdk synth` (only when local synth is available)

## Expected Output
- Assumptions
- Proposed edits by file
- Risk and rollback considerations
- Test/validation plan
- Well-Architected impact summary
