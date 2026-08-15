import { useEffect, useState } from 'react'
import logo from '../../assets/logo.png'
import styles from './Header.module.css'

const LINKS = [
  { href: '#top', label: 'Home' },
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#finance', label: 'Finance' },
  { href: '#communication', label: 'Comms' },
  { href: '#stayvix', label: 'Stayvix' },
  { href: '#expenses', label: 'Expenses' },
  { href: '#developer', label: 'Developer' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('#top')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 860) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const closeMenu = (href) => {
    setOpen(false)
    setActive(href)
  }

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      {/* Animated gradient line at top */}
      <div className={styles.topLine} aria-hidden="true" />

      <div className={`container ${styles.bar}`}>
        <a href="#top" className={styles.brand} aria-label="Hostix home">
          <div className={styles.logoWrap}>
            <img src={logo} alt="Hostix" className={styles.mark} />
          </div>
          <div className={styles.wordmarkGroup}>
            <span className={styles.wordmark}>Hostix</span>
            <span className={styles.wordmarkSub}>Smart PG Manager</span>
          </div>
        </a>

        <nav className={styles.nav} aria-label="Section navigation">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${active === link.href ? styles.navActive : ''}`}
              onClick={() => setActive(link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <a href="#developer" className={styles.ctaBtn}>
            <span>Contact</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>

          <button
            type="button"
            className={`${styles.menuBtn} ${open ? styles.menuOpen : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={styles.burger}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className={styles.mobileOverlay} onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <div className={`${styles.mobileNav} ${open ? styles.mobileNavOpen : ''}`}>
        <div className={styles.mobileNavInner}>
          {LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => closeMenu(link.href)}
              style={{ transitionDelay: open ? `${i * 50}ms` : '0ms' }}
            >
              <span className={styles.mobileLinkNum}>0{i + 1}</span>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  )
}
