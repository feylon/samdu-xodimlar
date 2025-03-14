import { Request } from 'express';
import { UAParser } from 'ua-parser-js';

export interface RequestMeta {
  ip: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
}

const firstForwarded = (value: string | string[] | undefined): string | undefined => {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw.split(',')[0]?.trim();
};

export const extractRequestMeta = (request: Request): RequestMeta => {
  const userAgent = request.headers['user-agent'] ?? 'unknown';
  const parsed = UAParser(userAgent);
  const deviceParts = [parsed.device.vendor, parsed.device.model].filter(Boolean);
  return {
    ip: firstForwarded(request.headers['x-forwarded-for']) ?? request.ip ?? request.socket?.remoteAddress ?? 'unknown',
    userAgent,
    device: deviceParts.length ? deviceParts.join(' ') : parsed.device.type ?? 'desktop',
    browser: [parsed.browser.name, parsed.browser.version].filter(Boolean).join(' ') || 'unknown',
    os: [parsed.os.name, parsed.os.version].filter(Boolean).join(' ') || 'unknown',
  };
};
