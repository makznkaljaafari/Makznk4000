

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, AlertTriangle, PackageSearch, X, Printer } from 'lucide-react';
import Card from '../common/Card';
import { Part } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { findPartsFromSmartSearch } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import InteractiveTable from '../common/InteractiveTable';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import TableSkeleton from '../common/TableSkeleton';
import ConfirmationModal from '../common/ConfirmationModal';
import PartDetailPanel from './PartDetailPanel';
import PartModal from './PartModal';
import { usePermissions } from '../../hooks/usePermissions';
import { updatePart } from '../../services/databaseService';
import BarcodePrintPreview from './BarcodePrintPreview';

const ItemList: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
    const { t, lang } = useLocalization();
    const { parts: allParts, setParts: setInventory, focusedItem, setFocusedItem, inventoryFilter, setInventoryFilter, currentUser, updatePart: updatePartInStore } = useAppStore();
    const { hasPermission } = usePermissions();
    const [filteredInventory, setFilteredInventory] = useState<Part[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState('all');
    const [brandFilter, setBrandFilter] = useState('all');
    const [isSearching, setIsSearching] = useState(false);
    const { addToast } = useToast();
    
    const [editingPart, setEditingPart] = useState<Part | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [partToDelete, setPartToDelete] = useState<string | null>(null);
    const [detailPart, setDetailPart] = useState<Part | null>(null);
    const [selectedIds, setSelectedIds] = useState(new Set<string>());
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    
    const inventory = useMemo(() => allParts.filter(p => p.companyId === currentUser?.companyId), [allParts, currentUser]);

    const brands = useMemo(() => Array.from(new Set(inventory.map(p => p.brand))), [inventory]);

    useEffect(() => {
        if (focusedItem?.type === 'part') {
            const partToFocus = inventory.find(p => p.id === focusedItem.id);
            if (partToFocus) {
                setDetailPart(partToFocus);
                setFocusedItem(null);
            }
        }
    }, [focusedItem, inventory, setFocusedItem]);

    useEffect(() => {
        let isCancelled = false;
        let baseFiltered = [...inventory];
        
        if (inventoryFilter?.type === 'category') {
            baseFiltered = baseFiltered.filter(p => p.category?.toLowerCase() === inventoryFilter.value.toLowerCase());
        }
        
        if (inventoryFilter?.type === 'stock_level' && inventoryFilter.value === 'low') {
             baseFiltered = baseFiltered.filter(p => p.stock > 0 && p.stock <= p.minStock);
             setStockFilter('low'); // Sync dropdown with dashboard click
             setInventoryFilter(null); // Clear filter after applying
        }


        if (stockFilter !== 'all') {
             baseFiltered = baseFiltered.filter(p => {
                if (stockFilter === 'low') return p.stock <= p.minStock && p.stock > 0;
                if (stockFilter === 'out') return p.stock === 0;
                if (stockFilter === 'in') return p.stock > p.minStock;
                return true;
            });
        }
        if (brandFilter !== 'all') {
            baseFiltered = baseFiltered.filter(p => p.brand === brandFilter);
        }

        if (!searchTerm.trim()) {
            setFilteredInventory(baseFiltered);
            setIsSearching(false);
            return;
        }

        const performSearch = async () => {
            setIsSearching(true);
            try {
                const results = await findPartsFromSmartSearch(searchTerm, baseFiltered);
                if (!isCancelled) setFilteredInventory(results || []);
            } catch (error) {
                if (!isCancelled) {
                    addToast(t((error as Error).message) || 'failed_to_perform_smart_search', 'error');
                    const lowerCaseSearch = searchTerm.toLowerCase();
                    setFilteredInventory(baseFiltered.filter(p => 
                        p.name.toLowerCase().includes(lowerCaseSearch) ||
                        p.partNumber.toLowerCase().includes(lowerCaseSearch)
                    ));
                }
            } finally {
                if (!isCancelled) setIsSearching(false);
            }
        };

        const timer = setTimeout(performSearch, 500);
        return () => { clearTimeout(timer); isCancelled = true; };
    }, [searchTerm, inventory, inventoryFilter, addToast, t, stockFilter, brandFilter, setInventoryFilter]);

    const handleEdit = (part: Part) => {
        setEditingPart(part);
        setIsModalOpen(true);
    };

    const handleSavePart = async (updatedPart: Part) => {
        try {
            const savedPart = await updatePart(updatedPart.id, updatedPart);
            updatePartInStore(savedPart);
            addToast(t('item_updated_success'), 'success');
            setIsModalOpen(false);
        } catch (error) {
            addToast(t('failed_to_update_item'), 'error');
            console.error(error);
        }
    };

    const handleDeleteClick = (partId: string) => setPartToDelete(partId);

    const handleConfirmDelete = () => {
        if (partToDelete) {
            setInventory(prev => prev.filter(p => p.id !== partToDelete));
            addToast(t('item_deleted'), 'success');
        }
        setPartToDelete(null);
    };
    
    const FilterPill: React.FC<{label: string, onClear: () => void}> = ({label, onClear}) => (
         <div className="bg-primary/10 text-primary p-2 rounded-md flex justify-between items-center text-sm">
            <span className="font-semibold">{label}</span>
            <button onClick={onClear} className="flex items-center gap-1 font-bold hover:bg-primary/20 p-1 rounded-full"><X size={16}/></button>
        </div>
    );
    
    const partsToPrint = useMemo(() => inventory.filter(p => selectedIds.has(p.id)), [inventory, selectedIds]);

    const columns = useMemo(() => [
        { Header: t('serial_number'), accessor: 'serial', width: 50, Cell: ({ rowIndex }: { rowIndex: number }) => <div className="text-center text-muted-foreground">{rowIndex + 1}</div> },
        { Header: t('product_code'), accessor: 'id', width: 140 },
        { Header: t('part_name'), accessor: 'name', width: 250, Cell: ({ row }: { row: Part }) => <div className="flex items-center gap-3"><img src={row.imageUrl} alt={row.name} className="w-10 h-10 rounded-lg object-cover" loading="lazy" /><span className="font-medium text-foreground whitespace-nowrap">{row.name}</span></div> },
        { Header: t('part_number'), accessor: 'partNumber', width: 150 },
        { Header: t('brand'), accessor: 'brand', width: 120 },
        { Header: t('category'), accessor: 'category', width: 120, Cell: ({ row }: { row: Part }) => row.category || '-' },
        { Header: t('stock'), accessor: 'stock', width: 100, Cell: ({ row }: { row: Part }) => <div className={`flex items-center justify-center gap-2 font-bold ${row.stock === 0 ? 'text-gray-400' : row.stock <= row.minStock ? 'text-red-500' : 'text-green-500'}`}>{row.stock <= row.minStock && row.stock > 0 && <AlertTriangle size={16} />}<span>{row.stock}</span></div> },
        { Header: t('selling_price'), accessor: 'sellingPrice', width: 120, Cell: ({ row }: { row: Part }) => `${row.sellingPrice.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`},
        { Header: t('purchase_price'), accessor: 'purchasePrice', width: 120, Cell: ({ row }: { row: Part }) => `${row.purchasePrice.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`},
        { Header: t('actions'), accessor: 'actions', width: 100, Cell: ({ row }: { row: Part }) => (
            <div className="flex items-center justify-center gap-4">
            {hasPermission('manage_inventory') && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="text-primary hover:text-primary/80 transition-colors"><Edit size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id); }} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={18} /></button>
                </>
            )}
            </div>
        )},
    ], [t, lang, hasPermission]);

    return (
        <div className="space-y-4 h-full flex flex-col">
             <PartDetailPanel part={detailPart} onClose={() => setDetailPart(null)} />
             <PartModal part={editingPart} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePart} />
             <ConfirmationModal isOpen={!!partToDelete} onClose={() => setPartToDelete(null)} onConfirm={handleConfirmDelete} title={t('delete_item')} message={t('delete_item_confirm')} />
             {isPrintModalOpen && <BarcodePrintPreview parts={partsToPrint} onClose={() => setIsPrintModalOpen(false)} />}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-grow w-full sm:w-auto">
                    <input type="text" placeholder={t('search_inventory')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-lg p-2 ps-10 border border-input bg-background rounded-md focus:ring-2 focus:ring-ring" />
                    <div className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground">
                        {isSearching ? <Spinner className="w-5 h-5" /> : <Search size={20} />}
                    </div>
                </div>
                 <div className="flex gap-2">
                    <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="p-2 bg-background border border-input rounded-md text-sm">
                        <option value="all">{t('all_stock_statuses')}</option>
                        <option value="in">{t('in_stock')}</option>
                        <option value="low">{t('low_stock')}</option>
                        <option value="out">{t('out_of_stock')}</option>
                    </select>
                     <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="p-2 bg-background border border-input rounded-md text-sm">
                        <option value="all">{t('all_brands')}</option>
                        {brands.map((b: string) => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                {hasPermission('manage_inventory') && (
                    <div className="flex items-center gap-2">
                         <button onClick={() => setIsPrintModalOpen(true)} disabled={selectedIds.size === 0} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-muted disabled:opacity-50">
                            <Printer size={18} /><span>{t('print_barcodes')}</span>
                        </button>
                        <button onClick={() => setActiveTab('add_new_item')} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90">
                            <Plus size={20} /><span>{t('add_new_item')}</span>
                        </button>
                    </div>
                )}
            </div>
             <div className="flex flex-wrap gap-2">
                 {inventoryFilter && <FilterPill label={`${t('category')}: ${inventoryFilter.value}`} onClear={() => setInventoryFilter(null)} />}
            </div>
            <Card className="flex-grow flex flex-col p-0">
                <div className="flex-grow">
                     {isSearching ? <div className="p-4"><TableSkeleton /></div> : <InteractiveTable selection={{selectedIds, onSelectionChange: setSelectedIds}} onRowClick={(row) => setDetailPart(row as Part)} columns={columns} data={filteredInventory} setData={setInventory} emptyState={{ icon: <PackageSearch size={48} />, title: t('no_parts_found'), message: t('no_parts_found_desc'), action: (hasPermission('manage_inventory') && <button onClick={() => setActiveTab('add_new_item')} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"><Plus size={20} /><span>{t('add_new_item')}</span></button>) }} />}
                </div>
            </Card>
        </div>
    );
};

export default ItemList;