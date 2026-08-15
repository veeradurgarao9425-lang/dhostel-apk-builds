import { IconArrowRight } from '../icons/Icons'
import Reveal from '../Reveal/Reveal'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './OnboardingSection.module.css'

const STEPS = [
  { n: '01', title: 'Enter your hostel code', desc: 'Your owner shares a short code — type it in and Stayvix finds your property.', color: 'var(--stayvix-purple)' },
  { n: '02', title: 'Verify with OTP', desc: 'Confirm your phone number with a one-time password. That’s it for security.', color: 'var(--hostix-orange)' },
  { n: '03', title: 'Quick registration, then home', desc: 'A short 3-step form and you land straight on your personal dashboard.', color: 'var(--hostix-teal)' },
]

export default function OnboardingSection() {
  return (
    <section className={styles.section}>
      <div className="container">
        <SectionHeading
          eyebrow="Stayvix · Getting Started"
          title="Getting started takes under two minutes."
          eyebrowColor="var(--stayvix-purple)"
        />
        <div className={styles.steps}>
          {STEPS.map((step, i) => (
            <Reveal as="div" key={step.n} className={styles.step} delay={i * 120} style={{ '--step-color': step.color }}>
              <span className={styles.number}>{step.n}</span>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepDesc}>{step.desc}</div>
              <IconArrowRight className={styles.arrow} width={22} height={22} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
