export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  HR = 'HR',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  EMPLOYEE = 'EMPLOYEE',
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  sid: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}

export const PRIVILEGED_ROLES: readonly UserRole[] = [UserRole.SUPERADMIN, UserRole.HR];

export const isPrivilegedRole = (role: UserRole): boolean => PRIVILEGED_ROLES.includes(role);
