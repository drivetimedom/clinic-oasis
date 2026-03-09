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
  | 'availability'
  | 'procedures'
  | 'stock'
  | 'billing'
  | 'commissions'
  | 'financial_reports'
  | 'consent'
  | 'team'
  | 'crm'
  | 'planning';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: ['dashboard', 'agenda', 'patients', 'receivables', 'payables', 'cashflow', 'reports', 'settings', 'doctors', 'availability', 'procedures', 'stock', 'billing', 'commissions', 'financial_reports', 'consent', 'team', 'crm', 'planning'],
  manager: ['dashboard', 'agenda', 'patients', 'receivables', 'payables', 'cashflow', 'reports', 'doctors', 'availability', 'procedures', 'stock', 'billing', 'commissions', 'financial_reports', 'consent', 'team', 'crm', 'planning'],
  reception: ['dashboard', 'agenda', 'patients', 'consent', 'crm'],
  financial: ['dashboard', 'receivables', 'payables', 'cashflow', 'reports', 'billing', 'commissions', 'financial_reports'],
  profissional: ['dashboard', 'agenda', 'patients', 'availability', 'procedures', 'consent', 'crm'],
};

export function getPermissions(role: string | null): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as AppRole] || [];
}

/** Apply clinic-specific overrides on top of static defaults */
export function getPermissionsWithOverrides(
  role: string | null,
  overrides: { role: string; permission: string; enabled: boolean }[]
): Permission[] {
  if (!role) return [];
  if (role === 'admin') return ROLE_PERMISSIONS.admin;
  const defaults = new Set(ROLE_PERMISSIONS[role as AppRole] || []);
  for (const o of overrides) {
    if (o.role !== role) continue;
    if (o.enabled) defaults.add(o.permission as Permission);
    else defaults.delete(o.permission as Permission);
  }
  return Array.from(defaults);
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
