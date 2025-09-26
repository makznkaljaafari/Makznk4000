

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import { Part } from '../../types';
import InteractiveTable from '../common/InteractiveTable';
import { Sparkles, PackagePlus, PackageSearch, Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { getPricingSuggestion } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import AiPriceSuggestionModal from './AiPriceSuggestionModal';
import BulkPriceUpdateModal from './BulkPriceUpdateModal';
import Card from '../common/Card';

const PricingManagementTab: React.FC = () => {
    const { t, lang } = useLocalization();
    const { parts, sales, setParts, currentUser, bulkUpdatePartPrices } = useAppStore();
    const { addToast } = useToast();

    const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
    const [suggestingForPartId, setSuggestingForPartId] = useState<string | null>(null);
    const [aiSuggestion, setAiSuggestion] = useState<{ part: Part; suggestion: { suggestedPrice: number; reason: string; } } | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const partsForCompany = useMemo(() => parts.filter(p => p.companyId === currentUser?.companyId), [parts, currentUser]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPartIds(new Set(partsForCompany.map(p => p.id)));
        } else {
            setSelectedPartIds(new Set());
        }
    };
    
    const handleSuggestPrice = async (part: Part) => {
        setSuggestingForPartId(part.id);
        try {
            const result = await getPricingSuggestion(part, sales);
            if (result) {
                setAiSuggestion({ part, suggestion: result });
            } else {
                addToast(t('failed_to_get_pricing_suggestion'), 'error');
            }
        } catch(error) {
            addToast(t((error as Error).message), 'error');
        } finally {
            setSuggestingForPartId(null);
        }
    };

    const handleApplyAISuggestion = (partId: string, newPrice: number) => {
        bulkUpdatePartPrices([{ partId, newSellingPrice: newPrice }]);
        addToast(t('price_updated'), 'success');
        setAiSuggestion(null);
    };

    const columns = useMemo(() => [
        { 
            Header: <input type="checkbox" onChange={handleSelectAll} checked={selectedPartIds.size === partsForCompany.length && partsForCompany.length > 0} />,
            accessor: 'select',
            width: 50,
            Cell: ({ row }: { row: Part }) => (
                <div className="flex justify-center">
                    <input type="checkbox" checked={selectedPartIds.has(row.id)} onChange={() => setSelectedPartIds(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(row.id)) newSet.delete(row.id);
                        else newSet.add(row.id);
                        return newSet;
                    })} />
                </div>
            )
        },
        { Header: t('part_name'), accessor: 'name', width: 300 },
        { Header: t('part_number'), accessor: 'partNumber', width: 150 },
        { Header: t('brand'), accessor: 'brand', width: 150 },
        { Header: t('purchase_price'), accessor: 'purchasePrice', width: 150, Cell: ({row}: { row: Part }) => `${row.purchasePrice.toLocaleString()} ${lang === 'ar' ? 'р.с' : 'SAR'}` },
        { Header: t('selling_price'), accessor: 'sellingPrice', width: 150, Cell: ({row}: { row: Part }) => `${row.sellingPrice.toLocaleString()} ${lang === 'ar' ? 'р.с' : 'SAR'}` },
        { Header: t('average_cost'), accessor: 'averageCost', width: 150, Cell: ({row}: { row: Part }) => `${(row.averageCost || row.purchasePrice).toLocaleString()} ${lang === 'ar' ? 'р.с' : 'SAR'}` },
        { Header: t('actions'), accessor: 'actions', width: 120, Cell: ({row}: { row: Part }) => (
            <button
                onClick={(e) => { e.stopPropagation(); handleSuggestPrice(row); }}
                disabled={suggestingForPartId === row.id}
                className="flex items-center gap-1 text-primary text-xs font-semibold hover:text-primary/80 disabled:opacity-50"
            >
                {suggestingForPartId === row.id ? <Spinner className="w-4 h-4" /> : <Sparkles size={16} />}
                <span>{t('suggest_price')}</span>
            </button>
        )}
    ], [t, lang, selectedPartIds, partsForCompany, suggestingForPartId]);

    return (
        <div className="h-full flex flex-col gap-4">
            <AiPriceSuggestionModal 
                isOpen={!!aiSuggestion}
                onClose={() => setAiSuggestion(null)}
                data={aiSuggestion}
                onApply={handleApplyAISuggestion}
            />
            <BulkPriceUpdateModal 
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                selectedPartIds={Array.from(selectedPartIds)}
                onUpdateComplete={() => setSelectedPartIds(new Set())}
            />
            <div className={`transition-all duration-300 ${selectedPartIds.size > 0 ? 'h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
                {selectedPartIds.size > 0 && (
                     <Card className="flex justify-between items-center p-4">
                        <span className="font-bold">{t('items_selected', {count: selectedPartIds.size})}</span>
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                        >
                            <PackagePlus size={18} />
                            <span>{t('update_selected_prices')}</span>
                        </button>
                    </Card>
                )}
            </div>
            <div className="flex-grow">
                 <InteractiveTable 
                    columns={columns} 
                    data={partsForCompany} 
                    setData={setParts} 
                    emptyState={{
                        icon: <PackageSearch size={48} />,
                        title: t('no_parts_to_price'),
                        message: t('no_parts_to_price_desc'),
                    }}
                 />
            </div>
        </div>
    );
};

export default PricingManagementTab;
