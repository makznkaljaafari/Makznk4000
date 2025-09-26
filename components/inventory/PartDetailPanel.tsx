

import React, { useEffect, useRef } from 'react';
import { Part } from '../../types';
import SidePanel from '../common/SidePanel';
import { useLocalization } from '../../hooks/useLocalization';
import { DollarSign, Archive, AlertCircle, Hash, Tag, MapPin, FileText, Calculator } from 'lucide-react';
import Card from '../common/Card';
import { useAppStore } from '../../stores/useAppStore';

interface PartDetailPanelProps {
    part: Part | null;
    onClose: () => void;
}

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: string | number, valueClass?: string }> = ({ icon: Icon, label, value, valueClass = '' }) => (
    <div className="flex items-center justify-between text-sm py-2">
        <div className="flex items-center gap-2 text-muted-foreground">
            <Icon size={16} />
            <span>{label}</span>
        </div>
        <span className={`font-semibold text-foreground ${valueClass}`}>{value}</span>
    </div>
);


const PartDetailPanel: React.FC<PartDetailPanelProps> = ({ part, onClose }) => {
    const { t, lang } = useLocalization();
    const { openAiAssistant } = useAppStore();
    const hasTriggeredRef = useRef(false);

    useEffect(() => {
        if (part && part.stock <= part.minStock && !hasTriggeredRef.current) {
            const prompt = `لاحظت أن مخزون "${part.name}" (${part.partNumber}) منخفض. هل تود المساعدة في إنشاء أمر شراء له؟`;
            openAiAssistant(prompt);
            hasTriggeredRef.current = true;
        }
        // Reset when the panel is closed or the part changes
        return () => {
            hasTriggeredRef.current = false;
        };
    }, [part, openAiAssistant, t]);
    
    if (!part) return null;

    return (
        <SidePanel isOpen={!!part} onClose={onClose} title={t('part_details')}>
            <div className="space-y-6">
                <div className="text-center">
                    <img src={part.imageUrl} alt={part.name} className="w-40 h-40 object-cover rounded-lg mx-auto shadow-md border-4 border-card" />
                    <h3 className="text-2xl font-bold mt-4">{part.name}</h3>
                    <p className="text-muted-foreground">{part.brand}</p>
                </div>
                
                <Card>
                    <DetailRow icon={Hash} label={t('part_number')} value={part.partNumber} valueClass="font-mono"/>
                    <DetailRow icon={Tag} label={t('category')} value={part.category || 'N/A'} />
                    <DetailRow icon={MapPin} label={t('location')} value={part.location} />
                </Card>

                <Card>
                    <h4 className="font-bold mb-2 text-primary">{t('pricing_and_stock')}</h4>
                    <DetailRow icon={Archive} label={t('stock')} value={part.stock} valueClass={part.stock <= part.minStock ? 'text-red-500' : 'text-green-500'}/>
                    <DetailRow icon={AlertCircle} label={t('minimum_stock')} value={part.minStock} />
                    <DetailRow icon={DollarSign} label={t('purchase_price')} value={`${part.purchasePrice.toLocaleString()} ${lang === 'ar' ? 'р.с' : 'SAR'}`} />
                     <DetailRow icon={Calculator} label={t('average_cost')} value={`${(part.averageCost || part.purchasePrice).toLocaleString('en-US', {minimumFractionDigits: 2})} ${lang === 'ar' ? 'р.с' : 'SAR'}`} />
                    <DetailRow icon={DollarSign} label={t('selling_price')} value={`${part.sellingPrice.toLocaleString()} ${lang === 'ar' ? 'р.с' : 'SAR'}`} />
                </Card>
                
                <Card>
                    <h4 className="font-bold mb-2 text-primary">{t('compatible_models')}</h4>
                    {part.compatibleModels.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                           {part.compatibleModels.map((model, i) => <li key={i}>{model}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('no_compatible_models')}</p>
                    )}
                </Card>
                
                 <Card>
                    <h4 className="font-bold mb-2 text-primary">{t('alternative_part_numbers')}</h4>
                    {part.alternativePartNumbers.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                           {part.alternativePartNumbers.map((num, i) => <li key={i} className="font-mono">{num}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('no_alternative_parts')}</p>
                    )}
                </Card>

                <Card>
                     <h4 className="font-bold mb-2 text-primary">{t('notes')}</h4>
                     <p className="text-sm text-muted-foreground">{part.notes || 'N/A'}</p>
                </Card>
            </div>
        </SidePanel>
    );
};

export default PartDetailPanel;
