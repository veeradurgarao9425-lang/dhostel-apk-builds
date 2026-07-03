import { IconBell, IconInfo, IconKey, IconMessageAlert, IconUtensils } from '../icons/Icons'
import IconFeatureGrid from '../IconFeatureGrid/IconFeatureGrid'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './ServicesSection.module.css'

const STAYVIX_TINTS = [
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
  'linear-gradient(135deg, #0ea5a3, #14b8a6)',
  'linear-gradient(135deg, #6d5ef5, #7c3aed)',
]

const ITEMS = [
  { icon: IconBell, title: 'Announcements', desc: 'Every notice from your owner or warden, in one clean feed.' },
  { icon: IconMessageAlert, title: 'Maintenance Complaints', desc: 'Raise an issue and track its status until it’s resolved.' },
  { icon: IconInfo, title: 'Amenities Info', desc: 'Know what’s available on the property and how to use it.' },
  { icon: IconUtensils, title: 'Mess Menu Access', desc: 'Check the week’s menu without asking around.' },
  { icon: IconKey, title: 'Gate Pass & Visitor Requests', desc: 'Request a gate pass or invite a visitor in a couple of taps.' },
]

export default function ServicesSection() {
  return (
    <section className={styles.section}>
      <div className="container">
        <SectionHeading
          eyebrow="Stayvix · Services"
          eyebrowColor="var(--stayvix-purple)"
          title="Notices, complaints and everyday services — sorted."
          align="center"
        />
        <IconFeatureGrid items={ITEMS} cols={3} tints={STAYVIX_TINTS} />
      </div>
    </section>
  )
}
