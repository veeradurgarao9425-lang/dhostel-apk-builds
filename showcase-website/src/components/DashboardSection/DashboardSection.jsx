import slide2 from '../../assets/slide2.jpg'
import ShowcaseFeature from '../ShowcaseFeature/ShowcaseFeature'

const BULLETS = [
  { title: 'KPI overview at a glance', desc: 'Tenants, revenue, expenses and staff — the whole PG in four numbers.' },
  { title: 'Revenue trends, not just totals', desc: 'See collections trending up or down before it becomes a problem.' },
  { title: 'One-tap PDF report export', desc: 'Turn any month into a shareable report for partners or accountants.' },
]

export default function DashboardSection() {
  return (
    <ShowcaseFeature
      id="dashboard"
      tint
      accent="var(--hostix-indigo)"
      eyebrow="For Owners"
      title="Real-time visibility into every rupee and every room."
      bullets={BULLETS}
      image={slide2}
      imageAlt="Hostix owner dashboard showing quick actions, stats and upcoming checkouts"
      kicker="Home dashboard"
    />
  )
}
