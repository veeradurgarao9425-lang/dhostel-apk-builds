import slide1 from '../../assets/slide1.jpg'
import slide3 from '../../assets/slide3.jpg'
import DotCluster from '../DotCluster/DotCluster'
import Reveal from '../Reveal/Reveal'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './StudentsRoomsSection.module.css'

const BULLETS = [
  {
    title: 'Tenant directory, one tap away',
    desc: 'Search residents by name, room or phone — reach anyone instantly with built-in WhatsApp and Call actions.',
  },
  {
    title: 'Room & bed occupancy by floor',
    desc: 'A color-coded grid shows exactly which rooms are full, vacant or nearly there, floor by floor.',
  },
  {
    title: 'Guest tracking & advance pre-booking',
    desc: 'Log guest stays and hold rooms for upcoming move-ins before a bed is even vacant.',
  },
]

export default function StudentsRoomsSection() {
  return (
    <section id="students-rooms" className={styles.section}>
      <div className={`container ${styles.grid}`}>
        <div>
          <SectionHeading
            eyebrow="For Owners"
            eyebrowColor="var(--hostix-orange)"
            title="Every tenant and every room, always in view."
          />
          <ul className={styles.bullets}>
            {BULLETS.map((b, i) => (
              <Reveal as="li" key={b.title} className={styles.bullet} delay={120 + i * 90}>
                <DotCluster size={18} className={styles.bulletDot} />
                <div>
                  <div className={styles.bulletTitle}>{b.title}</div>
                  <div className={styles.bulletDesc}>{b.desc}</div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={160} className={styles.stage}>
          <div className={`${styles.frame} ${styles.frameBack}`}>
            <img src={slide3} alt="Room status grid grouped by floor, color-coded full and vacant" loading="lazy" />
          </div>
          <div className={`${styles.frame} ${styles.frameFront}`}>
            <img src={slide1} alt="Tenant directory with WhatsApp and call quick-contact actions" loading="lazy" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
