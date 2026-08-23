'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { MetallicRigBaseWordmark } from '@/components/brand/brand-mark'

const NAV_LINKS = [
  { href: '#modules', label: 'Modules' },
  { href: '#platform', label: 'Platform' },
  { href: '#approach', label: 'Approach' },
] as const

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 sm:px-6 pt-4 sm:pt-5 pointer-events-none">
      <div
        className={`max-w-7xl mx-auto rounded-xl transition-all duration-300 pointer-events-auto ${
          scrolled
            ? 'border border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)]'
            : 'border border-transparent bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-4 sm:px-5 h-[4.25rem]">
          <Link
            href="/"
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 group"
            aria-label="Rig Base home"
          >
            <span className="flex items-center justify-center h-9 w-9 shrink-0">
              <Logo variant="mark" size="sm" priority />
            </span>
            <MetallicRigBaseWordmark />
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
            <nav className="hidden md:flex items-center" aria-label="Primary">
              <ul className="flex items-center gap-0.5">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium text-white/55 rounded-md hover:text-white/90 transition-colors duration-200 whitespace-nowrap"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <span className="hidden md:block w-px h-4 bg-white/10 mx-1" aria-hidden />

            <Link
              href="/auth/login"
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-white/55 hover:text-white/90 transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="marketing-btn-primary marketing-btn-primary-shadow inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              Get started
              <ArrowRight size={15} strokeWidth={2} className="hidden sm:block" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
