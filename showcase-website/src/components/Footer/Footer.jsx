import logo from '../../assets/logo.png'
import styles from './Footer.module.css'

const SECTIONS = [
  {
    title: 'Hostix',
    links: [
      { href: '#dashboard', label: 'Dashboard' },
      { href: '#finance', label: 'Finance' },
      { href: '#communication', label: 'Communication' },
      { href: '#rooms', label: 'Rooms & Students' },
    ],
  },
  {
    title: 'Stayvix',
    links: [
      { href: '#stayvix', label: 'Onboarding' },
      { href: '#expenses', label: 'Expenses' },
      { href: '#services', label: 'Services' },
      { href: '#profile', label: 'Profile' },
    ],
  },
  {
    title: 'Developer',
    links: [
      { href: '#developer', label: 'About Me' },
      { href: 'https://github.com/Durgarao9425', label: 'GitHub ↗', external: true },
      { href: 'https://www.linkedin.com/in/veeradurgarao-goriparthi-379974237', label: 'LinkedIn ↗', external: true },
      { href: 'mailto:veeradurgarao840@gmail.com', label: 'Email ↗', external: true },
    ],
  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.bgGlow} aria-hidden="true" />
      <div className="container">
        {/* Top */}
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logoRow}>
              <div className={styles.logoWrap}>
                <img src={logo} alt="Hostix" className={styles.logo} />
              </div>
              <div className={styles.brandText}>
                <span className={styles.brandName}>Hostix <span className={styles.plus}>+</span> Stayvix</span>
                <span className={styles.brandSub}>Smart PG Management System</span>
              </div>
            </div>
            <p className={styles.tagline}>
              The all-in-one operating system for modern hostels & PGs.
              Built end-to-end by{' '}
              <a href="#developer" className={styles.taglineLink}>VeeraDurgarao</a>.
            </p>
            <div className={styles.devBadge}>
              <span className={styles.devDot} />
              Full Stack Developer · React Native · Node.js
            </div>
          </div>

          <nav className={styles.linkGrid} aria-label="Footer navigation">
            {SECTIONS.map((section) => (
              <div key={section.title} className={styles.linkCol}>
                <div className={styles.linkColTitle}>{section.title}</div>
                <ul className={styles.linkList}>
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className={styles.navLink}
                        {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <span className={styles.copy}>
            © {year}{' '}
            <a href="#developer" className={styles.devLink}>VeeraDurgarao Goriparthi</a>
            . Built with ❤️ in India.
          </span>
          <span className={styles.note}>
            <span className={styles.noteDot} />
            Showcase — not a live production app.
          </span>
        </div>
      </div>
    </footer>
  )
}
