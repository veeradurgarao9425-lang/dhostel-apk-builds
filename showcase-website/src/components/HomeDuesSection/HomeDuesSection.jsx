import DotCluster from '../DotCluster/DotCluster'
import Reveal from '../Reveal/Reveal'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './HomeDuesSection.module.css'

const BULLETS = [
  { title: 'Room & rent summary, at a glance', desc: 'One card shows your room, plan and what’s due — no digging required.' },
  { title: 'Monthly fee breakdown', desc: 'See exactly what makes up your bill: rent, food, maintenance and more.' },
  { title: 'Full payment history & receipts', desc: 'Every past payment, downloadable as a receipt whenever you need it.' },
]

const BREAKDOWN = [
  { label: 'Rent', pct: 70, value: '₹5,600', color: 'var(--stayvix-purple)' },
  { label: 'Food', pct: 46, value: '₹2,400', color: 'var(--hostix-teal)' },
  { label: 'Electricity', pct: 22, value: '₹450', color: 'var(--hostix-orange)' },
]

const HISTORY = [
  { month: 'June 2026', meta: 'Paid on Jun 4' },
  { month: 'May 2026', meta: 'Paid on May 3' },
]

export default function HomeDuesSection() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.grid}`}>
        <div>
          <SectionHeading
            eyebrow="Stayvix · Home"
            eyebrowColor="var(--stayvix-purple)"
            title="Your room and rent, always at a glance."
          />
          <ul className={styles.bullets}>
            {BULLETS.map((b, i) => (
              <Reveal as="li" key={b.title} className={styles.bullet} delay={120 + i * 90}>
                <DotCluster size={18} style={{ marginTop: 3 }} />
                <div>
                  <div className={styles.bulletTitle}>{b.title}</div>
                  <div className={styles.bulletDesc}>{b.desc}</div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={160}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.roomLabel}>Room 204 · Triple sharing</div>
                <div className={styles.roomName}>Venkata Sai Men&rsquo;s PG</div>
              </div>
              <span className={styles.duePill}>Due Jul 8</span>
            </div>

            <div className={styles.amount}>₹8,450</div>
            <div className={styles.amountSub}>Total due for July 2026</div>

            <div className={styles.breakdown}>
              {BREAKDOWN.map((row) => (
                <div className={styles.breakdownRow} key={row.label}>
                  <span className={styles.breakdownLabel}>{row.label}</span>
                  <span className={styles.barTrack}>
                    <span className={styles.barFill} style={{ width: `${row.pct}%`, background: row.color }} />
                  </span>
                  <span className={styles.breakdownValue}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className={styles.history}>
              <div className={styles.historyTitle}>Payment history</div>
              {HISTORY.map((row) => (
                <div className={styles.historyRow} key={row.month}>
                  <div>
                    <div className={styles.historyMonth}>{row.month}</div>
                    <div className={styles.historyMeta}>{row.meta}</div>
                  </div>
                  <span className={styles.receiptChip}>Receipt</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
