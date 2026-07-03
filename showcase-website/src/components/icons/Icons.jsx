/**
 * A small, consistent set of schematic line icons used across the
 * icon-led feature grids. Kept intentionally simple (24px grid,
 * single stroke weight) so the real screenshot moments stay the
 * visual focal points of the page.
 */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ children, ...props }) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      {children}
    </svg>
  )
}

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 3.4 1 5.2 1.6 6.1a1 1 0 0 1-.85 1.55H5.25a1 1 0 0 1-.85-1.55C5 14.2 6 12.4 6 9Z" />
    <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
  </Svg>
)

export const IconMessageAlert = (p) => (
  <Svg {...p}>
    <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.4 3.3A.6.6 0 0 1 3.7 19.8V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
    <path d="M12 9v3.2" />
    <path d="M12 15h.01" />
  </Svg>
)

export const IconCalendarCheck = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
    <path d="m8.4 15 2 2 4.4-4.4" />
  </Svg>
)

export const IconUtensils = (p) => (
  <Svg {...p}>
    <path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v7M9.4 3v7M5 3v7" />
    <path d="M17 3c-1.4 0-2.5 1.8-2.5 5.5S15.6 13 17 13v8" />
  </Svg>
)

export const IconStar = (p) => (
  <Svg {...p}>
    <path d="m12 3.5 2.55 5.28 5.7.76-4.15 4.06 1 5.77L12 16.6l-5.1 2.77 1-5.77-4.15-4.06 5.7-.76Z" />
  </Svg>
)

export const IconLanguages = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
  </Svg>
)

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.2 19c.6-3.4 3-5.2 5.8-5.2S14.2 15.6 14.8 19" />
    <path d="M15.6 5.2a3.2 3.2 0 0 1 0 6.2" />
    <path d="M16.4 13.9c2.3.5 3.9 2.2 4.4 5.1" />
  </Svg>
)

export const IconMoonSun = (p) => (
  <Svg {...p}>
    <path d="M20 14.2A8.3 8.3 0 0 1 9.8 4a8.3 8.3 0 1 0 10.2 10.2Z" />
  </Svg>
)

export const IconBuilding = (p) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="10.5" height="17" rx="1.4" />
    <rect x="14.5" y="9" width="5.5" height="11.5" rx="1.2" />
    <path d="M7 7.2h1.2M11.3 7.2h1.2M7 10.8h1.2M11.3 10.8h1.2M7 14.4h1.2M11.3 14.4h1.2" />
  </Svg>
)

export const IconShieldCheck = (p) => (
  <Svg {...p}>
    <path d="M12 3.2 19 6v5.4c0 4.6-3 7.7-7 9.4-4-1.7-7-4.8-7-9.4V6Z" />
    <path d="m9 12 2.1 2.1L15.4 9.8" />
  </Svg>
)

export const IconReceipt = (p) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2.2-1.5-2 1.5-1.8-1.5-2 1.5-2-1.5-2 1.5v-17Z" />
    <path d="M8.4 8h7.2M8.4 11.5h7.2M8.4 15h4.6" />
  </Svg>
)

export const IconFileText = (p) => (
  <Svg {...p}>
    <path d="M7 3.5h7l4 4V20a.9.9 0 0 1-.9.9H7A.9.9 0 0 1 6.1 20V4.4A.9.9 0 0 1 7 3.5Z" />
    <path d="M14 3.5V8h4M9 12.5h6M9 16h6" />
  </Svg>
)

export const IconKey = (p) => (
  <Svg {...p}>
    <circle cx="8" cy="15.5" r="4" />
    <path d="M11 12.6 18.5 5M16.6 6.9l2 2M14 9.5l1.8 1.8" />
  </Svg>
)

export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.6h.01" />
  </Svg>
)

export const IconDoorOpen = (p) => (
  <Svg {...p}>
    <path d="M14 3.6 19 5v15.4M5 20.4h14M14 3.6 5 5.2v15.2M14 3.6v16.8" />
    <path d="M11 12.4h.01" />
  </Svg>
)

export const IconHome = (p) => (
  <Svg {...p}>
    <path d="M4 11.2 12 4l8 7.2" />
    <path d="M6 9.6V20h12V9.6" />
    <path d="M10 20v-5.5h4V20" />
  </Svg>
)

export const IconWallet = (p) => (
  <Svg {...p}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" />
    <path d="M14.5 12h3.8" />
    <path d="M4 9.5h16" />
  </Svg>
)

export const IconTrendingUp = (p) => (
  <Svg {...p}>
    <path d="m4 16 5.2-5.6 3.8 3.2L20 6" />
    <path d="M15 6h5v5" />
  </Svg>
)

export const IconRepeat = (p) => (
  <Svg {...p}>
    <path d="M4 7.5h13l-2.5-2.7" />
    <path d="M20 16.5H7l2.5 2.7" />
  </Svg>
)

export const IconSplit = (p) => (
  <Svg {...p}>
    <path d="M4 6h4l4 12h4" />
    <path d="M14 6h4l-2.4 3M18 6l-2.4 3" />
    <path d="M12 12h.01" />
  </Svg>
)

export const IconQr = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 15h2.5v2.5H14zM17.5 14.5h2M14 20h2.5M17.5 18v2" />
  </Svg>
)

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Svg>
)

export const IconSparkle = (p) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </Svg>
)
