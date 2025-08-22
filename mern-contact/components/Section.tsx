import React from 'react'


export default function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="my-10">
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            <div className="card p-6">{children}</div>
        </section>
    )
}