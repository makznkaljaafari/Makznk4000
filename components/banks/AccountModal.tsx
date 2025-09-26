import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { FinancialAccount } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import { X, Plus, Trash2 } from 'lucide-react';

const InputField: React.FC<{
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string;
  type?: string;
  autoFocus?: boolean;
  options?: { value: string; label: string }[];
  as?: 'select' | 'textarea' | 'input';
  rows?: number;
  note?: string;
  disabled?: boolean;
}> = ({ label, name, value, onChange, error, type = 'text', autoFocus = false, as = 'input', options, rows, note, disabled=false }) => {
    const { t } = useLocalization();
    return (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{t(label)}</label>
        {as === 'select' ? (
             <select id={name} name={name} value={value} onChange={onChange} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}>
                {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
        ) : as === 'textarea' ? (
            <textarea id={name} name={name} value={String(value)} onChange={onChange} rows={rows} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}/>
        ) : (
            <input
                id={name} name={name} type={type} value={value} onChange={onChange} autoFocus={autoFocus}
                className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
                disabled={disabled}
            />
        )}
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
)};


const AccountModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<FinancialAccount, 'id'> & { id?: string }) => void;
  account: FinancialAccount | null;
}> = ({ isOpen, onClose, onSave, account }) => {
    const { t } = useLocalization();
    const { currencies, currentUser } = useAppStore();
    const [formData, setFormData] = useState({
        name: '', type: 'bank' as 'bank' | 'cash', bankName: '', accountNumber: '', iban: '', balances: [{ currencyId: currencies[0]?.id, balance: 0 }]
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    useEffect(() => {
        if (account) {
            setFormData({
                name: account.name,
                type: account.type,
                bankName: account.bankName || '',
                accountNumber: account.accountNumber || '',
                iban: account.iban || '',
                balances: account.balances.length > 0 ? account.balances : [{ currencyId: currencies[0]?.id, balance: 0 }],
            });
        } else {
             setFormData({ name: '', type: 'bank', bankName: '', accountNumber: '', iban: '', balances: [{ currencyId: currencies[0]?.id, balance: 0 }] });
        }
        setErrors({});
    }, [account, isOpen, currencies]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = t('field_required');
        if (formData.type === 'bank' && !formData.bankName?.trim()) newErrors.bankName = t('field_required');
        if (formData.type === 'bank' && !formData.accountNumber?.trim()) newErrors.accountNumber = t('field_required');
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !currentUser) return;
        onSave({ 
            id: account?.id, 
            companyId: account?.companyId || currentUser.companyId,
            ...formData,
            balances: formData.balances.filter(b => b.balance > 0)
        });
    };

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleBalanceChange = (index: number, field: 'currencyId' | 'balance', value: string | number) => {
        const newBalances = [...formData.balances];
        newBalances[index] = {...newBalances[index], [field]: value};
        setFormData(prev => ({...prev, balances: newBalances}));
    };
    
    const addBalanceRow = () => {
        setFormData(prev => ({...prev, balances: [...prev.balances, { currencyId: currencies[0]?.id, balance: 0}]}));
    }
    
    const removeBalanceRow = (index: number) => {
        if (formData.balances.length > 1) {
            setFormData(prev => ({...prev, balances: prev.balances.filter((_, i) => i !== index)}));
        }
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{account ? t('edit_account') : t('add_new_account')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="account_name" name="name" value={formData.name} onChange={handleChange} error={errors.name} autoFocus />
                        <InputField label="account_type" name="type" value={formData.type} onChange={handleChange} as="select" options={[{value: 'bank', label: t('bank')}, {value: 'cash', label: t('cash')}]} />
                    </div>
                    {formData.type === 'bank' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="bank_name" name="bankName" value={formData.bankName} onChange={handleChange} error={errors.bankName} />
                                <InputField label="account_number" name="accountNumber" value={formData.accountNumber} onChange={handleChange} error={errors.accountNumber}/>
                            </div>
                             <InputField label="iban" name="iban" value={formData.iban} onChange={handleChange} />
                        </>
                    )}
                    <div className="pt-4 border-t border-dashed">
                        <h3 className="text-md font-semibold">{t('initial_balance')}</h3>
                        <div className="space-y-2 mt-2">
                           {formData.balances.map((balance, index) => (
                               <div key={index} className="grid grid-cols-3 gap-2 items-center">
                                   <select value={balance.currencyId} onChange={e => handleBalanceChange(index, 'currencyId', e.target.value)} className="w-full bg-background border-input border rounded-md p-2">
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                   </select>
                                   <input type="number" value={balance.balance} onChange={e => handleBalanceChange(index, 'balance', Number(e.target.value))} className="w-full bg-background border-input border rounded-md p-2 col-span-1"/>
                                    <button onClick={() => removeBalanceRow(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50" disabled={formData.balances.length <= 1}><Trash2 size={16}/></button>
                               </div>
                           ))}
                           <button onClick={addBalanceRow} className="flex items-center gap-2 text-sm text-primary"><Plus size={14}/> {t('add_balance')}</button>
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