import { useEffect, useRef } from 'react'
import DotCluster from '../DotCluster/DotCluster'
import Reveal from '../Reveal/Reveal'
import styles from './Hero.module.css'

const ROWS = [
  { initials: 'DG', name: 'Durgarao G', sub: 'Room 204 · Triple sharing', status: 'Paid', color: '#4f46e5' },
  { initials: 'MR', name: 'Mahindhra Reddy', sub: 'Room 106 · Rent due Jul 8', status: 'Due', color: '#f97316' },
  { initials: 'SK', name: 'Suresh Kumar', sub: 'Room 308 · Double sharing', status: 'Paid', color: '#0d9488' },
]

export default function Hero() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const COUNT = window.innerWidth < 640 ? 35 : 65
    const particles = []

    const makeParticle = () => ({
      x: Math.random() * (canvas.offsetWidth || 1200),
      y: Math.random() * (canvas.offsetHeight || 800),
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.3 + 0.08,
      hue: [238, 262, 174][Math.floor(Math.random() * 3)],
    })

    for (let i = 0; i < COUNT; i++) particles.push(makeParticle())

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 55%, ${p.alpha})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    resize(); draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <section id="top" className={styles.hero}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      {/* Gradient orbs */}
      <div className={`${styles.orb} ${styles.orbOne}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbTwo}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbThree}`} aria-hidden="true" />

      <div className={`container ${styles.grid}`}>
        {/* Left */}
        <div className={styles.textCol}>
          <Reveal>
            <span className={styles.badge}>
              <DotCluster size={16} className={styles.badgeDot} />
              One platform · Two powerful apps
            </span>
          </Reveal>

          <Reveal delay={100}>
            <h1 className={`h1 ${styles.headline}`}>
              The all-in-one{' '}
              <span className={styles.gradientText}>operating system</span>
              {' '}for modern{' '}
              <em className={styles.accentText}>hostels & PGs</em>.
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className={`body-lg ${styles.subhead}`}>
              <strong>Hostix</strong> gives owners real-time control over rooms, rent and residents.{' '}
              <strong>Stayvix</strong> gives tenants a self-service home for dues, docs and daily life.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className={styles.tags}>
              <span className={`${styles.tag} ${styles.tagHostix}`}>
                <span className={styles.tagDot} />
                Hostix — for Owners
              </span>
              <span className={`${styles.tag} ${styles.tagStayvix}`}>
                <span className={styles.tagDot} />
                Stayvix — for Tenants
              </span>
            </div>
          </Reveal>
        </div>

        {/* Right: Mock Phone */}
        <Reveal delay={250} className={styles.visualWrap}>
          <div className={styles.phoneFrame}>
            <div className={styles.notch} aria-hidden="true">
              <span className={styles.notchDot} />
            </div>

            <div className={styles.appUI}>
              <div className={styles.appHeader}>
                <div>
                  <div className={styles.appGreeting}>Good morning, Admin 👋</div>
                  <div className={styles.appName}>Venkata Sai Men's PG</div>
                </div>
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} />
                  Live
                </span>
              </div>

              <div className={styles.statRow}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Collected</div>
                  <div className={styles.statValue}>₹1.86L <small>+12%</small></div>
                  <svg className={styles.sparkline} viewBox="0 0 100 34" preserveAspectRatio="none">
                    <polyline points="0,26 15,24 30,20 45,22 60,14 75,16 100,4" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Occupancy</div>
                  <div className={styles.statValue}>92%</div>
                  <svg className={styles.sparkline} viewBox="0 0 100 34" preserveAspectRatio="none">
                    <polyline points="0,18 15,20 30,12 45,16 60,10 75,12 100,8" fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className={styles.rows}>
                {ROWS.map((row) => (
                  <div className={styles.row} key={row.name}>
                    <span className={styles.avatar} style={{ background: row.color }}>{row.initials}</span>
                    <div className={styles.rowText}>
                      <div className={styles.rowName}>{row.name}</div>
                      <div className={styles.rowSub}>{row.sub}</div>
                    </div>
                    <span className={`${styles.rowStatus} ${row.status === 'Paid' ? styles.statusPaid : styles.statusDue}`}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.homeIndicator} aria-hidden="true" />
          </div>

          <div className={styles.floatingBadge1} aria-hidden="true">
            <DotCluster size={16} />
            <span>Hostix + Stayvix synced</span>
          </div>
          <div className={styles.floatingBadge2} aria-hidden="true">
            <span className={styles.badge2Dot} />
            <span>2,400+ Active tenants</span>
          </div>
        </Reveal>
      </div>

      <div className={styles.bottomFade} aria-hidden="true" />
    </section>
  )
}
