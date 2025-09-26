
import React, { useState, useEffect } from 'react';
import { Warehouse } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

const WarehouseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (warehouse: Omit<Warehouse, 'id' | 'companyId'> & { id?: string }) => void;
  warehouse: Warehouse | null;
}> = ({ isOpen, onClose, onSave, warehouse }) => {
    const { t } = useLocalization();
    const { currentUser } = useAppStore();
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [manager, setManager] = useState('');
    const [phone, setPhone] = useState('');
    const [errors, setErrors] = useState<{ name?: string, location?: string, manager?: string }>({});

    useEffect(() => {
        if (warehouse) {
            setName(warehouse.name);
            setLocation(warehouse.location);
            setManager(warehouse.manager);
            setPhone(warehouse.phone || '');
        } else {
            setName('');
            setLocation('');
            setManager('');
            setPhone('');
        }
        setErrors({});
    }, [warehouse, isOpen]);

    const validate = () => {
        const newErrors: { name?: string, location?: string, manager?: string } = {};
        if (!name.trim()) newErrors.name = t('field_required');
        if (!location.trim()) newErrors.location = t('field_required');
        if (!manager.trim()) newErrors.manager = t('field_required');
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !currentUser) return;
        onSave({
            id: warehouse?.id,
            name,
            location,
            manager,
            phone,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{warehouse ? t('edit_warehouse') : t('add_new_warehouse')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="warehouse-name" className="block text-sm font-medium text-muted-foreground">{t('warehouse_name')}</label>
                        <input
                            id="warehouse-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                            className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.name ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
                            autoFocus
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="warehouse-location" className="block text-sm font-medium text-muted-foreground">{t('warehouse_location')}</label>
                        <input
                            id="warehouse-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                            className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.location ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
                        />
                        {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
                    </div>
                    <div>
                        <label htmlFor="warehouse-manager" className="block text-sm font-medium text-muted-foreground">{t('warehouse_manager')}</label>
                        <input
                            id="warehouse-manager" type="text" value={manager} onChange={(e) => setManager(e.target.value)}
                             className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.manager ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
                        />
                         {errors.manager && <p className="text-xs text-red-500 mt-1">{errors.manager}</p>}
                    </div>
                    <div>
                        <label htmlFor="warehouse-phone" className="block text-sm font-medium text-muted-foreground">{t('phone')}</label>
                        <input
                            id="warehouse-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                        />
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

export default WarehouseModal;
