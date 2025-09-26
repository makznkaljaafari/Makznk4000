
import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Trash2, Search, Sparkles, ChevronDown, ChevronRight, Box, PackageSearch } from 'lucide-react';
import { FormInvoiceItem } from '../../hooks/useInvoiceCalculator';
import { Part } from '../../types';

interface InvoiceItemsTableProps {
    items: FormInvoiceItem[];
    onUpdateItem: (index: number, newValues: Partial<FormInvoiceItem>) => void;
    onRemoveItem: (id: number) => void;
    onAddItem: () => void;
    onSearchPart: (index: number) => void;
    onGeneratePitch: (index: number) => void;
    parts: Part[];
    openAiAssistant: (prompt?: string | null, payload?: any) => void;
}

const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
    items,
    onUpdateItem,
    onRemoveItem,
    onAddItem,
    onSearchPart,
    onGeneratePitch,
    parts,
    openAiAssistant
}) => {
    const { t } = useLocalization();
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const toggleRow = (id: number) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    return (
        <div className="flex-grow overflow-y-auto border border-border rounded-lg bg-card shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                        <tr>
                            <th className="px-2 py-3 w-10 text-center">#</th>
                            <th className="px-4 py-3 min-w-[300px] text-start">{t('item')}</th>
                            <th className="px-2 py-3 w-28 text-center">{t('quantity')}</th>
                            <th className="px-2 py-3 w-32 text-center">{t('price')}</th>
                            <th className="px-2 py-3 w-32 text-center">{t('discount_percent')}</th>
                            <th className="px-2 py-3 w-32 text-center">{t('discount_amount')}</th>
                            <th className="px-4 py-3 min-w-[200px] text-start">{t('notes')}</th>
                            <th className="px-4 py-3 w-40 text-center">{t('total')}</th>
                            <th className="px-2 py-3 w-20 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                         {items.map((item, index) => (
                             <React.Fragment key={item.id}>
                                <tr className="hover:bg-accent align-middle">
                                    <td className="px-2 py-1 text-center font-medium text-muted-foreground">{index + 1}</td>
                                    <td className="px-2 py-1">
                                        {item.type === 'kit' ? (
                                             <div className="flex items-center gap-2 p-2">
                                                <button onClick={() => toggleRow(item.id)} className="text-muted-foreground hover:text-primary">
                                                    {expandedRows.has(item.id) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                                </button>
                                                <Box size={16} className="text-primary"/>
                                                <span className="font-bold text-primary">{item.name}</span>
                                             </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => onSearchPart(index)}
                                                className="w-full text-start p-2 rounded-md hover:bg-muted flex justify-between items-center text-sm"
                                            >
                                                <span className={item.name ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                                    {item.name || t('select_a_part')}
                                                </span>
                                                <Search size={16} className="text-muted-foreground rtl:ms-0 rtl:me-2 ltr:me-0 ltr:ms-2"/>
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-2 py-1"><input type="number" min="0" value={item.quantity} onChange={e => onUpdateItem(index, { quantity: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{ direction: 'ltr' }} /></td>
                                    <td className="px-2 py-1"><input type="number" min="0" value={item.price} onChange={e => onUpdateItem(index, { price: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{ direction: 'ltr' }} disabled={item.type === 'kit'} /></td>
                                    <td className="px-2 py-1"><input type="number" min="0" max="100" value={item.discountPercent} onChange={e => onUpdateItem(index, { discountPercent: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{ direction: 'ltr' }} /></td>
                                    <td className="px-2 py-1"><input type="number" min="0" value={item.discountAmount} onChange={e => onUpdateItem(index, { discountAmount: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{ direction: 'ltr' }} /></td>
                                    <td className="px-2 py-1"><input type="text" value={item.notes} onChange={e => onUpdateItem(index, { notes: e.target.value })} className="w-full bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" /></td>
                                    <td className="px-4 py-1 text-center font-bold text-foreground">{item.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="px-2 py-1 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    const part = parts.find(p => p.id === item.partId);
                                                    if (part) {
                                                        openAiAssistant(null, { type: 'find_alternatives', data: part });
                                                    }
                                                }} 
                                                disabled={!item.partId || item.type === 'kit'}
                                                className="text-blue-500 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed" 
                                                title={t('find_alternatives')}
                                            >
                                                <PackageSearch size={16} />
                                            </button>
                                            <button 
                                                onClick={() => onGeneratePitch(index)} 
                                                disabled={!item.partId}
                                                className="text-primary hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed" 
                                                title={t('generate_sales_pitch')}
                                            >
                                                <Sparkles size={16} />
                                            </button>
                                            <button 
                                                onClick={() => onRemoveItem(item.id)} 
                                                className="text-red-500 hover:text-red-700" 
                                                title={t('remove_item')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {item.type === 'kit' && expandedRows.has(item.id) && (
                                     <tr className="bg-muted/30">
                                        <td colSpan={9} className="p-0">
                                            <div className="p-2 ps-16">
                                                <p className="text-xs font-bold text-muted-foreground mb-1">{t('kit_components')}:</p>
                                                <ul className="text-xs text-muted-foreground space-y-1">
                                                {item.kitItems?.map(kitComp => (
                                                    <li key={kitComp.partId} className="flex justify-between items-center">
                                                        <span>- {kitComp.name}</span>
                                                        <span>({t('quantity')}: {kitComp.quantityPerKit})</span>
                                                    </li>
                                                ))}
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="p-2 border-t border-border">
                <button onClick={onAddItem} className="flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary/90 transition-colors">
                    <Plus size={16} />
                    {t('add_item')}
                </button>
            </div>
        </div>
    );
};

export default InvoiceItemsTable;