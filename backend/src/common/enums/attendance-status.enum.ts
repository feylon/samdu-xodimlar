export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
  REMOTE = 'REMOTE',
}

export const COUNTED_AS_PRESENT: AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.REMOTE,
];
