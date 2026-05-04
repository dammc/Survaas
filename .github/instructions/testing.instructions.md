---
name: testing
description: "Jest and aws-cdk-lib/assertions testing strategy for Survaas infrastructure changes."
applyTo: "test/**/*.ts,**/*.test.ts,**/*.spec.ts"
---

# Testing Rules (Survaas)

## Must
- Add or update tests for all infrastructure behavior changes.
- Use `aws-cdk-lib/assertions` for template-level checks.
- Keep test names specific to intended infrastructure guarantees.
- Validate no existing tests regress after modifications.

## Validation Order
1. `npm run build`
2. `npm test`
3. `npx tsc --noEmit`
4. `npx cdk synth` (when local synth is available)

## Should
- Assert security-critical properties (encryption, SG rules, IAM scope).
- Assert critical operational properties (backup retention, capacity limits).
- Prefer focused tests over snapshot-only coverage.

## Must Not
- Merge infrastructure changes without running local tests unless explicitly blocked.
- Silence failing tests by weakening assertions unrelated to the requested change.
