import { IconBell, IconDoorOpen, IconFileText, IconHome, IconStar } from '../icons/Icons'
import IconFeatureGrid from '../IconFeatureGrid/IconFeatureGrid'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './ProfileSection.module.css'

const STAYVIX_TINTS = [
  'linear-gradient(135deg, #0ea5a3, #14b8a6)',
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
  'linear-gradient(135deg, #6d5ef5, #7c3aed)',
]

const ITEMS = [
  { icon: IconFileText, title: 'Documents & Receipts', desc: 'A tidy vault for every receipt and document you’ve ever needed.' },
  { icon: IconBell, title: 'Notifications', desc: 'A single feed for due-date reminders and everything else worth knowing.' },
  { icon: IconHome, title: 'Room Info', desc: 'Your room, bed and plan details, always visible.' },
  { icon: IconStar, title: 'Ratings & Feedback', desc: 'Rate your stay and share feedback directly with your owner.' },
  { icon: IconDoorOpen, title: 'Room-Vacate Requests', desc: 'Planning to move out? Submit and track your vacate request here.' },
]

export default function ProfileSection() {
  return (
    <section className={styles.section}>
      <div className="container">
        <SectionHeading
          eyebrow="Stayvix · Profile"
          eyebrowColor="var(--stayvix-purple)"
          title="Documents, notifications and your profile — all in reach."
          align="center"
        />
        <IconFeatureGrid items={ITEMS} cols={3} tints={STAYVIX_TINTS} />
      </div>
    </section>
  )
}
