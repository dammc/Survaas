#!/usr/bin/env node

// Deterministic terminal command guard for Copilot PreToolUse hooks.
// Order: deny rules -> allow rules -> ask fallback.

const TERMINAL_EXEC_TOOL = "execute/runInTerminal";
const TERMINAL_READ_TOOLS = new Set([
  "execute/getTerminalOutput",
  "read/terminalLastCommand",
  "read/terminalSelection"
]);

const denyRules = [
  {
    id: "deny-cdk-mutation",
    reason: "Cloud-mutating CDK commands are blocked by repository policy.",
    regex: /\b(?:npx\s+)?cdk\s+(?:deploy|destroy|bootstrap)\b/
  },
  {
    id: "deny-cloudformation-mutation",
    reason: "CloudFormation deployment and deletion commands are blocked by repository policy.",
    regex: /\baws\s+cloudformation\s+(?:deploy|delete-stack)\b/
  },
  {
    id: "deny-destructive-git",
    reason: "Destructive git commands require manual handling.",
    regex: /\bgit\s+(?:reset\s+--hard|checkout\s+--|clean\s+-[dfx]+)\b/
  },
  {
    id: "deny-unsafe-escalation",
    reason: "Privilege escalation commands are blocked.",
    regex: /\b(?:sudo|su)\b/
  },
  {
    id: "deny-pipe-to-shell",
    reason: "Piping remote scripts into a shell is blocked.",
    regex: /\b(?:curl|wget)\b[^|]*\|\s*(?:sh|bash)\b/
  },
  {
    id: "deny-secret-access",
    reason: "Secret access commands are blocked.",
    regex: /\b(?:aws\s+secretsmanager\s+get-secret-value|cat\s+~\/.aws\/credentials)\b/
  }
];

const allowRules = [
  {
    id: "allow-build",
    regex: /^npm\s+run\s+build(?:\s|$)/
  },
  {
    id: "allow-test",
    regex: /^npm\s+test(?:\s|$)/
  },
  {
    id: "allow-typecheck",
    regex: /^npx\s+tsc\s+--noemit(?:\s|$)/
  },
  {
    id: "allow-synth",
    regex: /^npx\s+cdk\s+synth(?:\s|$)/
  },
  {
    id: "allow-typedoc",
    regex: /^npx\s+typedoc\s+--plugin\s+typedoc-plugin-missing-exports(?:\s|$)/
  },
  {
    id: "allow-git-status",
    regex: /^git\s+status(?:\s|$)/
  },
  {
    id: "allow-git-diff",
    regex: /^git\s+diff(?:\s|$)/
  },
  {
    id: "allow-local-readonly",
    regex: /^(?:pwd|ls(?:\s|$)|rg(?:\s|$)|cat(?:\s|$))/
  }
];

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

function normalizeCommand(command) {
  if (typeof command !== "string") {
    return "";
  }

  return command.trim().replace(/\s+/g, " ").toLowerCase();
}

function getFirstString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

function getToolName(payload) {
  return getFirstString([
    payload?.toolName,
    payload?.tool?.name,
    payload?.toolCall?.name,
    payload?.hookInput?.toolName,
    payload?.hookInput?.tool?.name,
    payload?.hookInput?.toolCall?.name,
    payload?.invocation?.toolName
  ]);
}

function getToolInput(payload) {
  return (
    payload?.toolInput ??
    payload?.tool?.input ??
    payload?.toolCall?.input ??
    payload?.hookInput?.toolInput ??
    payload?.hookInput?.tool?.input ??
    payload?.hookInput?.toolCall?.input ??
    payload?.invocation?.toolInput ??
    {}
  );
}

function findCommand(input) {
  if (typeof input === "string") {
    return input;
  }

  if (!input || typeof input !== "object") {
    return "";
  }

  const direct = getFirstString([
    input.command,
    input.cmd,
    input.text,
    input.input,
    input.shellCommand,
    input?.args?.command,
    input?.arguments?.command
  ]);

  if (direct) {
    return direct;
  }

  return "";
}

function decision(permissionDecision, reason, ruleId) {
  const suffix = ruleId ? ` (rule: ${ruleId})` : "";
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision,
      permissionDecisionReason: `${reason}${suffix}`
    }
  };
}

function matchRule(command, rules) {
  for (const rule of rules) {
    if (rule.regex.test(command)) {
      return rule;
    }
  }

  return undefined;
}

async function main() {
  try {
    const raw = await readStdin();
    const payload = raw.trim() ? JSON.parse(raw) : {};
    const toolName = getToolName(payload);

    if (!toolName) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    if (TERMINAL_READ_TOOLS.has(toolName)) {
      process.stdout.write(
        JSON.stringify(
          decision("allow", "Terminal read tool allowed under workspace policy.", "allow-terminal-read")
        ) + "\n"
      );
      return;
    }

    if (toolName !== TERMINAL_EXEC_TOOL) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    const command = normalizeCommand(findCommand(getToolInput(payload)));

    if (!command) {
      process.stdout.write(
        JSON.stringify(
          decision("ask", "Terminal execution requires explicit user approval.", "ask-missing-command")
        ) + "\n"
      );
      return;
    }

    const deny = matchRule(command, denyRules);
    if (deny) {
      process.stdout.write(JSON.stringify(decision("deny", deny.reason, deny.id)) + "\n");
      return;
    }

    const allow = matchRule(command, allowRules);
    if (allow) {
      process.stdout.write(
        JSON.stringify(
          decision("allow", "Approved local validation/read-only command.", allow.id)
        ) + "\n"
      );
      return;
    }

    process.stdout.write(
      JSON.stringify(
        decision(
          "ask",
          "Command is not on the allowlist and needs explicit user approval.",
          "ask-default"
        )
      ) + "\n"
    );
  } catch (_error) {
    process.stdout.write(
      JSON.stringify(
        decision(
          "ask",
          "PreToolUse guard failed to classify command; explicit approval required.",
          "ask-guard-fallback"
        )
      ) + "\n"
    );
  }
}

main();