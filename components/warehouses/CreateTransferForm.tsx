

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Warehouse, InventoryMovement, Part, StoreTransfer } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Trash2, Search, RotateCw, ArrowLeft } from 'lucide-react';
import Card from '../common/Card';
import { PartSearchModal, SearchableItem } from '../common/PartSearchModal';
import { useToast } from '../../contexts/ToastContext';

interface FormTransferItem {
    id: number;
    partId: string;
    name: string;
    availableStock: number;
    quantity: number;
}

const getEmptyTransferRow = (): FormTransferItem => ({
    id: Date.now() + Math.random(),
    partId: '',
    name: '',
    availableStock: 0,
    quantity: 1,
});

const CreateTransferForm: React.FC<{onCancel: () => void, onTransferCreated: () => void}> = ({ onCancel, onTransferCreated }) => {
    const { t } = useLocalization();
    const { warehouses, parts, inventoryMovements, setStoreTransfers, setInventoryMovements, partKits, currentUser } = useAppStore();
    const { addToast } = useToast();
    
    const [fromWarehouseId, setFromWarehouseId] = useState<string>(warehouses[0]?.id || '');
    const [toWarehouseId, setToWarehouseId] = useState<string>(warehouses[1]?.id || '');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<FormTransferItem[]>([getEmptyTransferRow()]);
    const [notes, setNotes] = useState('');

    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchModalRowIndex, setSearchModalRowIndex] = useState<number | null>(null);
    
    const getPartStockInWarehouse = useCallback((partId: string, warehouseId: string): number => {
        return inventoryMovements
            .filter(m => m.partId === partId && m.warehouseId === warehouseId)
            .reduce((sum, m) => sum + m.quantity, 0);
    }, [inventoryMovements]);

    const updateItem = (index: number, newValues: Partial<FormTransferItem>) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, ...newValues } : item));
    };

    const handleSelectItemFromModal = (item: SearchableItem) => {
        if (searchModalRowIndex !== null) {
            if (item.type === 'part') {
                const stock = getPartStockInWarehouse(item.id, fromWarehouseId);
                updateItem(searchModalRowIndex, {
                    partId: item.id,
                    name: item.name,
                    availableStock: stock,
                    quantity: 1,
                });
            } else {
                addToast(t('kits_not_supported_in_transfer'), 'info');
            }
        }
        setIsSearchModalOpen(false);
    };
    
    const handleProcessTransfer = () => {
        if (!currentUser) return;
        if (fromWarehouseId === toWarehouseId) {
            addToast(t('error_transfer_to_same_warehouse'), 'error');
            return;
        }

        const validItems = items.filter(i => i.partId && i.quantity > 0);
        if (validItems.length === 0) {
            addToast(t('error_empty_invoice'), 'error'); // Reusing translation
            return;
        }

        for (const item of validItems) {
            if (item.quantity > item.availableStock) {
                const errorMsg = t('error_insufficient_stock_in_warehouse').replace('{partName}', item.name).replace('{stock}', item.availableStock.toString());
                addToast(errorMsg, 'error');
                return;
            }
        }
        
        const newTransferId = `tr-${Date.now().toString().slice(-6)}`;
        const newTransfer: StoreTransfer = {
            id: newTransferId,
            companyId: currentUser.companyId,
            fromWarehouseId,
            toWarehouseId,
            date: transferDate,
            items: validItems.map(i => ({ partId: i.partId, quantity: i.quantity })),
            status: 'Completed',
            notes,
        };

        const newMovements: InventoryMovement[] = [];
        validItems.forEach(item => {
            newMovements.push({
                id: `im-${Date.now().toString().slice(-7)}-out`,
                companyId: currentUser.companyId,
                date: transferDate,
                partId: item.partId,
                warehouseId: fromWarehouseId,
                type: 'Transfer-Out',
                quantity: -item.quantity,
                relatedDocumentId: newTransferId,
            });
            newMovements.push({
                id: `im-${Date.now().toString().slice(-7)}-in`,
                companyId: currentUser.companyId,
                date: transferDate,
                partId: item.partId,
                warehouseId: toWarehouseId,
                type: 'Transfer-In',
                quantity: item.quantity,
                relatedDocumentId: newTransferId,
            });
        });

        setStoreTransfers(prev => [newTransfer, ...prev]);
        setInventoryMovements(prev => [...prev, ...newMovements]);

        addToast(t('transfer_processed_success'), 'success');
        setTimeout(() => onTransferCreated(), 1500);
    };
    
    useEffect(() => {
        // When source warehouse changes, re-calculate available stock for all items
        setItems(prevItems => prevItems.map(item => ({
            ...item,
            availableStock: item.partId ? getPartStockInWarehouse(item.partId, fromWarehouseId) : 0,
        })));
    }, [fromWarehouseId, getPartStockInWarehouse]);

    return (
        <div className="space-y-4">
            <PartSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelectItem={handleSelectItemFromModal} parts={parts} partKits={partKits} priceType="sellingPrice"/>

            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('from_warehouse')}</label>
                        <select value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('to_warehouse')}</label>
                        <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                            {warehouses.filter(w => w.id !== fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('date')}</label>
                        <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                    </div>
                </div>
            </Card>

            <Card className="flex-grow flex flex-col p-4">
                <h3 className="text-lg font-bold mb-2">{t('transfer_items')}</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3 text-start">{t('item')}</th>
                                <th className="px-4 py-3 text-center">{t('available_stock_in_source')}</th>
                                <th className="px-4 py-3 text-center">{t('transfer_quantity')}</th>
                                <th className="w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {items.map((item, index) => (
                                <tr key={item.id}>
                                    <td>
                                        <button type="button" onClick={() => { setSearchModalRowIndex(index); setIsSearchModalOpen(true); }} className="w-full text-start p-2 rounded-md hover:bg-muted flex justify-between items-center text-sm">
                                            <span>{item.name || t('select_a_part')}</span>
                                            <Search size={16}/>
                                        </button>
                                    </td>
                                    <td className="text-center font-bold">{item.partId ? item.availableStock : '-'}</td>
                                    <td>
                                        <input type="number" value={item.quantity} onChange={e => updateItem(index, { quantity: parseInt(e.target.value, 10) || 0 })} min="1" max={item.availableStock} className="w-24 p-1 text-center bg-background border border-input rounded-md" />
                                    </td>
                                    <td>
                                        <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="p-2 border-t border-border mt-2">
                    <button onClick={() => setItems([...items, getEmptyTransferRow()])} className="flex items-center gap-2 text-sm text-primary font-semibold">
                        <Plus size={16} /> {t('add_item')}
                    </button>
                </div>
            </Card>
            
            <div className="flex items-center gap-4 pt-4 border-t border-border">
                <button onClick={handleProcessTransfer} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors">
                    <RotateCw size={18} /><span>{t('process_transfer')}</span>
                </button>
                <button onClick={onCancel} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-secondary/80">
                    <ArrowLeft size={18} /><span>{t('back_to_list')}</span>
                </button>
            </div>
        </div>
    );
};

export default CreateTransferForm;
