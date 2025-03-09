export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  VACATION = 'VACATION',
  SICK_LEAVE = 'SICK_LEAVE',
  TERMINATED = 'TERMINATED',
  BLOCKED = 'BLOCKED',
}

export const LOGIN_FORBIDDEN_STATUSES: EmployeeStatus[] = [
  EmployeeStatus.TERMINATED,
  EmployeeStatus.BLOCKED,
];

export const WORKING_STATUSES: EmployeeStatus[] = [EmployeeStatus.ACTIVE];
