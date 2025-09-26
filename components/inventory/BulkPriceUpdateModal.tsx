
import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { X, Save } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';

interface BulkPriceUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPartIds: string[];
    onUpdateComplete: () => void;
}

const BulkPriceUpdateModal: React.FC<BulkPriceUpdateModalProps> = ({ isOpen, onClose, selectedPartIds, onUpdateComplete }) => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { parts, bulkUpdatePartPrices } = useAppStore();

    const [targetField, setTargetField] = useState<'sellingPrice' | 'purchasePrice'>('sellingPrice');
    const [updateType, setUpdateType] = useState<'set' | 'increase_percent' | 'decrease_percent' | 'increase_amount' | 'decrease_amount'>('set');
    const [value, setValue] = useState<number | ''>('');

    if (!isOpen) return null;

    const handleApplyUpdate = () => {
        if (value === '' || selectedPartIds.length === 0) {
            addToast(t('please_fill_all_fields'), 'error'); // Need to add translation
            return;
        }

        const updates: { partId: string; newSellingPrice?: number; newPurchasePrice?: number }[] = [];
        const numericValue = Number(value);

        for (const partId of selectedPartIds) {
            const part = parts.find(p => p.id === partId);
            if (part) {
                let newPrice: number;
                const currentPrice = part[targetField];

                switch (updateType) {
                    case 'set':
                        newPrice = numericValue;
                        break;
                    case 'increase_percent':
                        newPrice = currentPrice * (1 + numericValue / 100);
                        break;
                    case 'decrease_percent':
                        newPrice = currentPrice * (1 - numericValue / 100);
                        break;
                    case 'increase_amount':
                        newPrice = currentPrice + numericValue;
                        break;
                    case 'decrease_amount':
                        newPrice = currentPrice - numericValue;
                        break;
                    default:
                        newPrice = currentPrice;
                }

                updates.push({
                    partId,
                    ...(targetField === 'sellingPrice' && { newSellingPrice: Math.max(0, parseFloat(newPrice.toFixed(2))) }),
                    ...(targetField === 'purchasePrice' && { newPurchasePrice: Math.max(0, parseFloat(newPrice.toFixed(2))) }),
                });
            }
        }
        
        bulkUpdatePartPrices(updates);
        addToast(t('prices_updated_successfully'), 'success');
        onUpdateComplete();
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                 <header className="flex justify-between items-center pb-4 border-b border-border">
                    <h2 className="text-xl font-bold">{t('bulk_price_update')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>

                 <div className="p-6 space-y-4">
                    <p className="text-muted-foreground">{t('items_selected', { count: selectedPartIds.length })}</p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('target_field')}</label>
                        <select value={targetField} onChange={e => setTargetField(e.target.value as any)} className="w-full p-2 bg-input border-border rounded-lg">
                            <option value="sellingPrice">{t('selling_price')}</option>
                            <option value="purchasePrice">{t('purchase_price')}</option>
                        </select>
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">{t('update_type')}</label>
                        <select value={updateType} onChange={e => setUpdateType(e.target.value as any)} className="w-full p-2 bg-input border-border rounded-lg">
                            <option value="set">{t('set_to_new_value')}</option>
                            <option value="increase_percent">{t('increase_by_percentage')}</option>
                            <option value="decrease_percent">{t('decrease_by_percentage')}</option>
                            <option value="increase_amount">{t('increase_by_amount')}</option>
                            <option value="decrease_amount">{t('decrease_by_amount')}</option>
                        </select>
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">{t('update_value')} {updateType.includes('percent') && '(%)'}</label>
                        <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} className="w-full p-2 bg-input border-border rounded-lg" />
                    </div>
                </div>
                 <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                    <button onClick={handleApplyUpdate} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                        <Save size={18} />
                        {t('apply_update')}
                    </button>
                </footer>
            </Card>
        </div>
    );
};

export default BulkPriceUpdateModal;
