import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { AppointmentsPage } from './features/AppointmentsPage'
import { FinancePage } from './features/FinancePage'
import { HomePage } from './features/HomePage'
import { RegistrationPage } from './features/RegistrationPage'
import type { AppSection } from './types'

interface AppRoute {
  section: AppSection
  customerId?: string
  appointmentId?: string
}

function decodeRoutePart(value: string | undefined) {
  if (!value) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function readRoute(): AppRoute {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] === 'appointments') {
    return { section: 'appointments', appointmentId: decodeRoutePart(parts[1]) }
  }
  if (parts[0] === 'registration') {
    return {
      section: 'registration',
      customerId: decodeRoutePart(parts[1]),
      appointmentId: parts[2] === 'appointments' ? decodeRoutePart(parts[3]) : undefined
    }
  }
  if (parts[0] === 'finance') return { section: 'finance' }
  return { section: 'home' }
}

function sectionHash(section: AppSection) {
  return `#${section}`
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(readRoute)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const updateRoute = () => setRoute(readRoute())
    window.addEventListener('popstate', updateRoute)
    window.addEventListener('hashchange', updateRoute)
    return () => {
      window.removeEventListener('popstate', updateRoute)
      window.removeEventListener('hashchange', updateRoute)
    }
  }, [])

  const navigate = useCallback((hash: string) => {
    const currentHash = window.location.hash || '#home'
    if (currentHash === hash) return
    window.history.pushState({ guangYaoRoute: true, from: currentHash }, '', hash)
    setRoute(readRoute())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const goBack = useCallback((fallbackHash: string) => {
    const state = window.history.state as { guangYaoRoute?: boolean; from?: string } | null
    if (state?.guangYaoRoute && state.from === fallbackHash) {
      window.history.back()
      return
    }
    window.history.replaceState({ guangYaoRoute: true, from: '#home' }, '', fallbackHash)
    setRoute(readRoute())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <div className="app-shell">
      <main>
        {route.section === 'home' ? <HomePage notify={setToast} /> : null}
        {route.section === 'appointments' ? (
          <AppointmentsPage
            notify={setToast}
            appointmentId={route.appointmentId}
            onOpenAppointment={(appointmentId) => navigate(`#appointments/${encodeURIComponent(appointmentId)}`)}
            onBack={() => goBack('#appointments')}
          />
        ) : null}
        {route.section === 'registration' ? (
          <RegistrationPage
            notify={setToast}
            customerId={route.customerId}
            appointmentId={route.appointmentId}
            onOpenCustomer={(customerId) => navigate(`#registration/${encodeURIComponent(customerId)}`)}
            onOpenAppointment={(customerId, appointmentId) => navigate(`#registration/${encodeURIComponent(customerId)}/appointments/${encodeURIComponent(appointmentId)}`)}
            onBackCustomer={() => goBack('#registration')}
            onBackAppointment={(customerId) => goBack(`#registration/${encodeURIComponent(customerId)}`)}
          />
        ) : null}
        {route.section === 'finance' ? <FinancePage notify={setToast} /> : null}
      </main>

      <BottomNav selected={route.section} onSelect={(section) => navigate(sectionHash(section))} />

      <div className={`toast${toast ? ' visible' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
