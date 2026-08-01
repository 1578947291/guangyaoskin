import type { AppSection } from '../types'
import { CuteIcon, type CuteIconName } from './CuteIcon'

interface NavItem {
  id: AppSection
  label: string
  badge: CuteIconName
  tone: string
}

const items: NavItem[] = [
  { id: 'home', label: '首页', badge: 'home', tone: 'rose' },
  { id: 'appointments', label: '预约', badge: 'appointment', tone: 'lavender' },
  { id: 'registration', label: '登记', badge: 'registration', tone: 'mint' },
  { id: 'finance', label: '收支', badge: 'finance', tone: 'peach' }
]

interface BottomNavProps {
  selected: AppSection
  onSelect: (section: AppSection) => void
}

export function BottomNav({ selected, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav-wrap" aria-label="主导航">
      <div className="bottom-nav">
        {items.map(({ id, label, badge, tone }) => {
          const isSelected = selected === id
          return (
            <button
              key={id}
              type="button"
              className={`nav-item nav-${tone}${isSelected ? ' selected' : ''}`}
              aria-current={isSelected ? 'page' : undefined}
              onClick={() => onSelect(id)}
            >
              <span className="cat-nav-icon" aria-hidden="true">
                <CuteIcon name="cat" size={29} />
                <span className="cat-badge"><CuteIcon name={badge} size={13} /></span>
              </span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
