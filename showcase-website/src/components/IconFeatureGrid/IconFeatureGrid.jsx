import Reveal from '../Reveal/Reveal'
import styles from './IconFeatureGrid.module.css'

const TINTS = [
  'linear-gradient(135deg, #4f46e5, #6d5ef5)',
  'linear-gradient(135deg, #f97316, #fb923c)',
  'linear-gradient(135deg, #0ea5a3, #14b8a6)',
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
]

const hexToRgb = (hex) => {
  const m = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(hex)
  if (!m) return '79, 70, 229'
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const num = parseInt(h, 16)
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`
}

export default function IconFeatureGrid({ items, cols = 3, cardBg, tints }) {
  const palette = tints || TINTS
  return (
    <div
      className={styles.grid}
      style={{ '--cols': cols, ...(cardBg ? { '--card-bg': cardBg } : {}) }}
    >
      {items.map((item, i) => {
        const Icon = item.icon
        const swatch = item.tint || palette[i % palette.length]
        return (
          <Reveal
            as="article"
            key={item.title}
            className={styles.card}
            delay={(i % cols) * 90}
            style={{ '--glow': hexToRgb(swatch) }}
          >
            <div className={styles.iconWrap} style={{ background: swatch }}>
              <Icon width={22} height={22} />
            </div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardDesc}>{item.desc}</p>
          </Reveal>
        )
      })}
    </div>
  )
}
