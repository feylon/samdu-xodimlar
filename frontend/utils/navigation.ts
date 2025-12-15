import type { UserRole } from '~/types/api'

export interface NavItem {
  to: string
  labelKey: string
  icon: string
  roles?: UserRole[]
  children?: NavItem[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: 'home' },
  { to: '/employees', labelKey: 'nav.employees', icon: 'users', roles: ['HR', 'SUPERADMIN', 'DEPARTMENT_HEAD'] },
  { to: '/departments', labelKey: 'nav.departments', icon: 'building' },
  { to: '/attendance', labelKey: 'nav.attendance', icon: 'clock' },
  { to: '/tasks', labelKey: 'nav.tasks', icon: 'clipboard' },
  { to: '/reports', labelKey: 'nav.reports', icon: 'document' },
  { to: '/kpi', labelKey: 'nav.kpi', icon: 'chart' },
  { to: '/payroll', labelKey: 'nav.payroll', icon: 'banknotes' },
  { to: '/calendar', labelKey: 'nav.calendar', icon: 'calendar' },
  { to: '/announcements', labelKey: 'nav.announcements', icon: 'megaphone' },
  { to: '/polls', labelKey: 'nav.polls', icon: 'pie' },
  { to: '/notifications', labelKey: 'nav.notifications', icon: 'bell' },
  { to: '/security', labelKey: 'nav.security', icon: 'shield' },
  { to: '/audit', labelKey: 'nav.audit', icon: 'audit', roles: ['SUPERADMIN'] },
  { to: '/settings/organization', labelKey: 'nav.organization', icon: 'cog', roles: ['SUPERADMIN'] },
  { to: '/settings/users', labelKey: 'nav.users', icon: 'userGroup', roles: ['SUPERADMIN'] },
]

export const notificationTarget = (data: Record<string, unknown> | null | undefined): string | null => {
  if (!data) return null
  if (data.taskId) return '/tasks'
  if (data.payrollId) return '/payroll'
  if (data.reportId) return '/reports'
  if (data.announcementId) return '/announcements'
  if (data.pollId) return '/polls'
  if (data.sessionId) return '/security'
  return null
}
