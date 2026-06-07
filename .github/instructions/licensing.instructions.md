---
name: licensing
description: "GPL attribution and LimeSurvey trademark compliance guidance for Survaas docs and Docker assets."
applyTo: "LICENSE*,NOTICE*,README.md,docker/**,docs/**"
---

# Licensing and Trademark Rules (Survaas)

## Must
- Preserve GPL license notices, attribution statements, and source references.
- Preserve LimeSurvey trademark compliance guidance and related cautions.
- Keep redistribution obligations visible in `README.md` and `LICENSE` context.
- Escalate ambiguous legal/trademark edits for human review.

## Must Not
- Remove licensing or attribution text without explicit user approval.
- Reword legal obligations in ways that change meaning.
- Add incompatible license claims to GPL-derived assets.

## Checklist for Relevant Changes
1. Confirm original attribution still present.
2. Confirm license labels still accurate (GPL-3.0, GPL-2.0-or-later references).
3. Confirm trademark guidance remains intact.
4. Add note in summary when files under `docker/` are edited.
