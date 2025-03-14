import { UserRole } from '../enums';

export interface AuthenticatedUser {
  id: string;
  login: string;
  role: UserRole;
  sessionId: string;
  fullName: string;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  sid: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}
