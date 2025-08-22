import React from 'react'


export default function Footer() {
    return (
        <footer className="py-10 text-center text-sm text-neutral-500">
            © {new Date().getFullYear()} Jamilah Bello — Built with Next.js on Vercel
        </footer>
    )
}