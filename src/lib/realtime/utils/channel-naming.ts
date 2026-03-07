export function buildChannelName(companyId: string, feature: string): string {
  return `company:${companyId}:${feature}`;
}

export function parseChannelName(channel: string): {
  companyId: string;
  feature: string;
} | null {
  const match = channel.match(/^company:([^:]+):(.+)$/);
  if (!match) return null;
  return { companyId: match[1], feature: match[2] };
}

export function validateChannelAccess(
  channel: string,
  companyId: string,
): boolean {
  const parsed = parseChannelName(channel);
  return parsed !== null && parsed.companyId === companyId;
}
