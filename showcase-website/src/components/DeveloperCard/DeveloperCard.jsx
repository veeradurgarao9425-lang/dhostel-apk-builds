import durgaraoImg from '../../assets/durgarao.jpeg'
import Reveal from '../Reveal/Reveal'
import styles from './DeveloperCard.module.css'

export default function DeveloperCard() {
  return (
    <section id="developer" className={styles.section}>
      <div className="container">
        <Reveal delay={120}>
          <div className={styles.card}>
            <div className={styles.imageCol}>
              <img src={durgaraoImg} alt="VeeraDurgarao Goriparthi" className={styles.photo} />
            </div>
            
            <div className={styles.contentCol}>
              <div className={styles.header}>
                <h3 className={styles.name}>VeeraDurgarao Goriparthi</h3>
                <span className={styles.title}>Creator & Lead Developer</span>
              </div>
              
              <div className={styles.divider} aria-hidden="true" />
              
              <p className={styles.bio}>
                "I built the Hostix + Stayvix ecosystem to solve real problems for hostel owners and tenants. Every line of code, from the React Native mobile apps to the scalable Node.js backend, was crafted with care and precision."
              </p>
              
              <div className={styles.contactList}>
                <a href="tel:+916303359425" className={styles.contactItem} style={{ '--item-color': 'var(--hostix-teal)' }}>
                  <div className={styles.iconBox}>📞</div>
                  <span>+91 6303359425</span>
                </a>
                <a href="mailto:hostixhelp@gmail.com" className={styles.contactItem} style={{ '--item-color': 'var(--hostix-orange)' }}>
                  <div className={styles.iconBox}>✉️</div>
                  <span>hostixhelp@gmail.com</span>
                </a>
                <a href="https://github.com/Durgarao9425" target="_blank" rel="noopener noreferrer" className={styles.contactItem} style={{ '--item-color': 'var(--ink)' }}>
                  <div className={styles.iconBox}>💻</div>
                  <span>GitHub</span>
                </a>
                <a href="https://www.linkedin.com/in/veeradurgarao-goriparthi-379974237" target="_blank" rel="noopener noreferrer" className={styles.contactItem} style={{ '--item-color': 'var(--hostix-blue)' }}>
                  <div className={styles.iconBox}>💼</div>
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
