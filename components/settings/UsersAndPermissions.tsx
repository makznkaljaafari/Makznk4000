
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { User } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import InteractiveTable from '../common/InteractiveTable';
import { Plus, Edit, Trash2 } from 'lucide-react';
import UserModal from './UserModal';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';
import { usePermissions } from '../../hooks/usePermissions';

const UsersAndPermissions: React.FC = () => {
    const { t } = useLocalization();
    const { users: allUsers, setUsers, warehouses, currentUser } = useAppStore();
    const { hasPermission } = usePermissions();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    const users = useMemo(() => allUsers.filter(u => u.companyId === currentUser?.companyId), [allUsers, currentUser]);

    const warehousesMap = useMemo(() => new Map(warehouses.map(w => [w.id, w.name])), [warehouses]);

    const handleAddNew = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (userId: string) => {
        setUserToDelete(userId);
    };
    
    const handleConfirmDelete = () => {
        if(userToDelete) {
            setUsers(prev => prev.filter(u => u.id !== userToDelete));
            addToast(t('user_deleted_success'), 'success');
        }
        setUserToDelete(null);
    };
    
    const handleSave = (userData: Omit<User, 'id' | 'passwordHash'> & { id?: string; password?: string }) => {
        if (!currentUser) return;
        if (userData.id) { // Editing
            setUsers(prev => prev.map(u => {
                if (u.id === userData.id) {
                    const updatedUser = {...u, ...userData};
                    if (userData.password) {
                        updatedUser.passwordHash = `hashed_${userData.password}`;
                    }
                    delete (updatedUser as any).password;
                    return updatedUser as User;
                }
                return u;
            }));
            addToast(t('user_saved_success'), 'success');
        } else { // Inviting new
            const newUser: User = {
                ...userData,
                id: `user-${Date.now().toString().slice(-6)}`,
                companyId: currentUser.companyId,
                passwordHash: undefined, // No password for invited user
            };
            setUsers(prev => [newUser, ...prev]);
            addToast(t('user_invited_success'), 'success');
        }
        setIsModalOpen(false);
    };

    const columns = useMemo(() => [
        { Header: t('user_full_name'), accessor: 'fullName', width: 250, Cell: ({ row }: { row: User }) => <span className="font-medium">{row.fullName}</span> },
        { Header: t('username_email'), accessor: 'username', width: 250 },
        { Header: t('role'), accessor: 'role', width: 200, Cell: ({row}: {row: User}) => t(row.role) },
        { Header: t('assigned_warehouse'), accessor: 'assignedWarehouseId', width: 200, Cell: ({row}: {row: User}) => warehousesMap.get(row.assignedWarehouseId || '') || '-' },
        { 
            Header: t('status'), 
            accessor: 'status', 
            width: 150,
            Cell: ({ row }: { row: User }) => {
                const statusColor = {
                    Active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                    Inactive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                    Invited: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
                }[row.status] || 'bg-muted text-muted-foreground';
                return (
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                        {t(row.status.toLowerCase())}
                    </span>
                )
            }
        },
        {
            Header: t('actions'),
            accessor: 'actions',
            width: 150,
            Cell: ({ row }: { row: User }) => (
                hasPermission('manage_users') && (
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => handleEdit(row)} className="text-primary hover:text-primary/80 transition-colors" title={t('edit_user')}><Edit size={18} /></button>
                        <button onClick={() => handleDeleteClick(row.id)} className="text-red-500 hover:text-red-700 transition-colors" title={t('delete_user')}><Trash2 size={18} /></button>
                    </div>
                )
            ),
        }
    ], [t, warehousesMap, hasPermission]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <UserModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                user={selectedUser}
                warehouses={warehouses}
            />
            <ConfirmationModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={t('delete_user')}
                message={t('delete_user_confirm')}
            />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <h2 className="text-2xl font-bold">{t('users_permissions')}</h2>
                {hasPermission('manage_users') && (
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={20} />
                        <span>{t('invite_user')}</span>
                    </button>
                )}
            </div>
            
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={users} setData={setUsers} />
            </div>
        </div>
    );
};

export default UsersAndPermissions;