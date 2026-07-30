import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  subtitle: string
  action?: React.ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {action ? <div className="page-actions">{action}</div> : null}
    </header>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  message: string
}

export function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <section className="empty-state surface" aria-live="polite">
      <span className="empty-icon"><Icon size={25} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  )
}
