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

  function redactValue(value: unknown, seen: WeakSet<object>): unknown {
    if (value === null || typeof value !== 'object') return value;

    if (seen.has(value as object)) return '[Circular]';
    seen.add(value as object);

    if (Array.isArray(value)) {
      return value.map((item) => redactValue(item, seen));
    }

    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (shouldRedact(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactValue(val, seen);
      }
    }
    return result;
  }

  function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    return redactValue(obj, new WeakSet()) as Record<string, unknown>;
  }

  return redactObject;
}

export function getDefaultRedactor(): (data: Record<string, unknown>) => Record<string, unknown> {
  return createRedactor(DEFAULT_PATTERNS);
}
