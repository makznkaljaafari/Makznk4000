
import React, { useState, useEffect } from 'react';
import { Part } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { useAppStore } from '../../stores/useAppStore';

const PartModal: React.FC<{ part: Part | null; isOpen: boolean; onClose: () => void; onSave: (part: Part) => void; }> = ({ part, isOpen, onClose, onSave }) => {
    const { t } = useLocalization();
    const [formData, setFormData] = useState<Part | null>(part);
    const { currentUser } = useAppStore();

    useEffect(() => {
        setFormData(part);
    }, [part]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSave = () => {
        if (formData) {
            const dataToSave: Part = {
                ...formData,
                companyId: formData.companyId || currentUser?.companyId || ''
            };
            onSave(dataToSave);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <Card className="w-full max-w-2xl">
                 <h2 className="text-xl font-bold mb-4">{t('edit')} {formData.name}</h2>
                 {/* A simplified edit form; a full form would be more extensive */}
                 <div className="space-y-4">
                    <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 bg-input rounded-md" />
                    <input name="partNumber" value={formData.partNumber} onChange={handleChange} className="w-full p-2 bg-input rounded-md" />
                    <input name="sellingPrice" type="number" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: parseFloat(e.target.value)})} className="w-full p-2 bg-input rounded-md" />
                 </div>
                 <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md bg-primary text-primary-foreground">{t('save')}</button>
                 </div>
            </Card>
        </div>
    );
};

export default PartModal;
