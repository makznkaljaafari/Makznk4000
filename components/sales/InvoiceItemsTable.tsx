import React, { useState, useEffect, useRef } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Trash2, Search, Sparkles, ChevronDown, ChevronRight, Box, PackageSearch, Columns, Copy } from 'lucide-react';
import { FormInvoiceItem } from '../../hooks/useInvoiceCalculator';
import { Part } from '../../types';

interface InvoiceItemsTableProps {
    items: FormInvoiceItem[];
    onUpdateItem: (index: number, newValues: Partial<FormInvoiceItem>) => void;
    onRemoveItem: (id: number) => void;
    onRemoveItems: (ids: number[]) => void;
    onCopyItems: (ids: number[]) => void;
    onAddItem: () => void;
    onSearchPart: (index: number) => void;
    onGeneratePitch?: (index: number) => void;
    parts: Part[];
    openAiAssistant?: (prompt?: string | null, payload?: any) => void;
}

const allColumns = [
    { key: 'item', label: 'item', minWidth: '300px', defaultVisible: true },
    { key: 'quantity', label: 'quantity', width: '112px', defaultVisible: true },
    { key: 'price', label: 'price', width: '128px', defaultVisible: true },
    { key: 'discountPercent', label: 'discount_percent', width: '128px', defaultVisible: true },
    { key: 'discountAmount', label: 'discount_amount', width: '128px', defaultVisible: false },
    { key: 'notes', label: 'notes', minWidth: '200px', defaultVisible: false },
    { key: 'total', label: 'total', width: '160px', defaultVisible: true },
];

const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
    items, onUpdateItem, onRemoveItem, onRemoveItems, onCopyItems, onAddItem,
    onSearchPart, onGeneratePitch, parts, openAiAssistant
}) => {
    const { t } = useLocalization();
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [selectedIds, setSelectedIds] = useState(new Set<number>());
    const [visibleColumns, setVisibleColumns] = useState(new Set(allColumns.filter(c => c.defaultVisible).map(c => c.key)));
    const [isColumnsDropdownOpen, setIsColumnsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsColumnsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
    };

    const toggleRow = (id: number) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(items.map(item => item.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleSelectRow = (id: number, isChecked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };
    
    const handleDeleteSelected = () => {
        onRemoveItems(Array.from(selectedIds));
        setSelectedIds(new Set());
    };
    
    const handleCopySelected = () => {
        onCopyItems(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    return (
        <div className="flex-grow flex flex-col border border-border rounded-lg bg-card shadow-sm">
            {/* Toolbar */}
            <div className="p-2 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                     {selectedIds.size > 0 ? (
                         <>
                            <span className="text-sm font-semibold text-primary">{t('items_selected', { count: selectedIds.size })}</span>
                            <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-600 px-2 py-1 rounded-md hover:bg-red-500/20"><Trash2 size={14}/> {t('delete')}</button>
                            <button onClick={handleCopySelected} className="flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-500/20"><Copy size={14}/> {t('copy')}</button>
                         </>
                     ) : (
                         <div></div>
                     )}
                </div>
                 <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setIsColumnsDropdownOpen(p => !p)} className="flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg hover:bg-muted"><Columns size={16}/> {t('columns')}</button>
                    {isColumnsDropdownOpen && (
                        <div className="absolute top-full end-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-20 p-2">
                            {allColumns.map(col => (
                                <label key={col.key} className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-md text-sm">
                                    <input type="checkbox" checked={visibleColumns.has(col.key)} onChange={() => toggleColumn(col.key)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary"/>
                                    {t(col.label)}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* Table */}
            <div className="flex-grow overflow-y-auto">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="p-3 w-12"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size === items.length && items.length > 0} /></th>
                                <th className="px-2 py-3 w-10 text-center">#</th>
                                {allColumns.map(col => visibleColumns.has(col.key) && <th key={col.key} className="px-4 py-3 text-start" style={{minWidth: col.minWidth, width: col.width}}>{t(col.label)}</th>)}
                                <th className="px-2 py-3 w-20 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                             {items.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <tr className={`hover:bg-accent align-middle ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}>
                                        <td className="p-3"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={e => handleSelectRow(item.id, e.target.checked)} /></td>
                                        <td className="px-2 py-1 text-center font-medium text-muted-foreground">{index + 1}</td>
                                        {visibleColumns.has('item') && <td className="px-2 py-1">
                                            {item.type === 'kit' ? (
                                                <div className="flex items-center gap-2 p-2">
                                                    <button onClick={() => toggleRow(item.id)} className="text-muted-foreground hover:text-primary">{expandedRows.has(item.id) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button>
                                                    <Box size={16} className="text-primary"/><span className="font-bold text-primary">{item.name}</span>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => onSearchPart(index)} className="w-full text-start p-2 rounded-md hover:bg-muted flex justify-between items-center text-sm">
                                                    <span className={item.name ? 'text-foreground font-medium' : 'text-muted-foreground'}>{item.name || t('select_a_part')}</span>
                                                    <Search size={16} className="text-muted-foreground rtl:ms-0 rtl:me-2 ltr:me-0 ltr:ms-2"/>
                                                </button>
                                            )}
                                        </td>}
                                        {visibleColumns.has('quantity') && <td className="px-2 py-1"><input type="number" min="0" value={item.quantity} onChange={e => onUpdateItem(index, { quantity: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{ direction: 'ltr' }} /></td>}
                                        {visibleColumns.has('price') && <td className="px-2 py-1"><input type="number" min="0" value={item.price} onChange={e => onUpdateItem(index, { price: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{ direction: 'ltr' }} disabled={item.type === 'kit'} /></td>}
                                        {visibleColumns.has('discountPercent') && <td className="px-2 py-1"><input type="number" min="0" max="100" value={item.discountPercent} onChange={e => onUpdateItem(index, { discountPercent: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{ direction: 'ltr' }} /></td>}
                                        {visibleColumns.has('discountAmount') && <td className="px-2 py-1"><input type="number" min="0" value={item.discountAmount} onChange={e => onUpdateItem(index, { discountAmount: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{ direction: 'ltr' }} /></td>}
                                        {visibleColumns.has('notes') && <td className="px-2 py-1"><input type="text" value={item.notes} onChange={e => onUpdateItem(index, { notes: e.target.value })} className="w-full bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" /></td>}
                                        {visibleColumns.has('total') && <td className="px-4 py-1 text-center font-bold text-foreground">{item.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>}
                                        <td className="px-2 py-1 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {openAiAssistant && (
                                                    <button onClick={() => { const part = parts.find(p => p.id === item.partId); if (part) openAiAssistant(null, { type: 'find_alternatives', data: part }); }} disabled={!item.partId || item.type === 'kit'} className="text-blue-500 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed" title={t('find_alternatives')}><PackageSearch size={16} /></button>
                                                )}
                                                {onGeneratePitch && (
                                                    <button onClick={() => onGeneratePitch(index)} disabled={!item.partId} className="text-primary hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed" title={t('generate_sales_pitch')}><Sparkles size={16} /></button>
                                                )}
                                                <button onClick={() => onRemoveItem(item.id)} className="text-red-500 hover:text-red-700" title={t('remove_item')}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                    {item.type === 'kit' && expandedRows.has(item.id) && (
                                        <tr className="bg-muted/30"><td colSpan={allColumns.length + 3} className="p-0"><div className="p-2 ps-16"><p className="text-xs font-bold text-muted-foreground mb-1">{t('kit_components')}:</p><ul className="text-xs text-muted-foreground space-y-1">{item.kitItems?.map(kitComp => (<li key={kitComp.partId} className="flex justify-between items-center"><span>- {kitComp.name}</span><span>({t('quantity')}: {kitComp.quantityPerKit})</span></li>))}</ul></div></td></tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="p-2 border-t border-border">
                <button onClick={onAddItem} className="flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary/90 transition-colors"><Plus size={16} />{t('add_item')}</button>
            </div>
        </div>
    );
};

export default InvoiceItemsTable;
