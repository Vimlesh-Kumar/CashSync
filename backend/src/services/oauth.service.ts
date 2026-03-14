import crypto from 'node:crypto';

export type OAuthProvider = 'GOOGLE' | 'APPLE';

export interface VerifiedOAuthIdentity {
    provider: OAuthProvider;
    providerUserId: string;
    email?: string;
    emailVerified: boolean;
    name?: string;
    avatarUrl?: string;
}

type AppleJwk = {
    kty: string;
    kid: string;
    use: string;
    alg: string;
    n: string;
    e: string;
};

type AppleJwksResponse = {
    keys: AppleJwk[];
};

let appleKeysCache: { expiresAt: number; keys: AppleJwk[] } | null = null;

type HttpError = Error & { status: number };

function createHttpError(status: number, message: string): HttpError {
    const error = new Error(message) as HttpError;
    error.status = status;
    return error;
}

function parseAudience(envName: string, fallbackEnvName?: string): string[] {
    const primary = process.env[envName]?.trim();
    const fallback = fallbackEnvName ? process.env[fallbackEnvName]?.trim() : '';
    const raw = primary || fallback || '';
    if (!raw) return [];
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function decodeBase64Url(value: string): Buffer {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Buffer.from(padded, 'base64');
}

function decodeJwt(token: string) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw createHttpError(400, 'Invalid OAuth token format.');
    }

    const [headerRaw, payloadRaw, signatureRaw] = parts;
    const header = JSON.parse(decodeBase64Url(headerRaw).toString('utf8')) as Record<string, any>;
    const payload = JSON.parse(decodeBase64Url(payloadRaw).toString('utf8')) as Record<string, any>;

    return {
        header,
        payload,
        signature: decodeBase64Url(signatureRaw),
        signingInput: Buffer.from(`${headerRaw}.${payloadRaw}`, 'utf8'),
    };
}

function validateAud(aud: string | string[] | undefined, allowed: string[]) {
    if (!allowed.length || !aud) return;
    const audiences = Array.isArray(aud) ? aud : [aud];
    const ok = audiences.some((a) => allowed.includes(a));
    if (!ok) {
        throw createHttpError(401, 'OAuth token audience does not match this app.');
    }
}

async function getAppleKeys(): Promise<AppleJwk[]> {
    const now = Date.now();
    if (appleKeysCache && appleKeysCache.expiresAt > now) {
        return appleKeysCache.keys;
    }

    const res = await fetch('https://appleid.apple.com/auth/keys');
    if (!res.ok) {
        throw createHttpError(502, 'Failed to fetch Apple signing keys.');
    }

    const body = (await res.json()) as AppleJwksResponse;
    appleKeysCache = {
        keys: body.keys || [],
        expiresAt: now + 1000 * 60 * 60,
    };

    return appleKeysCache.keys;
}

async function verifyAppleIdToken(idToken: string): Promise<VerifiedOAuthIdentity> {
    const { header, payload, signature, signingInput } = decodeJwt(idToken);

    if (payload.iss !== 'https://appleid.apple.com') {
        throw createHttpError(401, 'Invalid Apple token issuer.');
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowSec) {
        throw createHttpError(401, 'Apple token is expired.');
    }

    const appleAud = parseAudience('APPLE_CLIENT_IDS', 'APPLE_CLIENT_ID');
    validateAud(payload.aud, appleAud);

    const keys = await getAppleKeys();
    const jwk = keys.find((k) => k.kid === header.kid && k.alg === (header.alg as string));
    if (!jwk) {
        throw createHttpError(401, 'Unable to match Apple signing key.');
    }

    const publicKey = crypto.createPublicKey({
        key: {
            kty: jwk.kty,
            n: jwk.n,
            e: jwk.e,
        },
        format: 'jwk',
    });

    const valid = crypto.verify('RSA-SHA256', signingInput, publicKey, signature);
    if (!valid) {
        throw createHttpError(401, 'Apple token signature verification failed.');
    }

    return {
        provider: 'APPLE',
        providerUserId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    };
}

async function verifyGoogleIdToken(idToken: string): Promise<VerifiedOAuthIdentity> {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    const payload = (await res.json()) as Record<string, string>;

    if (!res.ok || payload.error_description) {
        throw createHttpError(401, payload.error_description || 'Invalid Google token.');
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const exp = Number(payload.exp ?? '0');
    if (!exp || exp < nowSec) {
        throw createHttpError(401, 'Google token is expired.');
    }

    const googleAud = parseAudience('GOOGLE_CLIENT_IDS', 'GOOGLE_CLIENT_ID');
    validateAud(payload.aud, googleAud);

    return {
        provider: 'GOOGLE',
        providerUserId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === 'true',
        name: payload.name,
        avatarUrl: payload.picture,
    };
}

export const oauthService = {
    async verify(provider: OAuthProvider, idToken: string): Promise<VerifiedOAuthIdentity> {
        if (provider === 'GOOGLE') {
            return verifyGoogleIdToken(idToken);
        }
        return verifyAppleIdToken(idToken);
    },
};
