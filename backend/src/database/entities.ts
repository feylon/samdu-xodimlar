import { Announcement } from '../modules/announcements/entities/announcement.entity';
import { AttendanceRecord } from '../modules/attendance/entities/attendance-record.entity';
import { CalendarDay } from '../modules/calendar/entities/calendar-day.entity';
import { DepartmentAssignment } from '../modules/departments/entities/department-assignment.entity';
import { Department } from '../modules/departments/entities/department.entity';
import { MonthlyKpiSummary } from '../modules/kpi/entities/monthly-kpi-summary.entity';
import { PointTransaction } from '../modules/kpi/entities/point-transaction.entity';
import { OrganizationSettings } from '../modules/organization/entities/organization-settings.entity';
import { PayrollRecord } from '../modules/payroll/entities/payroll-record.entity';
import { Task } from '../modules/tasks/entities/task.entity';
import { EmployeeStatusHistory } from '../modules/users/entities/employee-status-history.entity';
import { User } from '../modules/users/entities/user.entity';

export const ENTITIES = [
  User,
  EmployeeStatusHistory,
  OrganizationSettings,
  Department,
  DepartmentAssignment,
  CalendarDay,
  AttendanceRecord,
  Task,
  PointTransaction,
  MonthlyKpiSummary,
  PayrollRecord,
  Announcement,
];
