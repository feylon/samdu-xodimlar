export type UserRole = 'SUPERADMIN' | 'HR' | 'DEPARTMENT_HEAD' | 'EMPLOYEE'
export type EmployeeStatus = 'ACTIVE' | 'FROZEN' | 'VACATION' | 'SICK_LEAVE' | 'TERMINATED' | 'BLOCKED'
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | 'REMOTE'
export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'VERIFIED' | 'REJECTED'
export type TaskType = 'REGULAR' | 'BONUS'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type PayrollStatus = 'CALCULATED' | 'PAID'
export type CalendarDayType = 'WORKING' | 'WEEKEND' | 'HOLIDAY' | 'NON_WORKING'
export type PointSource = 'TASK' | 'BONUS_TASK' | 'DAILY_REPORT' | 'MANUAL'
export type NotificationType =
  | 'SECURITY_NEW_LOGIN'
  | 'SECURITY_PASSWORD_CHANGED'
  | 'SECURITY_SESSION_TERMINATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_VERIFIED'
  | 'REPORT_MISSING'
  | 'REPORT_RATED'
  | 'PAYROLL_STATUS'
  | 'ANNOUNCEMENT'
  | 'POLL_CREATED'
  | 'STATUS_CHANGED'
  | 'ATTENDANCE_MARKED'
  | 'KPI_ADJUSTED'

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface PublicUser {
  id: string
  login: string
  role: UserRole
  fullName: string
  pinfl: string | null
  phone: string | null
  email: string | null
  position: string | null
  baseSalary: number
  photoFileId: string | null
  passportFileIds: string[]
  status: EmployeeStatus
  hireDate: string | null
  terminatedAt: string | null
  birthDate: string | null
  address: string | null
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserAssignment {
  id: string
  departmentId: string
  departmentName: string
  departmentCode: string
  rate: number
  startDate: string
  isHead: boolean
}

export interface EmployeeListAssignment {
  departmentId: string
  departmentName: string
  rate: number
}

export interface EmployeeListItem extends PublicUser {
  assignments: EmployeeListAssignment[]
}

export interface StatusHistoryEntry {
  id: string
  userId: string
  fromStatus: EmployeeStatus
  toStatus: EmployeeStatus
  reason: string | null
  medicalReason: string | null
  startDate: string | null
  endDate: string | null
  changedBy: string
  createdAt: string
}

export interface EmployeeDetail extends PublicUser {
  assignments: UserAssignment[]
  statusHistory: StatusHistoryEntry[]
}

export interface AuthUser extends PublicUser {
  assignments?: UserAssignment[]
  sessionId?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  accessExpiresIn: number
  refreshExpiresIn: number
  sessionId: string
  user: PublicUser
}

export interface SessionInfo {
  id: string
  userId: string
  client: 'WEB' | 'MOBILE'
  ip: string
  userAgent: string
  device: string
  browser: string
  os: string
  deviceName: string | null
  platform: string | null
  createdAt: string
  lastActiveAt: string
  expiresAt: string
  isCurrent?: boolean
}

export interface LoginHistoryEntry {
  id: string
  userId: string | null
  login: string
  success: boolean
  failureReason: string | null
  client: 'WEB' | 'MOBILE'
  ip: string
  userAgent: string
  device: string
  browser: string
  os: string
  sessionId: string | null
  createdAt: string
}

export interface DepartmentHead {
  id: string
  fullName: string
  login: string
  photoFileId: string | null
}

export interface Department {
  id: string
  name: string
  code: string
  description: string | null
  isActive: boolean
  headUserId: string | null
  head: DepartmentHead | null
  memberCount: number
  totalRate: number
  createdAt: string
  updatedAt: string
}

export interface DepartmentMember {
  assignmentId: string
  userId: string
  fullName: string
  login: string
  position: string | null
  photoFileId: string | null
  status: EmployeeStatus
  role: UserRole
  rate: number
  startDate: string
  isHead: boolean
}

export interface DepartmentDetail extends Department {
  members: DepartmentMember[]
}

export interface AttendanceRecord {
  id: string
  userId: string
  userFullName?: string
  departmentId: string
  departmentName?: string
  date: string
  status: AttendanceStatus
  checkIn: string | null
  checkOut: string | null
  note: string | null
  markedBy: string
  createdAt: string
  updatedAt: string
}

export interface TodaySheetMember {
  userId: string
  fullName: string
  position: string | null
  photoFileId: string | null
  employeeStatus: EmployeeStatus
  rate: number
  attendance: AttendanceRecord | null
}

export interface TodaySheet {
  date: string
  isWorkingDay: boolean
  members: TodaySheetMember[]
}

export interface AttendanceSummary {
  year: number
  month: number
  workingDays: number
  elapsedWorkingDays: number
  presentDays: number
  attendanceRatio: number
  counts: Record<AttendanceStatus, number>
  records: AttendanceRecord[]
}

export interface TaskAssignee {
  id: string
  fullName: string
  position: string | null
  photoFileId: string | null
}

export interface Task {
  id: string
  title: string
  description: string | null
  assigneeId: string
  assignee: TaskAssignee | null
  departmentId: string
  departmentName?: string
  createdBy: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  maxPoints: number
  awardedPoints: number | null
  employeeComment: string | null
  reviewComment: string | null
  submittedAt: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  attachmentFileIds: string[]
  createdAt: string
  updatedAt: string
}

export interface DailyReport {
  id: string
  userId: string
  userFullName: string
  departmentId: string
  date: string
  content: string
  completedTaskIds: string[]
  attachmentFileIds: string[]
  rating: number | null
  ratingComment: string | null
  ratedBy: string | null
  ratedAt: string | null
  pointsAwarded: number
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MissingReportMember {
  userId: string
  fullName: string
  position: string | null
  photoFileId: string | null
}

export interface PointsBreakdown {
  total: number
  task: number
  bonusTask: number
  dailyReport: number
  manual: number
}

export interface PointTransaction {
  id: string
  userId: string
  departmentId: string | null
  points: number
  source: PointSource
  referenceId: string | null
  reason: string | null
  year: number
  month: number
  createdBy: string
  createdAt: string
}

export interface MonthlyKpiSummary {
  id: string
  userId: string
  year: number
  month: number
  totalPoints: number
  taskPoints: number
  bonusPoints: number
  reportPoints: number
  manualPoints: number
  tasksAssigned: number
  tasksVerified: number
  reportsSubmitted: number
  averageReportRating: string
  attendanceRatio: string
  createdAt: string
}

export interface TaskStats {
  assigned: number
  verified: number
  completed: number
}

export interface MyKpi {
  year: number
  month: number
  breakdown: PointsBreakdown
  transactions: PointTransaction[]
  history: MonthlyKpiSummary[]
  tasks: TaskStats
}

export interface LeaderboardEntry {
  userId: string
  fullName: string
  position: string | null
  photoFileId: string | null
  status: EmployeeStatus
  points: PointsBreakdown
  tasks: TaskStats
}

export interface DepartmentKpiSummary {
  departmentId: string
  year: number
  month: number
  memberCount: number
  totalPoints: number
  averagePoints: number
  tasksAssigned: number
  tasksVerified: number
  completionRatio: number
  members: LeaderboardEntry[]
}

export interface PayrollBreakdown {
  baseSalary: number
  totalRate: number
  workingDays: number
  presentDays: number
  attendanceRatio: number
  attendanceAmount: number
  taskPoints: number
  bonusPoints: number
  reportPoints: number
  manualPoints: number
  pointValue: number
  pointsAmount: number
  teamPerformanceRatio: number
  teamBonusAmount: number
  teamPointsAmount: number
  isDepartmentHead: boolean
  departments: Array<{ departmentId: string; departmentName: string; rate: number }>
}

export interface PayrollRecord {
  id: string
  userId: string
  user: TaskAssignee | null
  year: number
  month: number
  baseAmount: number
  attendanceAmount: number
  bonusAmount: number
  deductionAmount: number
  totalAmount: number
  currency: string
  status: PayrollStatus
  breakdown: PayrollBreakdown
  note: string | null
  calculatedBy: string
  calculatedAt: string
  paidBy: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CalendarDayView {
  date: string
  type: CalendarDayType
  title: string | null
  isOverride: boolean
  weekday: number
}

export interface Announcement {
  id: string
  title: string
  body: string
  departmentId: string | null
  departmentName: string | null
  createdBy: string
  isPinned: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PollOption {
  index: number
  label: string
  votes: number | null
  voters?: string[]
}

export interface Poll {
  id: string
  title: string
  description: string | null
  departmentId: string | null
  createdBy: string
  createdByName: string
  isAnonymous: boolean
  closesAt: string | null
  closedAt: string | null
  isClosed: boolean
  totalVotes: number
  myVote: number | null
  options: PollOption[]
  createdAt: string
  updatedAt: string
}

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface OrganizationPublic {
  name: string
  description: string | null
  logoFileId: string | null
  logoUrl: string | null
  primaryColor: string
  currency: string
  timezone: string
}

export interface OrganizationSettings extends OrganizationPublic {
  pointValue: number
  headTeamBonusRate: number
  headPointShareRate: number
  reportDeadlineHour: number
  reportMaxPoints: number
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  actorId: string | null
  actorLogin: string | null
  actorRole: string | null
  action: string
  method: string
  path: string
  entity: string | null
  entityId: string | null
  statusCode: number
  durationMs: number
  ip: string
  userAgent: string
  payload: Record<string, unknown> | null
  query: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
}

export interface UploadedFile {
  id: string
  originalName: string
  mimeType: string
  size: number
  category: 'PHOTO' | 'PASSPORT' | 'LOGO' | 'DOCUMENT'
  ownerUserId: string | null
  url: string
  createdAt: string
}

export interface AttendanceSeriesPoint {
  date: string
  status: AttendanceStatus
  count: string | number
}

export interface PayrollSummaryRow {
  status: PayrollStatus
  count: number
  total: number
}

export interface PayrollTrendPoint {
  year: number
  month: number
  total: number
}

export interface OrganizationWideDashboard {
  period: { year: number; month: number }
  employees: { total: number; byStatus: Record<EmployeeStatus, number>; hiredThisMonth: number; terminatedThisMonth: number }
  departments: number
  attendanceToday: { marked: number; present: number; absent: number; expected: number; ratio: number }
  attendanceSeries: AttendanceSeriesPoint[]
  tasks: { byStatus: Partial<Record<TaskStatus, number>>; overdue: number }
  payroll: PayrollSummaryRow[]
  kpi: { averagePoints: number }
}

export interface SuperadminDashboard extends OrganizationWideDashboard {
  role: 'SUPERADMIN'
  security: {
    activeSessions: number
    logins24h: number
    failedLogins24h: number
    actions24h: number
    topEntities: Array<{ entity: string | null; count: number }>
  }
  payrollTrend: PayrollTrendPoint[]
}

export interface HrDashboard extends OrganizationWideDashboard {
  role: 'HR'
  payrollTrend: PayrollTrendPoint[]
  reportsToday: { submitted: number; rated: number }
  topPerformers: LeaderboardEntry[]
  monthBounds: { start: string; end: string; days: number }
}

export interface HeadDashboard {
  role: 'DEPARTMENT_HEAD'
  period: { year: number; month: number }
  departments: Array<{ id: string; name: string; code: string }>
  team: { members: number }
  attendanceToday: { marked: number; present: number; absent: number; expected: number; ratio: number }
  attendanceSeries: AttendanceSeriesPoint[]
  tasks: { byStatus: Partial<Record<TaskStatus, number>>; overdue: number; pendingReview: number; pendingReviewItems: Task[] }
  reports: { submitted: number; rated: number; missing: number; missingItems: MissingReportMember[] }
  leaderboard: LeaderboardEntry[]
  activePolls: number
}

export interface EmployeeDashboard {
  role: 'EMPLOYEE'
  period: { year: number; month: number }
  points: PointsBreakdown
  pointsHistory: MonthlyKpiSummary[]
  attendance: { workingDays: number; elapsedWorkingDays: number; presentDays: number; ratio: number; counts: Record<AttendanceStatus, number> }
  tasks: { byStatus: Partial<Record<TaskStatus, number>>; overdue: number }
  reportToday: { submitted: boolean; rating?: number | null; pointsAwarded?: number }
  unreadNotifications: number
  latestPayroll: PayrollRecord | null
  activePolls: number
}

export type DashboardPayload = SuperadminDashboard | HrDashboard | HeadDashboard | EmployeeDashboard
