import type { CSSProperties } from 'react'

export type CuteIconName =
  | 'appointment'
  | 'back'
  | 'calendar'
  | 'cat'
  | 'camera'
  | 'cancel'
  | 'check'
  | 'clock'
  | 'close'
  | 'delete'
  | 'down'
  | 'expense'
  | 'expand'
  | 'finance'
  | 'home'
  | 'imageAdd'
  | 'images'
  | 'income'
  | 'left'
  | 'money'
  | 'next'
  | 'note'
  | 'phone'
  | 'plus'
  | 'previous'
  | 'registration'
  | 'right'
  | 'search'
  | 'service'
  | 'sparkles'
  | 'trend'
  | 'user'
  | 'userAdd'
  | 'users'
  | 'wallet'

const glyphs: Record<CuteIconName, string> = {
  appointment: '📅',
  back: '↩️',
  calendar: '🗓️',
  cat: '😺',
  camera: '📸',
  cancel: '❎',
  check: '✅',
  clock: '🕒',
  close: '❌',
  delete: '🗑️',
  down: '⬇️',
  expense: '↗️',
  expand: '🔎',
  finance: '💰',
  home: '🌟',
  imageAdd: '🌄',
  images: '🖼️',
  income: '↙️',
  left: '◀️',
  money: '💴',
  next: '▶️',
  note: '💬',
  phone: '📱',
  plus: '➕',
  previous: '◀️',
  registration: '🧑‍💼',
  right: '▶️',
  search: '🔍',
  service: '💆',
  sparkles: '✨',
  trend: '📈',
  user: '🧑‍💼',
  userAdd: '🙋',
  users: '👥',
  wallet: '👛'
}

interface CuteIconProps {
  name: CuteIconName
  size?: number
  className?: string
  label?: string
}

export function CuteIcon({ name, size = 20, className = '', label }: CuteIconProps) {
  return (
    <span
      className={`cute-icon cute-icon-${name}${className ? ` ${className}` : ''}`}
      style={{ '--cute-icon-size': `${size}px` } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {glyphs[name]}
    </span>
  )
}
