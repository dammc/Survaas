---
name: documentation-and-licensing
description: "Update Survaas documentation while preserving GPL attribution, LimeSurvey trademark guidance, and command accuracy."
argument-hint: "Provide changed behavior and docs/licensing files to review."
---

# Documentation and Licensing

## Purpose
Keep documentation accurate while preserving licensing, attribution, and trademark compliance.

## When to use
- README/docs updates.
- Docker asset changes.
- Any edit that might affect licensing or attribution language.

## Procedure
1. Confirm code/test behavior being documented is current.
2. Update only affected docs sections with concise, verifiable instructions.
3. Verify GPL attribution and LimeSurvey trademark guidance remain intact.
4. Keep non-production caveats visible (HTTPS/WAF backlog, credential hardening, backup/restore, observability).
5. Check referenced commands against `package.json` scripts.

## Guardrails
- Do not remove attribution or legal notices without explicit instruction.
- Do not alter legal meaning when editing licensing text.

## Validation
- Optional docs check: `npx typedoc --plugin typedoc-plugin-missing-exports`.
- Confirm docs terminology matches stack/construct names in code.

## Done criteria
- Docs are accurate and actionable.
- Licensing/trademark obligations remain visible and unchanged in intent.

## Expected output
- Files updated.
- Compliance checks performed.
- Remaining documentation/compliance TODOs.
