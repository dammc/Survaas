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

Testing command policy:
- Prefer `npm test` for repository tests (the script enforces Jest `--runInBand`).
- Do not run `jest` directly unless `--runInBand` is explicitly included.

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

## Behavioral Coding Guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.