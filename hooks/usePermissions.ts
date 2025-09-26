
import { useAppStore } from '../stores/useAppStore';
import { hasPermission as checkPermission, Permission } from '../utils/permissions';

export const usePermissions = () => {
    const { currentUser } = useAppStore();
    const role = currentUser?.role;

    const hasPermission = (permission: Permission) => {
        return checkPermission(role, permission);
    };

    return { hasPermission, role };
};
