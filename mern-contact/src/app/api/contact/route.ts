import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import Contact from '@/models/Contact'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const contactSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.email().max(200),
    subject: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
    message: z.string().min(10).max(5000),
    website: z.string().optional() // honeypot
})

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        const { allowed } = rateLimit(ip)
        if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

        const body = await req.json()
        const parsed = contactSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', issues: z.treeifyError(parsed.error)}, { status: 400 })
        }

        // Honeypot: if field filled, likely bot
        if (parsed.data.website) {
            return NextResponse.json({ ok: true })
        }

        await connectDB()

        const doc = await Contact.create({
            name: parsed.data.name,
            email: parsed.data.email,
            subject: parsed.data.subject,
            message: parsed.data.message,
            meta: { ua: req.headers.get('user-agent') || '', ip }
        })

        return NextResponse.json({ ok: true, id: doc._id })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}