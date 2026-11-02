import type { RequestHandler } from 'express';
import { isIP } from 'node:net';

/**
 * Who may use the API. The server holds the provider key, so every /api and /gallery route answers
 * only to requests whose Host names this machine: loopback, the names in CONJURE_ALLOWED_HOSTS and a
 * specific CONJURE_HOST address. A stranger on the network sending its own Host, or a DNS-rebinding
 * page whose Host and Origin agree with each other but not with this list, is refused. When a
 * browser sends an Origin it must name the very host it asked, as before. A Host that is a bare IP
 * address is accepted, as Vite accepts it for the page: a rebinding page cannot make a browser send one.
 */
const LOOPBACK = ['localhost', '127.0.0.1', '::1'];
const EVERYWHERE = ['0.0.0.0', '::', '[::]'];

export function allowedHosts(env: NodeJS.ProcessEnv): Set<string> {
  const hosts = new Set(LOOPBACK);
  for (const host of (env.CONJURE_ALLOWED_HOSTS ?? '').split(',')) if (host.trim()) hosts.add(host.trim().toLowerCase().replace(/^\[|\]$/g, ''));
  const bound = env.CONJURE_HOST?.trim().toLowerCase();
  if (bound && !EVERYWHERE.includes(bound)) hosts.add(bound.replace(/^\[|\]$/g, ''));
  return hosts;
}

/** The hostname of a Host or Origin header value, lower case, without port or IPv6 brackets; null when it does not parse. */
export function hostnameOf(value: string | undefined): string | null {
  if (!value) return null;
  const url = value.includes('://') ? value : `http://${value}`;
  if (!URL.canParse(url)) return null;
  return new URL(url).hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

export function hostAllowed(host: string | undefined, allowed: Set<string>): boolean {
  const name = hostnameOf(host);
  return name !== null && (allowed.has(name) || isIP(name) !== 0);
}

/** Browsers send Origin on cross-site requests and on POSTs; when present it must name the host that was asked. */
export function originAllowed(origin: string | undefined, host: string | undefined): boolean {
  return !origin || (URL.canParse(origin) && new URL(origin).host === host);
}

export function apiGuard(allowed: Set<string>): RequestHandler {
  return (request, response, next) => {
    if (!hostAllowed(request.headers.host, allowed)) {
      response.status(403).json({ error: `This server does not answer to "${request.headers.host ?? ''}". Add that name to CONJURE_ALLOWED_HOSTS.` });
      return;
    }
    if (!originAllowed(request.headers.origin, request.headers.host)) {
      response.status(403).json({ error: 'Requests must come from this application.' });
      return;
    }
    next();
  };
}
