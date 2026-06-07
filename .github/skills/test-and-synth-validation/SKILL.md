---
name: test-and-synth-validation
description: "Run and report Survaas build, test, typecheck, and synthesis validation with clear separation of pre-existing versus new failures."
argument-hint: "Provide scope and whether full or targeted validation is needed."
---

# Test and Synth Validation

## Purpose
Standardize local validation for Survaas infrastructure and related documentation updates.

## When to use
- Any change touching `lib/`, `bin/`, `test/`, docs, or customization files.
- Any task requiring regression confidence before handoff.

## Procedure
1. Run `npm run build`.
2. Run `npm test`.
3. Run `npx tsc --noEmit`.
4. Run `npx cdk synth` only when local synth is safe/available.
5. For doc-sensitive updates, optionally run `npx typedoc --plugin typedoc-plugin-missing-exports`.
6. Report pass/fail and distinguish pre-existing issues from regressions.

## Guardrails
- Do not run deploy/destroy commands.
- Do not mask failures by weakening unrelated tests.

## Validation
- Capture concise command outcomes and relevant error excerpts.

## Done criteria
- Validation matrix is complete for applicable commands.
- Any regressions introduced by current changes are fixed or explicitly called out.

## Expected output
- Command-by-command results.
- Regression assessment.
- Suggested next steps.
