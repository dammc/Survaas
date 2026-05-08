# Survaas Copilot Instructions

Survaas is an AWS CDK v2 TypeScript repository. Keep all changes minimal, security-first, and testable.

## Project Baseline
- Follow existing structure in `bin/`, `lib/construct/`, `lib/stack/`, and `test/`.
- Keep construct IDs and resource naming stable unless migration intent is explicit.
- Prefer repository patterns over new abstractions.

## Security and Compliance Baseline
- Treat all infrastructure edits as security-sensitive.
- Never hardcode secrets, credentials, account IDs, or environment-specific values.
- Preserve encryption, Secrets Manager usage, KMS protections, and constrained network ingress.
- Preserve GPL/LimeSurvey attribution and trademark guidance for `docker/` and docs.

## Validation Baseline
After relevant changes, run:
- `npm run build`
- `npm test`
- `npx tsc --noEmit`
- `npx cdk synth` (only when local synth is safe/available)
- `npx typedoc --plugin typedoc-plugin-missing-exports` (for doc-sensitive updates)

Report pre-existing failures separately from regressions caused by your changes.

## Well-Architected Baseline
Use AWS Well-Architected Framework as authority: https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html

For non-trivial infra tasks, include explicit impact on:
1. Operational Excellence
2. Security
3. Reliability
4. Performance Efficiency
5. Cost Optimization
6. Sustainability

## Focused Instructions
Use these targeted files to avoid duplicating rules:
- `.github/instructions/aws-cdk.instructions.md`
- `.github/instructions/security.instructions.md`
- `.github/instructions/testing.instructions.md`
- `.github/instructions/documentation.instructions.md`
- `.github/instructions/licensing.instructions.md`
