// Simple in-memory rate limit per IP (ok for demo; use Upstash/Redis in prod)
const WINDOW_MS = 60_000 // 1 minute
const MAX_REQ = 10

const hits = new Map<string, { count: number; ts: number }>()

export function rateLimit(ip: string) {
    const now = Date.now()
    const mappedHits = hits.get(ip)
    if (!mappedHits || now - mappedHits.ts > WINDOW_MS) {
        hits.set(ip, { count: 1, ts: now })
        return { allowed: true }
    }
    mappedHits.count += 1
    if (mappedHits.count > MAX_REQ) return { allowed: false }
    return { allowed: true }
}