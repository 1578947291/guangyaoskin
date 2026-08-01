import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { AppointmentsPage } from './features/AppointmentsPage'
import { FinancePage } from './features/FinancePage'
import { FinanceSummaryPage } from './features/FinanceSummaryPage'
import { HomePage } from './features/HomePage'
import { RegistrationPage } from './features/RegistrationPage'
import type { AppSection } from './types'

interface AppRoute {
  section: AppSection
  customerId?: string
  appointmentId?: string
  financeView?: 'summary'
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
  if (parts[0] === 'finance') {
    return { section: 'finance', financeView: parts[1] === 'summary' ? 'summary' : undefined }
  }
  return { section: 'home' }
}

function sectionHash(section: AppSection) {
  return `#${section}`
}

function isSecondaryRoute(route: AppRoute) {
  return Boolean(route.customerId || route.appointmentId || route.financeView)
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(readRoute)
  const [toast, setToast] = useState('')
  const exitConfirmed = useRef(false)
  const restoringAfterCancel = useRef(false)
  const activeRoute = useRef(route)

  useEffect(() => {
    activeRoute.current = route
  }, [route])

  useEffect(() => {
    const initialRoute = readRoute()
    const currentHash = window.location.hash || sectionHash(initialRoute.section)
    const primaryHash = sectionHash(initialRoute.section)
    const initialState = window.history.state as { guangYaoNavigationVersion?: number } | null
    if (initialState?.guangYaoNavigationVersion !== 2) {
      window.history.replaceState({ guangYaoNavigationVersion: 2, guangYaoExitGuard: true }, '', primaryHash)
      window.history.pushState({ guangYaoNavigationVersion: 2, guangYaoPrimary: true }, '', primaryHash)
      if (currentHash !== primaryHash) {
        window.history.pushState({ guangYaoNavigationVersion: 2, guangYaoRoute: true, from: primaryHash }, '', currentHash)
      }
      setRoute(readRoute())
    }

    const updateRoute = (event: PopStateEvent) => {
      const state = event.state as { guangYaoExitGuard?: boolean; guangYaoPrimary?: boolean } | null
      if (restoringAfterCancel.current) {
        restoringAfterCancel.current = false
        setRoute(readRoute())
        return
      }
      if (state?.guangYaoExitGuard) {
        if (exitConfirmed.current) {
          window.history.back()
          window.setTimeout(() => window.close(), 150)
          return
        }
        if (window.confirm('确定退出光曜塑肤吗？')) {
          exitConfirmed.current = true
          window.history.back()
          window.setTimeout(() => window.close(), 150)
        } else {
          restoringAfterCancel.current = true
          window.history.forward()
        }
        return
      }
      if (state?.guangYaoPrimary && !isSecondaryRoute(activeRoute.current)) {
        if (window.confirm('确定退出光曜塑肤吗？')) {
          exitConfirmed.current = true
          window.history.back()
        } else {
          restoringAfterCancel.current = true
          window.history.forward()
        }
        return
      }
      setRoute(readRoute())
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    const updateHashRoute = () => setRoute(readRoute())
    const confirmUnload = (event: BeforeUnloadEvent) => {
      if (exitConfirmed.current || isSecondaryRoute(readRoute())) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('popstate', updateRoute)
    window.addEventListener('hashchange', updateHashRoute)
    window.addEventListener('beforeunload', confirmUnload)
    return () => {
      window.removeEventListener('popstate', updateRoute)
      window.removeEventListener('hashchange', updateHashRoute)
      window.removeEventListener('beforeunload', confirmUnload)
    }
  }, [])

  const navigate = useCallback((hash: string) => {
    const currentHash = window.location.hash || '#home'
    if (currentHash === hash) return
    window.history.pushState({ guangYaoNavigationVersion: 2, guangYaoRoute: true, from: currentHash }, '', hash)
    setRoute(readRoute())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const navigateSection = useCallback((section: AppSection) => {
    const hash = sectionHash(section)
    if (window.location.hash === hash && !readRoute().customerId && !readRoute().appointmentId && !readRoute().financeView) return
    window.history.replaceState({ guangYaoNavigationVersion: 2, guangYaoPrimary: true }, '', hash)
    setRoute(readRoute())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const goBack = useCallback((fallbackHash: string) => {
    const state = window.history.state as { guangYaoRoute?: boolean; from?: string } | null
    if (state?.guangYaoRoute && state.from === fallbackHash) {
      window.history.back()
      return
    }
    const fallbackParts = fallbackHash.replace(/^#\/?/, '').split('/').filter(Boolean)
    const isPrimary = fallbackParts.length === 1
    window.history.replaceState(
      isPrimary
        ? { guangYaoNavigationVersion: 2, guangYaoPrimary: true }
        : { guangYaoNavigationVersion: 2, guangYaoRoute: true, from: `#${fallbackParts[0]}` },
      '',
      fallbackHash
    )
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
            onOpenRegistration={() => navigateSection('registration')}
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
        {route.section === 'finance' && route.financeView === 'summary' ? (
          <FinanceSummaryPage onBack={() => goBack('#finance')} />
        ) : null}
        {route.section === 'finance' && !route.financeView ? (
          <FinancePage notify={setToast} onOpenSummary={() => navigate('#finance/summary')} />
        ) : null}
      </main>

      <BottomNav selected={route.section} onSelect={navigateSection} />

      <div className={`toast${toast ? ' visible' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
