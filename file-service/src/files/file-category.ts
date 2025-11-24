import { UserRole } from '../auth/auth.types';

export enum FileCategory {
  PHOTO = 'PHOTO',
  PASSPORT = 'PASSPORT',
  LOGO = 'LOGO',
  DOCUMENT = 'DOCUMENT',
}

export const MIME_JPEG = 'image/jpeg';
export const MIME_PNG = 'image/png';
export const MIME_WEBP = 'image/webp';
export const MIME_SVG = 'image/svg+xml';
export const MIME_PDF = 'application/pdf';
export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MIME_TEXT = 'text/plain';

const RASTER_IMAGE_MIMES: readonly string[] = [MIME_JPEG, MIME_PNG, MIME_WEBP];

export const ALLOWED_MIME_TYPES_BY_CATEGORY: Readonly<Record<FileCategory, readonly string[]>> = {
  [FileCategory.PHOTO]: RASTER_IMAGE_MIMES,
  [FileCategory.LOGO]: [...RASTER_IMAGE_MIMES, MIME_SVG],
  [FileCategory.PASSPORT]: [...RASTER_IMAGE_MIMES, MIME_PDF],
  [FileCategory.DOCUMENT]: [...RASTER_IMAGE_MIMES, MIME_PDF, MIME_DOCX, MIME_XLSX, MIME_TEXT],
};

export const UPLOAD_ROLES_BY_CATEGORY: Readonly<Record<FileCategory, readonly UserRole[]>> = {
  [FileCategory.LOGO]: [UserRole.SUPERADMIN],
  [FileCategory.PHOTO]: [UserRole.SUPERADMIN, UserRole.HR],
  [FileCategory.PASSPORT]: [UserRole.SUPERADMIN, UserRole.HR],
  [FileCategory.DOCUMENT]: Object.values(UserRole),
};

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  [MIME_JPEG]: 'jpg',
  [MIME_PNG]: 'png',
  [MIME_WEBP]: 'webp',
  [MIME_SVG]: 'svg',
  [MIME_PDF]: 'pdf',
  [MIME_DOCX]: 'docx',
  [MIME_XLSX]: 'xlsx',
  [MIME_TEXT]: 'txt',
};

export const PUBLIC_CATEGORIES: readonly FileCategory[] = [FileCategory.PHOTO, FileCategory.LOGO];

export const isPublicCategory = (category: FileCategory): boolean =>
  PUBLIC_CATEGORIES.includes(category);

export const isMimeAllowedForCategory = (category: FileCategory, mimeType: string): boolean =>
  ALLOWED_MIME_TYPES_BY_CATEGORY[category].includes(mimeType);

export const canRoleUploadCategory = (role: UserRole, category: FileCategory): boolean =>
  UPLOAD_ROLES_BY_CATEGORY[category].includes(role);

export const extensionForMime = (mimeType: string): string | undefined => EXTENSION_BY_MIME[mimeType];

export const buildStorageKey = (category: FileCategory, fileId: string, extension: string): string =>
  `${category.toLowerCase()}/${fileId}.${extension}`;
