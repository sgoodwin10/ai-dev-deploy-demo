// Best-effort secret scrubbing for anything published to the public site.
const PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{10,}/g,               // Anthropic keys
  /github_pat_[A-Za-z0-9_]{20,}/g,            // fine-grained PATs
  /gh[pousr]_[A-Za-z0-9]{20,}/g,              // classic GitHub tokens
  /\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g,         // Telegram bot tokens
  /(authorization|bearer|token|api[_-]?key|secret|password)(["'\s:=]+)[^\s"'&]{8,}/gi,
  /x-access-token:[^@\s]+@/g,
];

export function redact(s) {
  let out = String(s ?? '');
  for (const p of PATTERNS) {
    out = out.replace(p, (m, k, sep) => (k && sep !== undefined && /[a-z]/i.test(k) ? `${k}${sep}[redacted]` : '[redacted]'));
  }
  return out;
}

export function clip(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
