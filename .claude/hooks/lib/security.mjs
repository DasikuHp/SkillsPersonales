// EGO OS — inward-only security gate.
// The OS may ATTACK and DEFEND, but ONLY the user's own app: localhost, loopback,
// private ranges, and hosts explicitly listed in engagement/scope.json. Any target
// outside that is a hard block. This is a non-negotiable invariant (rules/00-security-inward.md).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Commands/tools that reach out over the network or run offensive tooling.
const OFFENSIVE_HINT = /\b(nmap|masscan|sqlmap|nikto|hydra|metasploit|msfconsole|gobuster|ffuf|wpscan|nuclei|amass|subfinder|curl|wget|nc|ncat|netcat|ssh|scp|telnet|dig|nslookup|ping|traceroute)\b/i;

// Targets that are ALWAYS in-scope (the user's own machine/app).
const LOCAL_OK = /(^|[^\w.])(localhost|127\.0\.0\.1|::1|0\.0\.0\.0|\[::1\])([^\w.]|$)/i;
const PRIVATE_IP = /(^|[^\d.])(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})([^\d.]|$)/;

// Extract bare hostnames / URLs / IPs mentioned in a command string.
const HOST_RE = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?|\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?)\b/gi;

// A `name.ext` token that is really a FILENAME (not a host). Prevents false blocks on things like
// `ensure.mjs`, `package.json`, `config.yaml`. Real attack targets use domains/IPs, not these.
const FILE_EXT = /\.(mjs|cjs|js|jsx|ts|tsx|json|jsonc|md|mdx|py|pyc|rb|sh|bash|zsh|ps1|psm1|bat|cmd|exe|dll|so|dylib|a|o|c|h|hpp|hh|cpp|cc|cxx|rs|go|java|kt|kts|swift|php|pl|lua|r|scala|clj|ex|exs|erl|html?|css|scss|sass|less|ya?ml|toml|lock|log|ini|cfg|conf|env|txt|csv|tsv|xml|svg|gd|gdshader|tres|tscn|glb|gltf|png|jpe?g|gif|webp|ico|zip|tar|gz|tgz|bz2|xz|7z|rar|pdf|docx?|xlsx?|pptx?|sql|db|sqlite|bak|tmp|map|min|d\.ts)$/i;

function loadScope(cwd) {
  // scope.json lives in the project's engagement/ dir; lists the user's own authorized hosts.
  const candidates = [
    join(cwd || process.cwd(), 'engagement', 'scope.json'),
    join(cwd || process.cwd(), '.claude', 'engagement', 'scope.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const j = JSON.parse(readFileSync(p, 'utf8'));
        return Array.isArray(j.targets) ? j.targets.map(String) : [];
      } catch { /* malformed scope = empty scope */ }
    }
  }
  return [];
}

function hostInScope(host, scope) {
  const bare = host.replace(/^https?:\/\//, '').split(':')[0].toLowerCase();
  return scope.some((t) => {
    const tb = String(t).replace(/^https?:\/\//, '').split(':')[0].toLowerCase();
    return bare === tb || bare.endsWith('.' + tb);
  });
}

// Returns { block: boolean, reason: string }.
export function evaluate(command, cwd) {
  if (!command || typeof command !== 'string') return { block: false, reason: '' };
  if (!OFFENSIVE_HINT.test(command)) return { block: false, reason: '' };

  const scope = loadScope(cwd);
  const hosts = command.match(HOST_RE) || [];

  // No explicit remote host mentioned → assume local/self-directed → allow.
  if (hosts.length === 0) return { block: false, reason: '' };

  for (const h of hosts) {
    const bare = h.replace(/^https?:\/\//, '').split(':')[0];
    // A URL scheme forces host-interpretation; otherwise a filename-looking token is not a target.
    if (!/^https?:\/\//i.test(h) && FILE_EXT.test(bare)) continue;
    const isLocal = LOCAL_OK.test(h) || PRIVATE_IP.test(h);
    const inScope = hostInScope(h, scope);
    if (!isLocal && !inScope) {
      return {
        block: true,
        reason:
          `Objetivo externo bloqueado: "${h}". El SO solo puede atacar/defender tu propia app ` +
          `(localhost, redes privadas o hosts en engagement/scope.json). Añádelo a scope.json si es tuyo y autorizado.`,
      };
    }
  }
  return { block: false, reason: '' };
}
