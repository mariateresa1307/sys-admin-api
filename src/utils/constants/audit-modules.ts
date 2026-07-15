// src/utils/constants/audit-modules.ts

export const AUDIT_MODULES = {
    AUTH: 'AUTH',
    USERS: 'USERS',
    TICKETS: 'TICKETS',
    SERVICES: 'SERVICES',
    MISCELLANEOUS: 'MISCELLANEOUS',
    AUDIT: 'AUDIT',
    REPORTES: 'REPORTES',
} as const;

export type AuditModule = (typeof AUDIT_MODULES)[keyof typeof AUDIT_MODULES];