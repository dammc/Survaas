# Project Guidelines

## Code Style
- Use TypeScript with strict typing and existing linting/formatting behavior from `eslint.config.mjs` and `tsconfig.json`.
- Match current naming in this repo: stacks and constructs use PascalCase IDs, stack props interfaces are colocated with stack classes.
- Keep comments concise and focused on intent (not line-by-line narration).

## Architecture
- This is an AWS CDK v2 TypeScript project with a root orchestration stack and per-service stacks.
- Root orchestration lives in `lib/root.ts` and wires shared infrastructure plus one or more `SurvaasClusterStack` instances.
- Reusable infrastructure primitives live in `lib/construct/`.
- Service-specific stacks live in `lib/stack/` (ECS, RDS, SageMaker, KMS, etc.).
- CDK app entrypoint is `bin/survaas_cdk.ts` via `cdk.json`.

## Build And Test
- Install dependencies: `npm install`
- Build TypeScript: `npm run build`
- Run tests: `npm run test`
- CDK CLI passthrough: `npm run cdk -- <args>`
- Deploy all stacks: `cdk deploy --all`

## Environment And Prerequisites
- Deployment requires AWS auth plus environment variables `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION`.
- Docker must be available for image-related deployment paths.
- Unit tests are template/assertion based and generally do not require live AWS credentials.

## Repository Conventions
- Prefer passing dependencies between stacks through typed props interfaces rather than global lookups.
- Prefer explicit stack dependencies (`addDependency`) when resource ordering matters.
- Keep environment propagation explicit (`env: { account, region }`) for nested stacks.
- Follow existing test patterns in `test/*.test.ts` using `aws-cdk-lib/assertions`.

## Pitfalls To Avoid
- Do not introduce new hardcoded credentials, account IDs, certificate ARNs, or region-specific ARNs in source files.
- `lib/utils/listenerPriorityManager.ts` mutates `cdk.context.json`; treat context-file edits as intentional and review diffs carefully.
- Avoid broad refactors in generated docs output (`docs/`) unless specifically requested.

## Key Files
- `README.md`: deployment workflow, architecture notes, and prerequisites.
- `package.json`: build/test/cdk scripts.
- `cdk.json`: CDK app command and watch behavior.
- `lib/root.ts`: top-level stack composition and multi-cluster pattern.
- `lib/stack/appCluster.ts`: cluster stack wiring and cross-stack dependencies.
- `test/`: CDK template-based validation examples.
