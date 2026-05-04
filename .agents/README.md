# Survaas Agentic Environment

This folder provides legacy/reference guidance for autonomous and interactive coding agents.

## Source of Truth
- Authoritative VS Code Copilot customizations are under `.github/`:
	- `.github/copilot-instructions.md`
	- `.github/instructions/*.instructions.md`
	- `.github/prompts/*.prompt.md`
	- `.github/agents/*.agent.md`
	- `.github/skills/*/SKILL.md`
- Content in `.agents/` is retained for human context and historical reference, not as the primary machine-discovered source.

## Layout
- `subagents/`: legacy role definitions retained for reference.
- `skills/`: legacy skill references and compatible skill folders.
- `backlog.md`: prioritized production-readiness items mapped to AWS Well-Architected pillars.

## How to Use
1. Start from root `AGENTS.md` for global operating policy.
2. Use `.github/copilot-instructions.md` for daily Copilot behavior.
3. Select a subagent role when task scope is specialized (security, reliability, docs, tests).
4. Apply the matching skill checklist before finalizing changes.

## Guardrails
- Never deploy from autonomous flows.
- Keep changes minimal and test-backed.
- Preserve licensing/attribution/trademark guidance for LimeSurvey-derived assets.
- Report residual risks and unresolved TODOs explicitly.
