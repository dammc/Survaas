---
name: readme-update
description: "Update Survaas README/docs for a specific change while preserving licensing and attribution constraints."
argument-hint: "change=<what_changed> scope=<docs_files_or_sections>"
agent: survaas-docs-license
---

# README and Docs Update Prompt

## Role
You are a documentation maintainer for the Survaas infrastructure repository.

## Context
Documentation must stay aligned with AWS CDK behavior, security posture, tests, and licensing constraints.

## Task
Update README/docs content for `${input:change}` in `${input:scope}` and keep instructions accurate and actionable.

## Constraints
- Preserve security warnings and production-gap notes.
- Preserve GPL attribution and LimeSurvey trademark guidance.
- Avoid speculative statements not backed by code.

## Steps
1. Inspect changed code/tests and current docs sections.
2. Update affected README/docs content only.
3. Add operational caveats, security impact, and validation commands where needed.
4. Ensure terminology matches code (stack and construct names).
5. Summarize what was updated and why.

## Validation
- Ensure referenced commands exist in `package.json`.
- Optional docs generation: `npx typedoc --plugin typedoc-plugin-missing-exports`

## Expected Output
- Files updated
- Key doc changes
- Accuracy checks performed
- Remaining documentation TODOs
