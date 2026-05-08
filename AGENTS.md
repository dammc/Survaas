# AGENTS.md - Survaas Agent Operating Guide

## Repository Identity
- Project: Survaas
- Type: AWS CDK v2 infrastructure-as-code project in TypeScript
- Purpose: Survey-as-a-service platform on AWS using ECS Fargate, ALB, Aurora Serverless v2, SageMaker Domain, ECR assets, KMS, Secrets Manager, VPC, and security groups

## Architecture Snapshot
- CDK app entrypoint: `bin/survaas_cdk.ts`
- Root stack orchestration: `lib/root.ts`, `lib/stack/appCluster.ts`
- Core components:
  - Network: `lib/construct/vpc.ts`, `lib/construct/securityGroups.ts`
  - Compute: `lib/stack/ecs.ts`
  - Data: `lib/stack/rds.ts`
  - Analytics: `lib/stack/sagemaker.ts`
  - Encryption: `lib/stack/kms.ts`
- Testing: Jest + `aws-cdk-lib/assertions` in `test/*.test.ts`
- Docs: TypeDoc output in `docs/`
- Licensing-sensitive assets: `docker/` and related LimeSurvey-derived files

## Agent Operating Mode
Agents must operate in a security-first, minimal-change mode:
1. Inspect current code and tests before editing.
2. Plan smallest viable change set.
3. Apply additive/minimal edits only.
4. Run applicable local validation commands.
5. Summarize changes, risks, and remaining work.

## Safe Command Policy
Agents may run local, non-destructive commands such as:
- `npm install`
- `npm run build`
- `npx tsc --noEmit`
- `npm test`
- `npx cdk synth`
- `npx typedoc --plugin typedoc-plugin-missing-exports`

Terminal tool usage is enforced through a workspace `PreToolUse` hook policy in `.github/hooks/terminal-command-approval.json`.

Agents must prefer read-only inspection commands when possible and avoid network/cloud mutation commands.

## Forbidden Actions
Agents must not:
- Run `cdk deploy`, `cdk destroy`, or any command that mutates cloud resources.
- Introduce secrets, credentials, account IDs, keys, or environment-specific values.
- Weaken IAM, network controls, encryption, Secrets Manager usage, or database protections.
- Remove licensing headers, attribution notes, or trademark compliance guidance.
- Perform destructive repository operations (`git reset --hard`, bulk deletion) unless explicitly requested.

## AWS Well-Architected Alignment (Authoritative Source)
Use the AWS Well-Architected Framework as the governing reference:
- https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html

Every non-trivial infrastructure change must document expected impact against all six pillars:
1. Operational Excellence
2. Security
3. Reliability
4. Performance Efficiency
5. Cost Optimization
6. Sustainability

## CDK and IaC Guardrails
Agents working under `lib/`, `bin/`, and `test/` must enforce:
- Deterministic constructs and stable naming where practical.
- Least-privilege IAM and avoidance of broad wildcard permissions.
- Encrypted storage and encrypted service integrations by default.
- Private networking by default; explicit justification for public ingress.
- No hardcoded secrets or default credentials in committed code.
- Stable logical IDs unless intentional migration is documented.
- Validation through `cdk synth` and relevant tests after changes.
- Test updates alongside infrastructure changes.

## Testing Expectations
- For infra changes, run at least:
  - `npm run build`
  - `npm test`
  - `npx cdk synth`
- If a command is unavailable or blocked by environment constraints, record what was skipped and why.
- If failures are pre-existing, report them separately from new regressions.

## Documentation Expectations
- Update `README.md`, inline comments, and `docs/` generation guidance when behavior or operator workflow changes.
- Include concise risk notes and operational caveats for security-sensitive changes.

## Customization Source of Truth
- Keep always-on, instruction, prompt, custom-agent, and skill files under `.github/` for VS Code Copilot discovery.

## Licensing and Trademark Expectations
- Preserve GPL notices, attribution text, and LimeSurvey trademark-compliance guidance.
- Do not remove or rewrite licensing-sensitive text without explicit human direction.
- Flag legal uncertainty for human review rather than guessing.

## Required Human Review Escalations
Ask for human review before proceeding when changes include:
- IAM scope increases, wildcard grants, or trust-policy expansion.
- Network exposure changes (public ALB/listeners, SG broad ingress).
- Encryption or key-policy changes.
- Database deletion protection/removal policy changes.
- Licensing/attribution/trademark-affecting edits.
- Any operation requiring live AWS credentials or deployment.

## Current Known Risk Hotspots (Do Not Auto-Refactor Without Request)
- Default admin credentials and examples in `lib/root.ts`.
- HTTP-only ALB posture in `lib/stack/ecs.ts`.
- RDS `deletionProtection: false` and `RemovalPolicy.DESTROY` in `lib/stack/rds.ts`.
