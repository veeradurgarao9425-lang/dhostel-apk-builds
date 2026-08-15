import slide4 from '../../assets/slide4.jpg'
import ShowcaseFeature from '../ShowcaseFeature/ShowcaseFeature'

const BULLETS = [
  { title: 'One-tap remind & collect', desc: 'Nudge a tenant or mark a payment collected without leaving the list.' },
  { title: 'Auto-generated receipts', desc: 'Every payment produces a clean, shareable receipt — no manual typing.' },
  { title: 'Income & expense ledger', desc: 'A running book of everything coming in and going out of the property.' },
  { title: 'Payment-proof verification', desc: 'Review submitted proofs before marking a due as settled.' },
]

export default function FinanceSection() {
  return (
    <ShowcaseFeature
      id="finance"
      tint
      reverse
      accent="var(--hostix-teal)"
      eyebrow="For Owners"
      eyebrowColor="var(--hostix-teal)"
      title="Finance, simplified."
      subtitle="From reminders to receipts, every rupee is tracked, verified and reconciled — with an optional premium tier for growing portfolios."
      bullets={BULLETS}
      image={slide4}
      imageAlt="Pending dues screen with outstanding amounts and remind/collect actions per tenant"
      kicker="Pending dues"
    />
  )
}
