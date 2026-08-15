import DotCluster from '../DotCluster/DotCluster'
import Reveal from '../Reveal/Reveal'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './ShowcaseFeature.module.css'

export default function ShowcaseFeature({
  id,
  eyebrow,
  eyebrowColor,
  title,
  subtitle,
  bullets,
  image,
  imageAlt,
  kicker,
  reverse = false,
  tint = false,
  accent = 'var(--hostix-indigo)',
}) {
  return (
    <section
      id={id}
      className={`${styles.section} ${tint ? styles.tint : ''} ${reverse ? styles.reverse : ''}`.trim()}
      style={{ '--accent': accent }}
    >
      <div className={`container ${styles.grid}`}>
        <div>
          <SectionHeading eyebrow={eyebrow} eyebrowColor={eyebrowColor} title={title} subtitle={subtitle} />
          {bullets && (
            <ul className={styles.bullets}>
              {bullets.map((b, i) => (
                <Reveal as="li" key={b.title} className={styles.bullet} delay={120 + i * 90}>
                  <DotCluster size={18} className={styles.bulletDot} />
                  <div>
                    <div className={styles.bulletTitle}>{b.title}</div>
                    <div className={styles.bulletDesc}>{b.desc}</div>
                  </div>
                </Reveal>
              ))}
            </ul>
          )}
        </div>

        <Reveal delay={160} className={styles.imageCol}>
          {kicker && <span className={styles.kicker}>{kicker}</span>}
          <div className={styles.frame}>
            <img src={image} alt={imageAlt} loading="lazy" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
