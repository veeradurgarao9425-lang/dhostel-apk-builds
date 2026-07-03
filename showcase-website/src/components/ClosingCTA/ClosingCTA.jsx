import DotCluster from '../DotCluster/DotCluster'
import { IconArrowRight } from '../icons/Icons'
import Reveal from '../Reveal/Reveal'
import styles from './ClosingCTA.module.css'

export default function ClosingCTA() {
  return (
    <section className={styles.section}>
      <div className={styles.dots} aria-hidden="true" />
      <div className={`container ${styles.content}`}>
        <Reveal>
          <p className={`eyebrow ${styles.eyebrow}`}>
            <DotCluster size={18} />
            Hostix + Stayvix
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className={`h2 ${styles.title}`}>Ready to see Hostix and Stayvix in your hostel?</h2>
        </Reveal>
        <Reveal delay={140}>
          <p className={`body-lg ${styles.subtitle}`}>
            One app for owners, one app for tenants — built to run modern hostels and PGs, together.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <a href="#top" className={styles.cta}>
            Take another look
            <IconArrowRight width={18} height={18} />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
