import { useInView } from '../../hooks/useInView'
import styles from './Reveal.module.css'

/**
 * Wraps children in a scroll-triggered fade/rise reveal.
 * `delay` (ms) staggers groups of siblings for a cascading entrance.
 */
export default function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
  className = '',
  style,
  ...rest
}) {
  const [ref, inView] = useInView()

  return (
    <Tag
      ref={ref}
      className={`${styles.reveal} ${inView ? styles.visible : ''} ${className}`.trim()}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms', ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
