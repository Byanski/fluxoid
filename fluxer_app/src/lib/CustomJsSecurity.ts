/**
 * CustomJsSecurity - Static analysis for user-provided custom JS.
 * Blocks clearly malicious patterns before execution.
 */

export interface SecurityScanResult {
	safe: boolean;
	warnings: string[];
	blocked: boolean;
	blockReason?: string;
	permissions: Permission[];
}

export interface Permission {
	label: string;
	type: 'safe' | 'warn' | 'danger';
}

const MAX_SCRIPT_SIZE = 50_000; // 50kb

// ─── Block Patterns ───────────────────────────────────────────────────────────

const BLOCK_PATTERNS: Array<{pattern: RegExp; reason: string}> = [
	// Credential theft
	{pattern: /document\.cookie/gi, reason: 'Accesses document cookies (credential theft)'},
	{pattern: /localStorage\s*\.\s*getItem|sessionStorage\s*\.\s*getItem/gi, reason: 'Reads storage (credential theft)'},
	{pattern: /indexedDB/gi, reason: 'Accesses IndexedDB (credential theft)'},

	// Electron / Node.js filesystem & shell — CRITICAL
	{pattern: /require\s*\(\s*['"`]fs['"`]\s*\)/gi, reason: 'Accesses Node.js filesystem (critical — can delete files)'},
	{pattern: /require\s*\(\s*['"`]child_process['"`]\s*\)/gi, reason: 'Accesses child_process (critical — can run shell commands)'},
	{pattern: /require\s*\(\s*['"`]os['"`]\s*\)/gi, reason: 'Accesses Node.js OS module'},
	{pattern: /require\s*\(\s*['"`]path['"`]\s*\)/gi, reason: 'Accesses Node.js path module'},
	{pattern: /process\s*\.\s*env/gi, reason: 'Accesses environment variables (credential theft)'},
	{pattern: /process\s*\.\s*exit/gi, reason: 'Calls process.exit (can crash the app)'},
	{pattern: /global\s*\.\s*require/gi, reason: 'Accesses global require (Node.js escape)'},
	{pattern: /window\s*\.\s*require/gi, reason: 'Accesses window.require (Electron Node.js escape)'},
	{pattern: /__dirname|__filename/gi, reason: 'Accesses Node.js path globals'},
	{pattern: /shell\s*\.\s*exec|child\.exec|spawnSync|execSync/gi, reason: 'Executes shell commands'},

	// Crypto miners
	{pattern: /new\s+Worker\s*\(|new\s+SharedWorker\s*\(/gi, reason: 'Creates background workers (potential crypto miner)'},
	{pattern: /WebAssembly/gi, reason: 'Uses WebAssembly (potential crypto miner)'},

	// Exfiltration
	{pattern: /navigator\s*\.\s*sendBeacon/gi, reason: 'Uses sendBeacon to exfiltrate data'},

	// Infinite loops — static detection
	{pattern: /while\s*\(\s*true\s*\)|while\s*\(\s*1\s*\)|for\s*\(\s*;;\s*\)/gi, reason: 'Contains infinite loop (CPU abuse)'},

	// Obfuscation — block heavily obfuscated code
	{pattern: /(?:\\x[0-9a-f]{2}){20,}/gi, reason: 'Contains heavily hex-obfuscated code (potentially malicious)'},
	{pattern: /(?:\\u[0-9a-f]{4}){15,}/gi, reason: 'Contains heavily unicode-obfuscated code (potentially malicious)'},
	{pattern: /eval\s*\(\s*(?:atob|unescape|decodeURI)/gi, reason: 'Executes obfuscated/encoded code via eval'},
	{pattern: /\]\s*\(\s*\)\s*\(\s*\)|\]\s*\[\s*['"`]\w+['"`]\s*\]\s*\(/, reason: 'Uses array-based obfuscation pattern'},
];

// ─── Warn Patterns ────────────────────────────────────────────────────────────

const WARN_PATTERNS: Array<{pattern: RegExp; warning: string}> = [
	{pattern: /fetch\s*\(/gi, warning: 'Makes network requests via fetch'},
	{pattern: /new\s+XMLHttpRequest/gi, warning: 'Makes outbound HTTP requests'},
	{pattern: /window\s*\.\s*open\s*\(/gi, warning: 'Opens new browser windows'},
	{pattern: /eval\s*\(/gi, warning: 'Uses eval() — executes dynamic code'},
	{pattern: /Function\s*\(\s*['"`]/gi, warning: 'Uses Function constructor — executes dynamic code'},
	{pattern: /new\s+MutationObserver/gi, warning: 'Observes DOM mutations'},
	{pattern: /setInterval\s*\(/gi, warning: 'Uses setInterval (repeated execution)'},
	{pattern: /document\s*\.\s*querySelector|document\s*\.\s*getElementById/gi, warning: 'Modifies the UI'},
	{pattern: /new\s+AudioContext|AudioContext/gi, warning: 'Plays audio'},
	{pattern: /window\s*\.\s*Notification/gi, warning: 'Intercepts notifications'},
];

// ─── Permission Inference ─────────────────────────────────────────────────────

function inferPermissions(code: string): Permission[] {
	const perms: Permission[] = [];

	if (/document\s*\.\s*querySelector|document\s*\.\s*getElementById|innerHTML|style\s*\./gi.test(code))
		perms.push({label: 'Modify UI', type: 'safe'});

	if (/new\s+AudioContext|AudioContext|createOscillator|createBufferSource/gi.test(code))
		perms.push({label: 'Play sounds', type: 'safe'});

	if (/fetch\s*\(|new\s+XMLHttpRequest|\.open\s*\(/gi.test(code))
		perms.push({label: 'Send network requests', type: 'warn'});

	if (/window\s*\.\s*Notification/gi.test(code))
		perms.push({label: 'Intercept notifications', type: 'warn'});

	if (/eval\s*\(|Function\s*\(\s*['"`]/gi.test(code))
		perms.push({label: 'Run dynamic code', type: 'warn'});

	if (/new\s+MutationObserver/gi.test(code))
		perms.push({label: 'Watch DOM changes', type: 'safe'});

	if (/setInterval\s*\(/gi.test(code))
		perms.push({label: 'Repeated background execution', type: 'warn'});

	if (/document\s*\.\s*addEventListener|window\s*\.\s*addEventListener/gi.test(code))
		perms.push({label: 'Listen to user input events', type: 'safe'});

	return perms;
}

// ─── Obfuscation Detection ────────────────────────────────────────────────────

function detectObfuscation(code: string): string | null {
	// Very long lines with no whitespace suggest minified/obfuscated code
	const lines = code.split('\n');
	for (const line of lines) {
		if (line.length > 500 && !/https?:\/\//.test(line)) {
			return 'Contains suspiciously long single-line code (possible obfuscation)';
		}
	}

	// High ratio of non-alphanumeric chars
	const nonAlpha = (code.match(/[^a-zA-Z0-9\s]/g) ?? []).length;
	if (nonAlpha / code.length > 0.4 && code.length > 200) {
		return 'Unusually high density of special characters (possible obfuscation)';
	}

	return null;
}

// ─── Dangerous Globals Shadowing ──────────────────────────────────────────────

export function buildSafeWrapper(code: string): string {
	// Shadow dangerous Node/Electron globals before running user code
	return `(function() {
  var require = undefined;
  var process = undefined;
  var global = undefined;
  var __dirname = undefined;
  var __filename = undefined;
  var module = undefined;
  var exports = undefined;
  var Buffer = undefined;
  ${code}
})();`;
}

// ─── DOM Mutation Rate Limiter ─────────────────────────────────────────────────

export const MUTATION_OBSERVER_GUARD = `
(function() {
  const _MutationObserver = window.MutationObserver;
  let _mutationCount = 0;
  let _mutationWindow = Date.now();
  window.MutationObserver = function(callback) {
    return new _MutationObserver((mutations, observer) => {
      const now = Date.now();
      if (now - _mutationWindow > 1000) { _mutationCount = 0; _mutationWindow = now; }
      _mutationCount += mutations.length;
      if (_mutationCount > 500) {
        observer.disconnect();
        console.warn('[Fluxoid] Custom JS MutationObserver disconnected: too many mutations (>500/sec)');
        return;
      }
      callback(mutations, observer);
    });
  };
})();
`;

// ─── Main Scanner ─────────────────────────────────────────────────────────────

export function scanCustomJs(code: string): SecurityScanResult {
	const warnings: string[] = [];

	if (!code || !code.trim()) {
		return {safe: true, warnings: [], blocked: false, permissions: []};
	}

	if (code.length > MAX_SCRIPT_SIZE) {
		return {
			safe: false,
			warnings: [],
			blocked: true,
			blockReason: `Script exceeds maximum allowed size of ${MAX_SCRIPT_SIZE / 1000}kb`,
			permissions: [],
		};
	}

	// Obfuscation check
	const obfuscationReason = detectObfuscation(code);
	if (obfuscationReason) {
		return {
			safe: false,
			warnings: [],
			blocked: true,
			blockReason: obfuscationReason,
			permissions: [],
		};
	}

	// Hard blocks
	for (const {pattern, reason} of BLOCK_PATTERNS) {
		pattern.lastIndex = 0;
		if (pattern.test(code)) {
			return {
				safe: false,
				warnings: [],
				blocked: true,
				blockReason: reason,
				permissions: [],
			};
		}
	}

	// Warnings
	for (const {pattern, warning} of WARN_PATTERNS) {
		pattern.lastIndex = 0;
		if (pattern.test(code)) {
			warnings.push(warning);
		}
	}

	const permissions = inferPermissions(code);

	return {
		safe: warnings.length === 0,
		warnings,
		blocked: false,
		permissions,
	};
}
