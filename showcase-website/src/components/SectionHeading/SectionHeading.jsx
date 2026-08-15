import DotCluster from '../DotCluster/DotCluster'
import Reveal from '../Reveal/Reveal'
import styles from './SectionHeading.module.css'

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  eyebrowColor,
  className = '',
}) {
  return (
    <Reveal
      className={`${styles.heading} ${align === 'center' ? styles.center : ''} ${className}`.trim()}
    >
      {eyebrow && (
        <p
          className={`eyebrow ${styles.eyebrow}`}
          style={eyebrowColor ? { '--eyebrow-color': eyebrowColor } : undefined}
        >
          <DotCluster size={18} className={styles.dot} />
          {eyebrow}
        </p>
      )}
      <h2 className={`h2 ${styles.title}`}>{title}</h2>
      {subtitle && <p className={`body-lg ${styles.subtitle}`}>{subtitle}</p>}
    </Reveal>
  )
}
