import type {
  AttendanceStatus,
  CalendarDayType,
  EmployeeStatus,
  PayrollStatus,
  PointSource,
  TaskPriority,
  TaskStatus,
  TaskType,
  UserRole,
} from '~/types/api'

export const USER_ROLES: UserRole[] = ['SUPERADMIN', 'HR', 'DEPARTMENT_HEAD', 'EMPLOYEE']
export const EMPLOYEE_STATUSES: EmployeeStatus[] = ['ACTIVE', 'FROZEN', 'VACATION', 'SICK_LEAVE', 'TERMINATED', 'BLOCKED']
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'REMOTE']
export const TASK_STATUSES: TaskStatus[] = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIALLY_COMPLETED', 'VERIFIED', 'REJECTED']
export const TASK_TYPES: TaskType[] = ['REGULAR', 'BONUS']
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const PAYROLL_STATUSES: PayrollStatus[] = ['CALCULATED', 'PAID']
export const CALENDAR_DAY_TYPES: CalendarDayType[] = ['WORKING', 'WEEKEND', 'HOLIDAY', 'NON_WORKING']
export const POINT_SOURCES: PointSource[] = ['TASK', 'BONUS_TASK', 'DAILY_REPORT', 'MANUAL']
export const ASSIGNMENT_RATES = [25, 50, 75, 100]

export type BadgeTone = 'slate' | 'green' | 'emerald' | 'sky' | 'amber' | 'orange' | 'red' | 'violet' | 'brand'

export const TONE_CLASSES: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  brand: 'bg-brand/10 text-brand ring-brand/20',
}

export const TONE_DOT_CLASSES: Record<BadgeTone, string> = {
  slate: 'bg-slate-400',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
  brand: 'bg-brand',
}

export const TONE_HEX: Record<BadgeTone, string> = {
  slate: '#94a3b8',
  green: '#22c55e',
  emerald: '#10b981',
  sky: '#0ea5e9',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  violet: '#8b5cf6',
  brand: '#1d4ed8',
}

export const ENUM_TONES: Record<string, Record<string, BadgeTone>> = {
  UserRole: { SUPERADMIN: 'violet', HR: 'sky', DEPARTMENT_HEAD: 'amber', EMPLOYEE: 'slate' },
  EmployeeStatus: { ACTIVE: 'green', FROZEN: 'sky', VACATION: 'amber', SICK_LEAVE: 'orange', TERMINATED: 'slate', BLOCKED: 'red' },
  AttendanceStatus: { PRESENT: 'green', LATE: 'amber', ABSENT: 'red', EXCUSED: 'sky', REMOTE: 'violet' },
  TaskStatus: { ASSIGNED: 'slate', IN_PROGRESS: 'sky', COMPLETED: 'emerald', PARTIALLY_COMPLETED: 'amber', VERIFIED: 'green', REJECTED: 'red' },
  TaskType: { REGULAR: 'slate', BONUS: 'violet' },
  TaskPriority: { LOW: 'slate', MEDIUM: 'sky', HIGH: 'amber', CRITICAL: 'red' },
  PayrollStatus: { CALCULATED: 'amber', PAID: 'green' },
  CalendarDayType: { WORKING: 'green', WEEKEND: 'slate', HOLIDAY: 'red', NON_WORKING: 'amber' },
  PointSource: { TASK: 'sky', BONUS_TASK: 'violet', DAILY_REPORT: 'emerald', MANUAL: 'amber' },
  NotificationType: {
    SECURITY_NEW_LOGIN: 'red',
    SECURITY_PASSWORD_CHANGED: 'amber',
    SECURITY_SESSION_TERMINATED: 'amber',
    TASK_ASSIGNED: 'sky',
    TASK_STATUS_CHANGED: 'sky',
    TASK_VERIFIED: 'green',
    REPORT_MISSING: 'orange',
    REPORT_RATED: 'emerald',
    PAYROLL_STATUS: 'violet',
    ANNOUNCEMENT: 'brand',
    POLL_CREATED: 'brand',
    STATUS_CHANGED: 'amber',
    ATTENDANCE_MARKED: 'sky',
    KPI_ADJUSTED: 'violet',
  },
  Boolean: { true: 'green', false: 'red' },
  Client: { WEB: 'sky', MOBILE: 'violet' },
}

export const toneFor = (enumName: string, value: string | boolean | null | undefined): BadgeTone => {
  if (value === null || value === undefined) return 'slate'
  return ENUM_TONES[enumName]?.[String(value)] ?? 'slate'
}

export const hexFor = (enumName: string, value: string): string => TONE_HEX[toneFor(enumName, value)]
