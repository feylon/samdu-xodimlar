const SENSITIVE_KEYS = new Set(['password', 'newPassword', 'currentPassword', 'confirmPassword', 'refreshToken', 'accessToken', 'passwordHash']);

export const sanitizePayload = (value: unknown, depth = 0): unknown => {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizePayload(item, depth + 1));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitizePayload(inner, depth + 1);
    }
    return result;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
};
