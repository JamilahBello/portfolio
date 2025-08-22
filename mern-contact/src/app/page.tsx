'use client'
import React, { useState } from 'react'
import Container from '@/components/Container'
import Section from '@/components/Section'
import Footer from '@/components/Footer'

export default function Page() {
  return (
    <Container>
      <header className="pt-10">
        <h1 className="text-3xl font-extrabold">Jamilah Bello</h1>
        <p className="text-neutral-600 mt-1">Computer Scientist | Software Engineer – React • Node • Next.js</p>
        <nav className="mt-6 flex gap-3 text-sm">
          <a href="#about" className="underline">About</a>
          <a href="#skills" className="underline">Skills</a>
          <a href="#resume" className="underline">Resume</a>
          <a href="#contact" className="underline">Contact</a>
        </nav>
      </header>


      <Section id="about" title="About">
        <p>
          Dynamic Software Engineer with 5+ years building and maintaining scalable web apps across fintech, blockchain, and e‑commerce. I focus on clean architecture, testing, documentation, and user‑centered delivery.
        </p>
      </Section>


      <Section id="skills" title="Skills">
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {['JavaScript', 'Angular','TypeScript','React','React Native','Next.js','Node.js','Express.js','MongoDB','PHP','Laravel', 'Symfony','MySQL','Git'].map(s => (
          <li key={s} className="rounded-lg border px-3 py-2">{s}</li>
          ))}
        </ul>
      </Section>

      <Section id="resume" title="Resume">
        <div className="flex items-center justify-between gap-4">
          <p>View or download my full resume (PDF).</p>
          <a href="/resume-jamilah.pdf" target="_blank" className="btn-primary">Open Resume</a>
        </div>
        <div className="mt-6 grid gap-2 text-sm">
          <div className="rounded-lg border p-3">
          <div className="font-semibold">Software Engineer — Elite Resources and Requisition (Brisbane) — 01/2025 – Present</div>
            <ul className="list-disc pl-5">
              <li>Engineered a robust e‑commerce backend with Express, MongoDB, and Next.js.</li>
              <li>Implemented secure auth and RBAC; strengthened validation and modular architecture.</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3">
          <div className="font-semibold">Software Engineer — Funding.com.au (Gold Coast) — 07/2023 – 01/2025</div>
            <ul className="list-disc pl-5">
              <li>Enhanced a real‑estate investment platform with React and PHP.</li>
              <li>Drove documentation and release readiness across sprints.</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3">
          <div className="font-semibold">Software Engineer — Labrys Group (Brisbane) — 02/2022 – 07/2023</div>
            <ul className="list-disc pl-5">
              <li>Built dynamic UIs in React/Next.js; integrated smart‑contract UIs.</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3">
          <div className="font-semibold">Software Developer — Itex Integrated Services (Lagos) — 04/2018 – 05/2021</div>
            <ul className="list-disc pl-5">
              <li>Contributed to the TrackMoney platform using Angular and Node.js.</li>
            </ul>
          </div>
        </div>
      </Section>

        <Section id="projects" title="Projects">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: 'E‑commerce Platform Backend',
              stack: 'Express • MongoDB • Next.js',
              desc: 'Modular architecture with RBAC, validation, and CI.',
              link: undefined
            },
            {
              title: 'Real‑Estate Investment Features',
              stack: 'React • PHP',
              desc: 'Refactors and new features with strong release documentation and QA.',
              link: undefined
            },
            {
              title: 'CSENS — Sustainable Commerce',
              stack: 'React Native • Node • Solidity • Web3',
              desc: 'At Labrys, contributed to delivery across mobile app + blockchain integrations and core infrastructure components for an eco‑conscious payments suite (merchant facility, app, Visa card).',
              link: undefined
            },
            {
              title: 'Cloud9 — Web3 Components (Client Engagement)',
              stack: 'React • Next.js • dApp UX',
              desc: 'Supported Labrys team on Web3 product components and wallet UX for client initiatives; modular front‑end and integration support.',
              link: undefined
            },
            {
              title: 'Carbon Offsetting Platform',
              stack: 'Next.js • Web3 • ERC‑20 • dApp',
              desc: 'Contributed to ERC‑20 flows (connect wallet, balances, transfers), sustainability shopping journeys, and Web3 call reliability for a carbon‑offsetting loyalty platform.',
              link: undefined
            },
            {
              title: 'Token Integration UX',
              stack: 'Next.js • Web3 • Payments • dApp',
              desc: 'Built token showcase and purchase UX with on‑ramp hooks; emphasized chain status, balances, and purchase CTAs',
              link: undefined
            },
            {
              title: 'EarthFund — DAO Platform',
              stack: 'Smart Contracts • dApp • Gnosis Safe • Snapshot',
              desc: 'At Labrys, collaborated on dApp integrations to governance & staking contracts; implemented ERC‑20 handling and Snapshot/Safe bridges.',
              link: undefined
            }
            ].map((project) => (
              <a key={project.title} className="rounded-2xl border p-4 hover:shadow-md transition">
                <div className="font-semibold">{project.title}</div>
                <div className="text-xs text-neutral-600">{project.stack}</div>
                <p className="mt-2 text-sm">{project.desc}</p>
              </a>
          ))}
        </div>
      </Section>


      <Section id="contact" title="Contact Me">
        <ContactForm />
          <div className="mt-4 text-sm text-neutral-600">
            Or email me at <a className="underline" href="mailto:jamilahbello@outlook.com">jamilahbello@outlook.com</a> connect on <a className="underline" href="https://www.linkedin.com/in/jamilah-b-994b9b227/" target="_blank">LinkedIn</a> and view code on <a className="underline" href="https://github.com/jamilahbello/portfolio" target="_blank">GitHub</a>.
          </div>
      </Section>

      <Footer />
    </Container>
  )
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ ok?: boolean; error?: string } | null>(null)


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
      setStatus({ ok: true })
      setForm({ name: '', email: '', subject: '', message: '', website: '' })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStatus({ error: err.message })
      } else {
        setStatus({ error: 'Unknown error' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot */}
      <input type="text" name="website" aria-hidden="true" tabIndex={-1} autoComplete="off" className="hidden" value={form.website}
      onChange={(e) => setForm({ ...form, website: e.target.value })}
      />

      <div>
        <label className="label">Name</label>
        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} />
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div>
        <label className="label">Subject (optional)</label>
        <input className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
      </div>
      <div>
        <label className="label">Message</label>
        <textarea className="input min-h-[140px]" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required minLength={10} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Sending…' : 'Send'}</button>
        {status?.ok && <span className="text-green-700">Thanks! I’ll get back to you soon.</span>}
        {status?.error && <span className="text-red-700">{status.error}</span>}
      </div>
    </form>
  )
}