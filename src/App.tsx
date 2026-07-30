import { useEffect, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { AppointmentsPage } from './features/AppointmentsPage'
import { FinancePage } from './features/FinancePage'
import { HomePage } from './features/HomePage'
import { RegistrationPage } from './features/RegistrationPage'
import type { AppSection } from './types'

export default function App() {
  const [section, setSection] = useState<AppSection>('home')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <div className="app-shell">
      <main>
        <div hidden={section !== 'home'}>
          <HomePage onNavigate={setSection} />
        </div>
        <div hidden={section !== 'appointments'}>
          <AppointmentsPage notify={setToast} />
        </div>
        <div hidden={section !== 'registration'}>
          <RegistrationPage notify={setToast} />
        </div>
        <div hidden={section !== 'finance'}>
          <FinancePage notify={setToast} />
        </div>
      </main>

      <BottomNav selected={section} onSelect={setSection} />

      <div className={`toast${toast ? ' visible' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
