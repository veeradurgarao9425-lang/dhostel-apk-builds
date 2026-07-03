import './App.css'
import { useEffect } from 'react'
import AppDivider from './components/AppDivider/AppDivider'
import ClosingCTA from './components/ClosingCTA/ClosingCTA'
import CommunicationSection from './components/CommunicationSection/CommunicationSection'
import DashboardSection from './components/DashboardSection/DashboardSection'
import DeveloperCard from './components/DeveloperCard/DeveloperCard'
import ExpenseTrackerSection from './components/ExpenseTrackerSection/ExpenseTrackerSection'
import FinanceSection from './components/FinanceSection/FinanceSection'
import Footer from './components/Footer/Footer'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import HomeDuesSection from './components/HomeDuesSection/HomeDuesSection'
import OnboardingSection from './components/OnboardingSection/OnboardingSection'
import ProfileSection from './components/ProfileSection/ProfileSection'
import ServicesSection from './components/ServicesSection/ServicesSection'
import StudentsRoomsSection from './components/StudentsRoomsSection/StudentsRoomsSection'
import TeamSection from './components/TeamSection/TeamSection'

function App() {
  useEffect(() => {
    // ─── Scroll Progress Bar ───────────────────────────
    const bar = document.getElementById('scroll-progress')
    const btn = document.getElementById('scroll-top-btn')

    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? scrollTop / docHeight : 0
      if (bar) bar.style.transform = `scaleX(${progress})`
      if (btn) {
        if (scrollTop > 400) btn.classList.add('visible')
        else btn.classList.remove('visible')
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      {/* Scroll progress bar */}
      <div id="scroll-progress" aria-hidden="true" />

      {/* Scroll-to-top button */}
      <button
        id="scroll-top-btn"
        aria-label="Scroll to top"
        onClick={scrollToTop}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>

      <Header />
      <main>
        <Hero />
        <DashboardSection />
        <StudentsRoomsSection />
        <FinanceSection />
        <CommunicationSection />
        <TeamSection />
        <AppDivider />
        <OnboardingSection />
        <HomeDuesSection />
        <ExpenseTrackerSection />
        <ServicesSection />
        <ProfileSection />
        <ClosingCTA />
        <DeveloperCard />
      </main>
      <Footer />
    </div>
  )
}

export default App
