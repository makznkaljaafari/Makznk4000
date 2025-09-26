

import { UserRole } from '../types';

export type Permission = 
  | 'view_dashboard'
  | 'manage_customers'
  | 'view_customers'
  | 'view_sales'
  | 'manage_sales'
  | 'view_purchases'
  | 'manage_purchases'
  | 'view_warehouses'
  | 'manage_warehouses'
  | 'manage_inventory'
  | 'view_accounting'
  | 'manage_accounting'
  | 'view_banks'
  | 'manage_banks'
  | 'view_reports'
  | 'view_ai_features'
  | 'manage_smart_import'
  | 'manage_settings'
  | 'manage_users'
  | 'view_notifications'
  | 'access_customer_portal'
  | 'access_supplier_portal';

export const rolePermissions: Record<UserRole, Set<Permission>> = {
    Administrator: new Set([
        'view_dashboard', 'view_customers', 'manage_customers',
        'view_sales', 'manage_sales', 'view_purchases', 'manage_purchases', 'view_warehouses',
        'manage_warehouses',
        'manage_inventory',
        'view_accounting', 'manage_accounting', 'view_banks', 'manage_banks',
        'view_reports', 'view_ai_features', 'manage_smart_import', 'manage_settings', 'manage_users',
        'view_notifications', 'access_customer_portal', 'access_supplier_portal'
    ]),
    Salesperson: new Set([
        'view_dashboard', 'view_customers', 'manage_customers', 'view_sales',
        'manage_sales', 'view_notifications', 'access_customer_portal'
    ]),
    'Warehouse Manager': new Set([
        'view_dashboard', 'view_purchases', 'manage_purchases',
        'view_warehouses', 'manage_warehouses',
        'manage_inventory',
        'view_notifications'
    ]),
    Accountant: new Set([
        'view_dashboard', 'view_accounting', 'manage_accounting', 'view_banks', 'manage_banks',
        'view_reports', 'view_notifications', 'view_customers'
    ]),
};

export const hasPermission = (role: UserRole | undefined, permission: Permission): boolean => {
    if (!role) return false;
    return rolePermissions[role]?.has(permission) ?? false;
};