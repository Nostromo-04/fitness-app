const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

function normalizeInviteToken(value) {
  let candidate = String(value || '').trim();
  if (!candidate) return null;

  const startAppMatch = candidate.match(/[?&]startapp=([^&#\s]+)/i);
  if (startAppMatch) {
    try {
      candidate = decodeURIComponent(startAppMatch[1]);
    } catch {
      return null;
    }
  }

  if (candidate.startsWith('invite_')) candidate = candidate.slice('invite_'.length);
  return TOKEN_PATTERN.test(candidate) ? candidate : null;
}

module.exports = { normalizeInviteToken };
