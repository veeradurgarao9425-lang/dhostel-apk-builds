import coffee from '../../assets/cofee.jpeg'
import entertainment from '../../assets/entertainment.jpeg'
import food from '../../assets/food.jpeg'
import gym from '../../assets/gym.jpeg'
import rent from '../../assets/rent.jpeg'
import shopping from '../../assets/shopping.jpeg'
import transport from '../../assets/transport.jpeg'
import Reveal from '../Reveal/Reveal'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './ExpenseTrackerSection.module.css'

const CATEGORIES = [
  { src: food, alt: 'Food expense category' },
  { src: rent, alt: 'Rent expense category' },
  { src: transport, alt: 'Transport expense category' },
  { src: shopping, alt: 'Shopping expense category' },
  { src: entertainment, alt: 'Entertainment expense category' },
  { src: gym, alt: 'Gym expense category' },
  { src: coffee, alt: 'Coffee expense category' },
]

export default function ExpenseTrackerSection() {
  return (
    <section id="expenses" className={styles.section}>
      <div className="container">
        <div className={styles.top}>
          <SectionHeading
            eyebrow="Stayvix · Expenses"
            eyebrowColor="var(--stayvix-purple)"
            title="Track your own spending, category by category."
            subtitle="Every rupee sorted automatically — food, rent, transport, and more — with clean visual summaries and easy bill-splitting when a cost is shared with roommates."
          />

          <Reveal delay={140} className={styles.splitPanel}>
            <div className={styles.splitIcon}>💸</div>
            <div className={styles.splitContent}>
              <div className={styles.splitTitle}>Split it, settle it</div>
              <div className={styles.splitSub}>Share a cost with roommates in a tap</div>
            </div>
            <div className={styles.splitBars}>
              {[70, 45, 85].map((w, i) => (
                <div key={i} className={styles.splitBar} style={{ width: `${w}%` }} />
              ))}
            </div>
          </Reveal>
        </div>

        <div className={styles.grid}>
          {CATEGORIES.map((cat, i) => (
            <Reveal as="div" key={cat.alt} className={styles.card} delay={(i % 4) * 80}>
              <img src={cat.src} alt={cat.alt} loading="lazy" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
