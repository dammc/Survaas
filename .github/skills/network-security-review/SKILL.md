---
name: network-security-review
description: "Review Survaas VPC, subnet, ALB, and security group exposure for least-privilege network posture and safe ingress patterns."
argument-hint: "Provide network scope (ALB/SG/VPC files) and intended traffic flows."
---

# Network Security Review

## Purpose
Review and harden network exposure and segmentation for Survaas resources.

## When to use
- VPC, subnet, ALB, SG, ingress/egress, or service exposure changes.
- Public endpoint or listener configuration reviews.

## Procedure
1. Map inbound and outbound traffic paths.
2. Verify only required public ingress exists.
3. Validate SG rules are service-scoped and least-privilege.
4. Confirm private subnet placement for stateful/internal services.
5. Track HTTPS/ACM/Route53 and WAF gaps where still pending.
6. Include NAT gateway cost awareness in design recommendations.

## Guardrails
- No broad `0.0.0.0/0` ingress without explicit approval.
- Preserve or improve existing security posture.

## Validation
- Run network-related tests and `npx cdk synth` when available.
- Confirm listener and SG properties in synthesized templates.

## Done criteria
- Exposure paths are documented and justified.
- Risk-ranked recommendations are provided with minimal-change options.

## Expected output
- Current exposure summary.
- Findings with severity.
- Immediate fixes and deferred follow-ups.
