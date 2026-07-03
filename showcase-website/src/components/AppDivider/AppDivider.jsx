import logo from '../../assets/logo.png'
import DotCluster from '../DotCluster/DotCluster'
import Reveal from '../Reveal/Reveal'
import styles from './AppDivider.module.css'

export default function AppDivider() {
  return (
    <section id="stayvix" className={styles.section}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={`container ${styles.content}`}>
        <Reveal>
          <img src={logo} alt="Stayvix app icon" className={styles.logo} />
        </Reveal>
        <Reveal delay={80}>
          <p className={`eyebrow ${styles.eyebrow}`}>
            <DotCluster size={18} />
            Introducing the tenant app
          </p>
        </Reveal>
        <Reveal delay={140}>
          <h2 className={`h2 ${styles.title}`}>Meet Stayvix — your hostel life, in your pocket.</h2>
        </Reveal>
        <Reveal delay={200}>
          <p className={`body-lg ${styles.subtitle}`}>
            Everything a resident needs, from move-in to move-out — rent, receipts, requests and daily
            expenses, in one calm app.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
