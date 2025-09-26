

import React, { useState, useMemo, useCallback } from 'react';
import { Sale, SalesReturn, Part, Customer, InventoryMovement, PurchaseOrder, PurchaseReturn } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import InteractiveTable from '../common/InteractiveTable';
import Card from '../common/Card';
import { Plus, Search, ArrowLeft, RotateCw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ReturnItem extends ReturnType<typeof createReturnItem> {}

const createReturnItem = (poItem: PurchaseOrder['items'][0], part: Part | undefined) => ({
    partId: poItem.partId,
    name: part?.name || 'Unknown',
    purchasedQty: poItem.quantity,
    price: poItem.purchasePrice,
    returnQty: 0,
});

const CreatePurchaseReturnForm: React.FC<{
    onCancel: () => void;
    onReturnCreated: () => void;
}> = ({ onCancel, onReturnCreated }) => {
    const { t, lang } = useLocalization();
    const { purchaseOrders, parts, setParts, setPurchaseReturns, warehouseSettings, setInventoryMovements, currentUser } = useAppStore();
    const { addToast } = useToast();
    
    const [originalInvoiceId, setOriginalInvoiceId] = useState('');
    const [foundInvoice, setFoundInvoice] = useState<PurchaseOrder | null>(null);
    const [itemsToReturn, setItemsToReturn] = useState<ReturnItem[]>([]);
    const [reason, setReason] = useState('');

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);

    const handleFindInvoice = useCallback(() => {
        const po = purchaseOrders.find(p => p.id === originalInvoiceId.trim() && p.status === 'Received');
        if (po) {
            const returnItems = po.items.map(item => {
                const part = partsMap.get(item.partId);
                return createReturnItem(item, part);
            });
            setFoundInvoice(po);
            setItemsToReturn(returnItems);
        } else {
            setFoundInvoice(null);
            setItemsToReturn([]);
            addToast(t('po_not_found'), 'error');
        }
    }, [originalInvoiceId, purchaseOrders, partsMap, t, addToast]);

    const handleItemChange = (partId: string, returnQtyStr: string) => {
        const returnQty = parseInt(returnQtyStr, 10);
        setItemsToReturn(currentItems => 
            currentItems.map(item => item.partId === partId ? { ...item, returnQty: isNaN(returnQty) ? 0 : returnQty } : item)
        );
    };

    const totalReturnValue = useMemo(() => {
        return itemsToReturn.reduce((total, item) => total + (item.returnQty * item.price), 0);
    }, [itemsToReturn]);

    const handleProcessReturn = () => {
        if (!foundInvoice || !currentUser) {
            addToast(t('error_no_invoice_found'), 'error');
            return;
        }

        const itemsWithReturnQty = itemsToReturn.filter(item => item.returnQty > 0);
        if (itemsWithReturnQty.length === 0) {
            addToast(t('error_no_items_to_return'), 'error');
            return;
        }

        for (const item of itemsWithReturnQty) {
            if (item.returnQty > item.purchasedQty) {
                const errorMsg = t('error_return_qty_exceeds_sold').replace('{partName}', item.name).replace('{soldQty}', item.purchasedQty.toString());
                addToast(errorMsg, 'error');
                return;
            }
        }

        const newReturn: PurchaseReturn = {
            id: `pret-${Date.now().toString().slice(-6)}`,
            companyId: currentUser.companyId,
            originalPurchaseOrderId: foundInvoice.id,
            supplierName: foundInvoice.supplierName,
            date: new Date().toISOString().split('T')[0],
            items: itemsWithReturnQty.map(i => ({
                partId: i.partId,
                quantity: i.returnQty,
                purchasePrice: i.price,
            })),
            total: totalReturnValue,
            reason: reason,
        };

        setParts(prevParts => {
            const newParts = [...prevParts];
            newReturn.items.forEach(item => {
                const partIndex = newParts.findIndex(p => p.id === item.partId);
                if (partIndex > -1) {
                    newParts[partIndex].stock -= item.quantity;
                }
            });
            return newParts;
        });

        const newMovements: InventoryMovement[] = newReturn.items.map(item => ({
            id: `im-pr-${item.partId}-${Date.now()}${Math.random()}`,
            companyId: currentUser.companyId,
            date: newReturn.date,
            partId: item.partId,
            warehouseId: warehouseSettings.defaultWarehouseId || '',
            type: 'Issue',
            quantity: -item.quantity,
            relatedDocumentId: newReturn.id,
            notes: `Return to ${newReturn.supplierName}`,
        }));
        setInventoryMovements(prev => [...prev, ...newMovements]);

        setPurchaseReturns(prev => [newReturn, ...prev]);

        addToast(t('return_processed_success'), 'success');
        setTimeout(() => {
            onReturnCreated();
        }, 1500);
    };

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-grow">
                        <label htmlFor="po-id" className="block text-sm font-medium text-muted-foreground">{t('enter_original_po_id')}</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="text"
                                id="po-id"
                                value={originalInvoiceId}
                                onChange={e => setOriginalInvoiceId(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleFindInvoice()}
                                className="block w-full rounded-none rounded-s-md border-input bg-background p-2 focus:ring-ring focus:border-ring sm:text-sm"
                            />
                            <button onClick={handleFindInvoice} className="relative inline-flex items-center space-x-2 rounded-e-md border border-input bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus:z-10">
                                <Search size={16} />
                                <span>{t('find_po')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {foundInvoice && (
                <Card>
                    <h3 className="text-lg font-bold mb-2">{t('po_found_details')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div><span className="text-muted-foreground">{t('po_id')}:</span> <span className="font-semibold">{foundInvoice.id}</span></div>
                        <div><span className="text-muted-foreground">{t('supplier')}:</span> <span className="font-semibold">{foundInvoice.supplierName}</span></div>
                        <div><span className="text-muted-foreground">{t('date')}:</span> <span className="font-semibold">{foundInvoice.date}</span></div>
                    </div>
                    
                    <h3 className="text-lg font-bold mt-6 mb-2">{t('return_items')}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-start">{t('part_name')}</th>
                                    <th className="px-4 py-3 text-center">{t('original_quantity')}</th>
                                    <th className="px-4 py-3 text-center">{t('price')}</th>
                                    <th className="px-4 py-3 text-center w-32">{t('return_quantity')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {itemsToReturn.map(item => (
                                    <tr key={item.partId} className="hover:bg-accent">
                                        <td className="px-4 py-2 font-medium">{item.name}</td>
                                        <td className="px-4 py-2 text-center">{item.purchasedQty}</td>
                                        <td className="px-4 py-2 text-center">{item.price.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <input 
                                                type="number" 
                                                value={item.returnQty}
                                                onChange={e => handleItemChange(item.partId, e.target.value)}
                                                min="0"
                                                max={item.purchasedQty}
                                                className="w-24 p-1 text-center bg-background border border-input rounded-md focus:ring-ring"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div>
                             <label htmlFor="return-reason" className="block text-sm font-medium text-muted-foreground">{t('return_reason')}</label>
                             <textarea 
                                id="return-reason"
                                rows={3}
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                             />
                        </div>
                        <div className="flex items-end justify-end">
                            <div className="text-right">
                                <p className="text-muted-foreground">{t('total_returned_value')}</p>
                                <p className="text-3xl font-bold text-primary">{totalReturnValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} {lang === 'ar' ? 'р.с' : 'SAR'}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
             <div className="flex items-center gap-4 pt-4 border-t border-border">
                <button onClick={handleProcessReturn} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-50" disabled={!foundInvoice || totalReturnValue === 0}>
                    <RotateCw size={18} />
                    <span>{t('process_return')}</span>
                </button>
                 <button onClick={onCancel} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-secondary/80 transition-colors">
                    <ArrowLeft size={18} />
                    <span>{t('back_to_list')}</span>
                </button>
            </div>
        </div>
    );
};

const PurchaseReturnsList: React.FC<{
    onNewReturnClick: () => void;
}> = ({ onNewReturnClick }) => {
    const { t, lang } = useLocalization();
    const { purchaseReturns, setPurchaseReturns } = useAppStore();

    const columns = useMemo(() => [
        { Header: t('return_id'), accessor: 'id', width: 150 },
        { Header: t('date'), accessor: 'date', width: 150 },
        { Header: t('original_po_id'), accessor: 'originalPurchaseOrderId', width: 180 },
        { Header: t('supplier_name'), accessor: 'supplierName', width: 250 },
        { Header: t('items'), accessor: 'items', width: 150, Cell: ({ row }: { row: PurchaseReturn }) => `${row.items.length} ${row.items.length === 1 ? t('item_singular') : t('item_plural')}` },
        { Header: t('returned_value'), accessor: 'total', width: 150, Cell: ({ row }: { row: PurchaseReturn }) => `${row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${lang === 'ar' ? 'р.с' : 'SAR'}` },
    ], [t, lang]);

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex justify-end">
                <button
                    onClick={onNewReturnClick}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    <span>{t('create_new_purchase_return')}</span>
                </button>
            </div>
            <div className="flex-grow">
                <InteractiveTable
                    columns={columns}
                    data={purchaseReturns}
                    setData={setPurchaseReturns as any}
                />
            </div>
        </div>
    );
};

const PurchaseReturns: React.FC = () => {
    const [view, setView] = useState<'list' | 'create'>('list');

    if (view === 'create') {
        return <CreatePurchaseReturnForm onCancel={() => setView('list')} onReturnCreated={() => setView('list')} />;
    }

    return <PurchaseReturnsList
        onNewReturnClick={() => setView('create')}
    />;
};

export default PurchaseReturns;
