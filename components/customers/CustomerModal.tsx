

import React, { useState, useMemo, useEffect } from 'react';
import { Customer } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';


const InputField: React.FC<{label: string, name: string, value: string, onChange: any, error?: string, type?: string, autoFocus?: boolean}> = 
({label, name, value, onChange, error, type = 'text', autoFocus = false}) => (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{label}</label>
        <input
            id={name} name={name} type={type} value={value} onChange={onChange} autoFocus={autoFocus}
            className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
);


const CustomerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'companyId' | 'totalDebt' | 'paymentHistory'> & { id?: string }) => void;
  customer: Customer | null;
}> = ({ isOpen, onClose, onSave, customer }) => {
    const { t } = useLocalization();
    const { users, customerSettings } = useAppStore();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        whatsappNumber: '',
        address: '',
        creditLimit: 0,
        notes: '',
        defaultPaymentType: 'credit' as 'cash' | 'credit',
        assignedSalespersonId: '',
        tier: ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    const salespeople = useMemo(() => users.filter(u => u.role === 'Salesperson' && u.status === 'Active'), [users]);
    const { customerTiers } = customerSettings;

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name,
                phone: customer.phone,
                email: customer.email || '',
                whatsappNumber: customer.whatsappNumber || '',
                address: customer.address,
                creditLimit: customer.creditLimit,
                notes: customer.notes || '',
                defaultPaymentType: customer.defaultPaymentType,
                assignedSalespersonId: customer.assignedSalespersonId || '',
                tier: customer.tier || ''
            });
        } else {
            setFormData({ name: '', phone: '', email: '', whatsappNumber: '', address: '', creditLimit: 0, notes: '', defaultPaymentType: 'credit', assignedSalespersonId: '', tier: '' });
        }
        setErrors({});
    }, [customer, isOpen]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = t('field_required');
        if (!formData.phone.trim()) newErrors.phone = t('field_required');
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave({ id: customer?.id, ...formData, assignedSalespersonId: formData.assignedSalespersonId || undefined });
    };

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'creditLimit' ? Number(value) : value }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{customer ? t('edit_customer') : t('add_new_customer')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label={t('customer_name')} name="name" value={formData.name} onChange={handleChange} error={errors.name} autoFocus />
                        <InputField label={t('phone')} name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label={t('email')} name="email" value={formData.email} onChange={handleChange} error={errors.email} />
                        <InputField label={t('whatsapp_number')} name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} />
                     </div>
                    <InputField label={t('address')} name="address" value={formData.address} onChange={handleChange} />
                    
                    <div className="pt-4 border-t border-dashed">
                        <h3 className="text-md font-semibold text-primary">{t('customer_specific_settings')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <InputField label={t('credit_limit')} name="creditLimit" type="number" value={String(formData.creditLimit)} onChange={handleChange} />
                             <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('default_payment_type')}</label>
                                <select name="defaultPaymentType" value={formData.defaultPaymentType} onChange={handleChange} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                                    <option value="credit">{t('credit')}</option>
                                    <option value="cash">{t('cash')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('assigned_salesperson')}</label>
                                <select name="assignedSalespersonId" value={formData.assignedSalespersonId} onChange={handleChange} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                                    <option value="">{t('no_salesperson')}</option>
                                    {salespeople.map(sp => <option key={sp.id} value={sp.id}>{sp.fullName}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('customer_tier')}</label>
                                <select name="tier" value={formData.tier} onChange={handleChange} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                                    <option value="">{t('no_tier')}</option>
                                    {(customerTiers || []).map(tier => <option key={tier} value={tier}>{tier}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                   
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('notes')}</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
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

export default CustomerModal;
