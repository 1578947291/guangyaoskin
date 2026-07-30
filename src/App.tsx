import { useEffect, useState } from 'react'
import { Download, WifiOff } from 'lucide-react'
import { BottomNav } from './components/BottomNav'
import { Modal } from './components/Modal'
import { AppointmentsPage } from './features/AppointmentsPage'
import { FinancePage } from './features/FinancePage'
import { HomePage } from './features/HomePage'
import { RegistrationPage } from './features/RegistrationPage'
import { usePwaInstall } from './hooks/usePwaInstall'
import type { AppSection } from './types'

export default function App() {
  const [section, setSection] = useState<AppSection>('home')
  const [toast, setToast] = useState('')
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const { canInstall, isInstalled, install } = usePwaInstall()

  useEffect(() => {
    const updateConnection = () => setIsOffline(!navigator.onLine)
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleInstall = async () => {
    if (canInstall) {
      const installed = await install()
      if (installed) setToast('已开始安装')
      return
    }
    setShowInstallHelp(true)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="光曜塑肤猫咪标志" width="40" height="40" />
          <div>
            <strong>光曜塑肤</strong>
            <span>GUANGYAO SKIN</span>
          </div>
        </div>
        <div className="topbar-actions">
          {isOffline ? (
            <span className="offline-status" title="当前离线">
              <WifiOff size={15} />
              <span>离线</span>
            </span>
          ) : null}
          {!isInstalled ? (
            <button className="icon-button" type="button" onClick={handleInstall} aria-label="安装应用" title="安装应用">
              <Download size={19} />
            </button>
          ) : null}
        </div>
      </header>

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

      <Modal title="安装到主屏幕" open={showInstallHelp} onClose={() => setShowInstallHelp(false)}>
        <div className="install-help">
          <div className="install-step"><span>1</span><p>使用 Safari 打开当前页面</p></div>
          <div className="install-step"><span>2</span><p>点击浏览器的“共享”按钮</p></div>
          <div className="install-step"><span>3</span><p>选择“添加到主屏幕”</p></div>
          <button className="primary-button" type="button" onClick={() => setShowInstallHelp(false)}>完成</button>
        </div>
      </Modal>
    </div>
  )
}
