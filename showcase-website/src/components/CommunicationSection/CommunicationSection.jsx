import {
  IconBell,
  IconCalendarCheck,
  IconLanguages,
  IconMessageAlert,
  IconStar,
  IconUtensils,
} from '../icons/Icons'
import IconFeatureGrid from '../IconFeatureGrid/IconFeatureGrid'
import SectionHeading from '../SectionHeading/SectionHeading'
import styles from './CommunicationSection.module.css'

const ITEMS = [
  { icon: IconBell, title: 'Notices Board', desc: 'Push announcements to every resident the moment they matter.' },
  { icon: IconMessageAlert, title: 'Complaint Tracking', desc: 'Log, assign and resolve maintenance issues with a visible status.' },
  { icon: IconCalendarCheck, title: 'Leave & Visitor Approvals', desc: 'Approve leave and visitor requests in one place, no phone tag.' },
  { icon: IconUtensils, title: 'Weekly Mess Menu', desc: 'Plan and publish the week’s menu so residents always know what’s cooking.' },
  { icon: IconStar, title: 'Ratings & Push Notifications', desc: 'Collect tenant ratings and reach everyone instantly with push alerts.' },
  { icon: IconLanguages, title: 'Bilingual FAQ Assistant', desc: 'An English/Telugu assistant answers common questions around the clock.' },
]

export default function CommunicationSection() {
  return (
    <section id="communication" className={styles.section}>
      <div className="container">
        <SectionHeading
          eyebrow="For Owners"
          title="Keep every resident in the loop — never miss a complaint."
          align="center"
        />
        <IconFeatureGrid items={ITEMS} cols={3} />
      </div>
    </section>
  )
}
