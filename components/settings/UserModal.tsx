
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { User, Warehouse, UserRole, UserStatus } from '../../types';
import { X } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

const UserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Omit<User, 'id' | 'passwordHash'> & { id?: string; password?: string }) => void;
  user: User | null;
  warehouses: Warehouse[];
}> = ({ isOpen, onClose, onSave, user, warehouses }) => {
    const { t } = useLocalization();
    const { currentUser } = useAppStore();
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole | ''>('');
    const [assignedWarehouseId, setAssignedWarehouseId] = useState<string | ''>('');
    const [status, setStatus] = useState<UserStatus>('Active');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isInviteMode = !user;

    useEffect(() => {
        if (user) {
            setFullName(user.fullName);
            setUsername(user.username);
            setRole(user.role);
            setAssignedWarehouseId(user.assignedWarehouseId || '');
            setStatus(user.status);
            setPassword('');
            setConfirmPassword('');
        } else {
            setFullName('');
            setUsername('');
            setPassword('');
            setConfirmPassword('');
            setRole('');
            setAssignedWarehouseId('');
            setStatus('Invited');
        }
        setErrors({});
    }, [user, isOpen]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!fullName.trim()) newErrors.fullName = t('field_required');
        if (!username.trim()) newErrors.username = t('field_required');
        if (!role) newErrors.role = t('field_required');

        // Password is only required if being changed for an existing user
        if (password || !user) {
            if (password !== confirmPassword) newErrors.confirmPassword = t('passwords_do_not_match');
        }
        
        if (role === 'Salesperson' || role === 'Warehouse Manager') {
            if (!assignedWarehouseId) newErrors.assignedWarehouseId = t('field_required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !currentUser) return;
        onSave({
            id: user?.id,
            companyId: user?.companyId || currentUser.companyId,
            fullName,
            username,
            password: password || undefined,
            role: role as UserRole,
            assignedWarehouseId: (role === 'Salesperson' || role === 'Warehouse Manager') ? assignedWarehouseId : undefined,
            status,
        });
    };

    if (!isOpen) return null;

    const userRoles: UserRole[] = ['Administrator', 'Salesperson', 'Warehouse Manager', 'Accountant'];
    const userStatuses: UserStatus[] = ['Active', 'Inactive', 'Invited'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{isInviteMode ? t('invite_user') : t('edit_user')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('user_full_name')}</label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.fullName ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`} />
                            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('username_email')}</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.username ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`} />
                            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('role')}</label>
                            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.role ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}>
                                <option value="" disabled>{t('select_role')}</option>
                                {userRoles.map(r => <option key={r} value={r}>{t(r)}</option>)}
                            </select>
                            {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
                        </div>
                        {(role === 'Salesperson' || role === 'Warehouse Manager') && (
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('assigned_warehouse')}</label>
                             <select value={assignedWarehouseId} onChange={e => setAssignedWarehouseId(e.target.value)} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.assignedWarehouseId ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}>
                                <option value="" disabled>{t('select_warehouse')}</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            {errors.assignedWarehouseId && <p className="text-xs text-red-500 mt-1">{errors.assignedWarehouseId}</p>}
                        </div>
                        )}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('status')}</label>
                        <select value={status} onChange={e => setStatus(e.target.value as UserStatus)} className="mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm" disabled={isInviteMode}>
                            {userStatuses.map(s => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
                        </select>
                    </div>
                    {!isInviteMode && (
                         <div className="pt-4 border-t border-border">
                            <p className="text-sm font-semibold mb-2">{t('change_password')}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground">{t('password')}</label>
                                    <p className="text-xs text-muted-foreground">{t('password_leave_blank')}</p>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.password ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`} />
                                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground">{t('confirm_password')}</label>
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.confirmPassword ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`} />
                                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{t('save')}</button>
                </footer>
            </div>
        </div>
    );
};

export default UserModal;