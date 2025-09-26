

import React, { useState, useEffect } from 'react';
import { Supplier } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X } from 'lucide-react';

const SupplierModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Omit<Supplier, 'id' | 'companyId'> & { id?: string }) => void;
  supplier: Supplier | null;
}> = ({ isOpen, onClose, onSave, supplier }) => {
    const { t } = useLocalization();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [errors, setErrors] = useState<{ name?: string, phone?: string }>({});

    useEffect(() => {
        if (supplier) {
            setName(supplier.name);
            setPhone(supplier.phone);
            setWhatsappNumber(supplier.whatsappNumber || '');
            setContactPerson(supplier.contactPerson);
        } else {
            // Reset for new supplier
            setName('');
            setPhone('');
            setWhatsappNumber('');
            setContactPerson('');
        }
        setErrors({}); // Clear errors on open
    }, [supplier, isOpen]);

    const validate = () => {
        const newErrors: { name?: string, phone?: string } = {};
        if (!name.trim()) newErrors.name = t('field_required');
        if (!phone.trim()) newErrors.phone = t('field_required');
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave({
            id: supplier?.id,
            name,
            phone,
            whatsappNumber,
            contactPerson,
            totalDebt: supplier?.totalDebt ?? 0,
            creditLimit: supplier?.creditLimit ?? 5000, // Default credit limit
            paymentHistory: supplier?.paymentHistory ?? [],
            paymentTermsDays: supplier?.paymentTermsDays
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{supplier ? t('edit_supplier') : t('add_new_supplier')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="supplier-name" className="block text-sm font-medium text-muted-foreground">{t('supplier_name')}</label>
                        <input
                            id="supplier-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.name ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
                            autoFocus
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="supplier-phone" className="block text-sm font-medium text-muted-foreground">{t('phone')}</label>
                        <input
                            id="supplier-phone"
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.phone ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
                        />
                        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                        <label htmlFor="supplier-whatsapp" className="block text-sm font-medium text-muted-foreground">{t('whatsapp_number')}</label>
                        <input
                            id="supplier-whatsapp"
                            type="text"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="supplier-contact" className="block text-sm font-medium text-muted-foreground">{t('contact_person')}</label>
                        <input
                            id="supplier-contact"
                            type="text"
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                        />
                    </div>
                </div>
                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">{t('close')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{t('save')}</button>
                </footer>
            </div>
        </div>
    );
};

export default SupplierModal;