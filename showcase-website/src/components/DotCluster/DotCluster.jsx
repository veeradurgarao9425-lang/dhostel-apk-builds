import logo from '../../assets/logo.png'

/**
 * Small brand mark — the actual Hostix logo, used as a signature accent
 * (bullet points, dividers, decorative flourishes) instead of a generic
 * bullet glyph or stock icon dingbat.
 */
export default function DotCluster({ size = 22, className = '', style, ...rest }) {
  return (
    <img
      src={logo}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', flexShrink: 0, ...style }}
      aria-hidden="true"
      {...rest}
    />
  )
}
