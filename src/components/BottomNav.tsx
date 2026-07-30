import {
  CalendarDays,
  Cat,
  CircleDollarSign,
  Sparkles,
  UserRound,
  type LucideIcon
} from 'lucide-react'
import type { AppSection } from '../types'

interface NavItem {
  id: AppSection
  label: string
  badge: LucideIcon
  tone: string
}

const items: NavItem[] = [
  { id: 'home', label: '首页', badge: Sparkles, tone: 'rose' },
  { id: 'appointments', label: '预约', badge: CalendarDays, tone: 'lavender' },
  { id: 'registration', label: '登记', badge: UserRound, tone: 'mint' },
  { id: 'finance', label: '收支', badge: CircleDollarSign, tone: 'peach' }
]

interface BottomNavProps {
  selected: AppSection
  onSelect: (section: AppSection) => void
}

export function BottomNav({ selected, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav-wrap" aria-label="主导航">
      <div className="bottom-nav">
        {items.map(({ id, label, badge: Badge, tone }) => {
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
                <Cat size={27} strokeWidth={1.8} />
                <span className="cat-badge"><Badge size={9} strokeWidth={2.7} /></span>
              </span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
