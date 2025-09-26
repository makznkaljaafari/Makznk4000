import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../../hooks/useLocalization';
import { useAppStore } from '../../../stores/useAppStore';
import { Promotion } from '../../../types';
import { X, Save } from 'lucide-react';
import ToggleSwitch from '../../common/ToggleSwitch';

interface PromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (promoData: Omit<Promotion, 'id' | 'companyId'> & { id?: string }) => void;
    promotion: Promotion | null;
}

const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onClose, onSave, promotion }) => {
    const { t } = useLocalization();
    const { parts } = useAppStore();
    
    const [formData, setFormData] = useState<Omit<Promotion, 'id'|'companyId'>>({
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        applicableTo: 'all',
        applicableIds: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        isActive: true
    });

    useEffect(() => {
        if (promotion) {
            setFormData(promotion);
        } else {
             setFormData({
                name: '', description: '', type: 'percentage', value: 0,
                applicableTo: 'all', applicableIds: [],
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
                isActive: true
            });
        }
    }, [promotion, isOpen]);

    const handleSave = () => {
        onSave({ id: promotion?.id, ...formData });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{promotion ? t('edit_promotion') : t('add_new_promotion')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label>{t('promotion_name')}</label><input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 bg-input rounded-md mt-1"/></div>
                        <div><label>{t('description')}</label><input name="description" value={formData.description} onChange={handleChange} className="w-full p-2 bg-input rounded-md mt-1"/></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label>{t('promotion_type')}</label><select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 bg-input rounded-md mt-1"><option value="percentage">{t('percentage')}</option><option value="fixed_amount">{t('fixed_amount')}</option></select></div>
                        <div><label>{t('value')}</label><input name="value" type="number" value={formData.value} onChange={handleChange} className="w-full p-2 bg-input rounded-md mt-1"/></div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label>{t('applicable_to')}</label><select name="applicableTo" value={formData.applicableTo} onChange={handleChange} className="w-full p-2 bg-input rounded-md mt-1"><option value="all">{t('all_products')}</option><option value="products">{t('specific_products')}</option><option value="categories">{t('specific_categories')}</option></select></div>
                         {(formData.applicableTo === 'products' || formData.applicableTo === 'categories') && <div><label>{t('specific_ids_or_names')}</label><input name="applicableIds" value={(formData.applicableIds || []).join(', ')} onChange={e => setFormData(p => ({...p, applicableIds: e.target.value.split(',').map(s => s.trim())}))} placeholder="ID1, ID2, ..." className="w-full p-2 bg-input rounded-md mt-1"/></div>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label>{t('start_date')}</label><input name="startDate" type="date" value={formData.startDate} onChange={handleChange} className="w-full p-2 bg-input rounded-md mt-1"/></div>
                        <div><label>{t('end_date')}</label><input name="endDate" type="date" value={formData.endDate} onChange={handleChange} className="w-full p-2 bg-input rounded-md mt-1"/></div>
                    </div>
                    <div className="flex items-center justify-between"><label>{t('is_active')}</label><ToggleSwitch enabled={formData.isActive} onChange={v => setFormData(p => ({...p, isActive: v}))}/></div>
                </div>
                 <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground flex items-center gap-2"><Save size={16}/> {t('save')}</button>
                </footer>
            </div>
        </div>
    );
};

export default PromotionModal;