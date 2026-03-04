// lib/rateLimiter.ts

interface RateLimitInfo {
    count: number;
    lastReset: number;
}

const limits = new Map<string, RateLimitInfo>();
const MAX_EMAILS_PER_HOUR = 50;
const ONE_HOUR = 60 * 60 * 1000;

export function checkRateLimit(userEmail: string): boolean {
    const now = Date.now();
    const info = limits.get(userEmail) || { count: 0, lastReset: now };

    if (now - info.lastReset > ONE_HOUR) {
        info.count = 0;
        info.lastReset = now;
    }

    if (info.count >= MAX_EMAILS_PER_HOUR) {
        return false;
    }

    info.count += 1;
    limits.set(userEmail, info);
    return true;
}
