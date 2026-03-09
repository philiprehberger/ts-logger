const DEFAULT_PATTERNS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'key',
  'credential',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'private_key',
];

export function createRedactor(patterns: string[]): (data: Record<string, unknown>) => Record<string, unknown> {
  const lowerPatterns = patterns.map((p) => p.toLowerCase());

  function shouldRedact(key: string): boolean {
    const lower = key.toLowerCase();
    return lowerPatterns.some((p) => lower.includes(p));
  }

  function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (shouldRedact(key)) {
        result[key] = '[REDACTED]';
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = redactObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return redactObject;
}

export function getDefaultRedactor(): (data: Record<string, unknown>) => Record<string, unknown> {
  return createRedactor(DEFAULT_PATTERNS);
}
