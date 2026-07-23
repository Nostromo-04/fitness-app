const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

export function normalizeInviteToken(value: string): string | null {
  let candidate = value.trim();
  if (!candidate) return null;

  const startAppMatch = candidate.match(/[?&](?:startapp|start|invite)=([^&#\s]+)/i);
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

interface TelegramLaunchData {
  unsafeStartParam?: string;
  initData?: string;
  locationHref?: string;
}

export function resolveTelegramStartParam({
  unsafeStartParam = '',
  initData = '',
  locationHref = '',
}: TelegramLaunchData): string {
  if (unsafeStartParam) return unsafeStartParam;

  const signedStartParam = new URLSearchParams(initData).get('start_param');
  if (signedStartParam) return signedStartParam;

  if (!locationHref) return '';
  try {
    const url = new URL(locationHref);
    const queryValue = url.searchParams.get('tgWebAppStartParam')
      || url.searchParams.get('startapp')
      || url.searchParams.get('start_param')
      || url.searchParams.get('invite');
    if (queryValue) return queryValue;

    const hashParams = new URLSearchParams(url.hash.replace(/^#\/?/, ''));
    return hashParams.get('tgWebAppStartParam')
      || hashParams.get('startapp')
      || hashParams.get('start_param')
      || hashParams.get('invite')
      || '';
  } catch {
    return '';
  }
}

export function inviteLinkFromStartParam(startParam: string): string {
  const token = normalizeInviteToken(startParam);
  return token
    ? `https://t.me/kablaev_team_bot?start=invite_${token}`
    : '';
}
