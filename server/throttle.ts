// Auth-path throttle keyed by client address.
// Forwarded / X-Forwarded-For are honored only when
// socket.remoteAddress is a TRUSTED_PROXY_HOPS hop.

const AUTH_THROTTLE_LIMIT = 5;
const AUTH_THROTTLE_WINDOW_MS = 60_000;

const AUTH_PATHS: ReadonlySet<string> = new Set([
    '/authentication/token',
    '/authentication/authorize',
]);

const IPV4_MAPPED =
    /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

export function isAuthThrottlePath(pathname: string): boolean {
    return AUTH_PATHS.has(pathname);
}

export type AuthThrottle = {
    limited(
        remoteAddress: string | undefined,
        forwarded: string | undefined,
        xForwardedFor: string | undefined,
    ): boolean;
};

function normalizeAddress(address: string): string {
    const trimmed = address.trim();
    const mapped = IPV4_MAPPED.exec(trimmed);
    const ipv4 = mapped?.[1];
    if (ipv4 !== undefined) return ipv4;
    return trimmed;
}

function parseTrustedHops(
    raw: string | undefined,
): ReadonlySet<string> {
    if (raw === undefined || raw === '') return new Set();
    const hops = new Set<string>();
    for (const part of raw.split(',')) {
        const hop = normalizeAddress(part);
        if (hop !== '') hops.add(hop);
    }
    return hops;
}

function unquote(value: string): string {
    if (value.length >= 2
        && value.startsWith('"')
        && value.endsWith('"')) {
        return value.slice(1, -1);
    }
    return value;
}

function stripHostPort(value: string): string {
    if (value.startsWith('[')) {
        const end = value.indexOf(']');
        if (end !== -1) return value.slice(1, end);
    }
    const colon = value.lastIndexOf(':');
    if (colon !== -1 && value.indexOf(':') === colon) {
        return value.slice(0, colon);
    }
    return value;
}

function forwardedClient(
    raw: string,
): string | undefined {
    const first = raw.split(',')[0];
    if (first === undefined) return undefined;
    for (const param of first.split(';')) {
        const trimmed = param.trim();
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const name = trimmed.slice(0, eq).trim();
        if (name.toLowerCase() !== 'for') continue;
        const host = stripHostPort(
            unquote(trimmed.slice(eq + 1).trim()),
        );
        const address = normalizeAddress(host);
        return address === '' ? undefined : address;
    }
    return undefined;
}

function xForwardedForClient(
    raw: string,
): string | undefined {
    const first = raw.split(',')[0];
    if (first === undefined) return undefined;
    const address = normalizeAddress(first);
    return address === '' ? undefined : address;
}

function clientAddress(
    remoteAddress: string | undefined,
    forwarded: string | undefined,
    xForwardedFor: string | undefined,
    hops: ReadonlySet<string>,
): string {
    const remote = remoteAddress === undefined
        ? ''
        : normalizeAddress(remoteAddress);
    if (remote !== '' && hops.has(remote)) {
        if (forwarded !== undefined) {
            const fromFwd = forwardedClient(forwarded);
            if (fromFwd !== undefined) return fromFwd;
        }
        if (xForwardedFor !== undefined) {
            const fromXff = xForwardedForClient(
                xForwardedFor,
            );
            if (fromXff !== undefined) return fromXff;
        }
    }
    return remote;
}

export function createAuthThrottle(
    trustedProxyHops?: string,
): AuthThrottle {
    const hops = parseTrustedHops(trustedProxyHops);
    const hits = new Map<string, number[]>();
    return {
        limited(remoteAddress, forwarded, xForwardedFor) {
            const address = clientAddress(
                remoteAddress,
                forwarded,
                xForwardedFor,
                hops,
            );
            const now = Date.now();
            const start = now - AUTH_THROTTLE_WINDOW_MS;
            const prior = hits.get(address) ?? [];
            const recent = prior.filter((at) => at > start);
            if (recent.length >= AUTH_THROTTLE_LIMIT) {
                hits.set(address, recent);
                return true;
            }
            recent.push(now);
            hits.set(address, recent);
            return false;
        },
    };
}
