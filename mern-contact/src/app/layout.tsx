import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Jamilah Bello – Computer Scientist |Software Engineer',
  description: 'Portfolio, resume, skills, and contact for software engineer Jamilah Bello.',
  metadataBase: new URL('https://your-vercel-domain.vercel.app'),
  openGraph: {
  title: 'Jamilah Bello – Computer Scientist | Software Engineer',
  description: 'MERN-Stack Developer',
  url: '/',
  siteName: 'Jamilah Bello',
  type: 'website'
}
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
