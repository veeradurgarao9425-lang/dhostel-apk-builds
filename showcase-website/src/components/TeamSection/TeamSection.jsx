import { IconBuilding, IconLanguages, IconMoonSun, IconUsers } from '../icons/Icons'
import Reveal from '../Reveal/Reveal'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './TeamSection.module.css'

const ITEMS = [
  { icon: IconUsers, title: 'Staff Directory & Salary', desc: 'Manage staff records and run salary payments from one screen.' },
  { icon: IconLanguages, title: 'English · Telugu · Hindi', desc: 'The app speaks your team’s language, not just English.' },
  { icon: IconMoonSun, title: 'Light & Dark Theme', desc: 'Switch themes to match the time of day or personal taste.' },
  { icon: IconBuilding, title: 'Multi-Hostel Management', desc: 'Running more than one property? Switch between them instantly.' },
]

export default function TeamSection() {
  return (
    <section className={styles.section}>
      <div className="container">
        <SectionHeading eyebrow="For Owners" title="Built for your whole team." />
        <div className={styles.row}>
          {ITEMS.map((item, i) => {
            const Icon = item.icon
            return (
              <Reveal as="div" key={item.title} className={styles.item} delay={i * 80}>
                <div className={styles.iconWrap}>
                  <Icon width={19} height={19} />
                </div>
                <div>
                  <div className={styles.title}>{item.title}</div>
                  <div className={styles.desc}>{item.desc}</div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
