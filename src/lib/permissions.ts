export type AppRole = 'admin' | 'manager' | 'reception' | 'financial' | 'profissional';

export type Permission =
  | 'dashboard'
  | 'agenda'
  | 'patients'
  | 'receivables'
  | 'payables'
  | 'cashflow'
  | 'reports'
  | 'settings'
  | 'doctors'
  | 'availability';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: ['dashboard', 'agenda', 'patients', 'receivables', 'payables', 'cashflow', 'reports', 'settings', 'doctors', 'availability'],
  manager: ['dashboard', 'agenda', 'patients', 'receivables', 'payables', 'cashflow', 'reports', 'doctors', 'availability'],
  reception: ['dashboard', 'agenda', 'patients'],
  financial: ['dashboard', 'receivables', 'payables', 'cashflow', 'reports'],
  profissional: ['dashboard', 'agenda', 'patients', 'availability'],
};

export function getPermissions(role: string | null): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as AppRole] || [];
}

export function hasPermission(role: string | null, permission: Permission): boolean {
  return getPermissions(role).includes(permission);
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  reception: 'Recepção',
  financial: 'Financeiro',
  profissional: 'Profissional',
};
