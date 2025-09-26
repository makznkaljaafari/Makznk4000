
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Account, AccountType } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X } from 'lucide-react';

const AccountModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<Account, 'id' | 'balance' | 'isActive'> & { id?: string }) => void;
  account: Account | null;
}> = ({ isOpen, onClose, onSave, account }) => {
    const { t } = useLocalization();
    const { chartOfAccounts, currentUser } = useAppStore();
    
    const initialFormState = {
        name: '',
        type: 'Asset' as AccountType,
        parentAccountId: null as string | null,
    };
    
    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (account) {
            setFormData({
                name: account.name,
                type: account.type,
                parentAccountId: account.parentAccountId,
            });
        } else {
            setFormData(initialFormState);
        }
        setErrors({});
    }, [account, isOpen]);
    
    const parentAccountOptions = useMemo(() => {
        return chartOfAccounts
            .filter(acc => acc.id !== account?.id) // Prevent self-parenting
            .map(acc => ({ value: acc.id, label: `${acc.id} - ${acc.name}` }));
    }, [chartOfAccounts, account]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = t('field_required');
        if (!formData.type) newErrors.type = t('field_required');
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !currentUser) return;
        onSave({ 
            id: account?.id, 
            companyId: account?.companyId || currentUser.companyId,
            ...formData 
        });
    };

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
    };

    const accountTypes: AccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{account ? t('edit_account') : t('add_new_account')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('account_name')}</label>
                        <input name="name" value={formData.name} onChange={handleChange} autoFocus className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.name ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`} />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('account_type')}</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                                {accountTypes.map(type => <option key={type} value={type}>{t(type)}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('parent_account')}</label>
                             <select name="parentAccountId" value={formData.parentAccountId || 'null'} onChange={handleChange} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                                 <option value="null">{t('no_parent')}</option>
                                {parentAccountOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{t('save')}</button>
                </footer>
            </div>
        </div>
    );
};

export default AccountModal;
