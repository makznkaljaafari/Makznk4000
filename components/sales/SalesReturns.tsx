

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sale, SalesReturn, Part, Customer, InventoryMovement } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import InteractiveTable from '../common/InteractiveTable';
import Card from '../common/Card';
import { Plus, Search, ArrowLeft, RotateCw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ReturnItem extends ReturnType<typeof createReturnItem> {}

const createReturnItem = (saleItem: Sale['items'][0], part: Part | undefined, previouslyReturnedQty: number) => ({
    partId: saleItem.partId,
    name: part?.name || 'Unknown',
    soldQty: saleItem.quantity,
    price: saleItem.price,
    previouslyReturnedQty,
    returnQty: 0,
});

const CreateReturnForm: React.FC<{
    onCancel: () => void;
    onReturnCreated: () => void;
}> = ({ onCancel, onReturnCreated }) => {
    const { t, lang } = useLocalization();
    const { sales, salesReturns, parts, customers, setParts, setCustomers, setSalesReturns, warehouseSettings, setInventoryMovements, currentUser } = useAppStore();
    const { addToast } = useToast();
    
    const [originalSaleId, setOriginalSaleId] = useState('');
    const [foundSale, setFoundSale] = useState<Sale | null>(null);
    const [itemsToReturn, setItemsToReturn] = useState<ReturnItem[]>([]);
    const [reason, setReason] = useState('');

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);

    const handleFindInvoice = useCallback(() => {
        const sale = sales.find(s => s.id === originalSaleId.trim());
        if (sale) {
            const previouslyReturnedItems = salesReturns
                .filter(r => r.originalSaleId === sale.id)
                .flatMap(r => r.items);
            
            const returnItems = sale.items.map(item => {
                const previouslyReturnedQty = previouslyReturnedItems
                    .filter(ri => ri.partId === item.partId)
                    .reduce((sum, ri) => sum + ri.quantity, 0);
                const part = partsMap.get(item.partId);
                return createReturnItem(item, part, previouslyReturnedQty);
            });

            setFoundSale(sale);
            setItemsToReturn(returnItems);
        } else {
            setFoundSale(null);
            setItemsToReturn([]);
            addToast(t('invoice_not_found'), 'error');
        }
    }, [originalSaleId, sales, salesReturns, partsMap, t, addToast]);

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
        if (!foundSale || !currentUser) {
            addToast(t('error_no_invoice_found'), 'error');
            return;
        }

        const itemsWithReturnQty = itemsToReturn.filter(item => item.returnQty > 0);
        if (itemsWithReturnQty.length === 0) {
            addToast(t('error_no_items_to_return'), 'error');
            return;
        }

        // Validation
        for (const item of itemsWithReturnQty) {
            const maxReturnable = item.soldQty - item.previouslyReturnedQty;
            if (item.returnQty > maxReturnable) {
                const errorMsg = t('error_return_qty_exceeds_sold')
                    .replace('{partName}', item.name)
                    .replace('{soldQty}', maxReturnable.toString());
                addToast(errorMsg, 'error');
                return;
            }
        }

        const newReturn: SalesReturn = {
            id: `ret-${Date.now().toString().slice(-6)}`,
            companyId: currentUser.companyId,
            originalSaleId: foundSale.id,
            customerName: foundSale.customerName,
            date: new Date().toISOString().split('T')[0],
            items: itemsWithReturnQty.map(i => ({
                partId: i.partId,
                quantity: i.returnQty,
                price: i.price,
            })),
            total: totalReturnValue,
            reason: reason,
        };

        // Update stock
        setParts(prevParts => {
            const newParts = [...prevParts];
            newReturn.items.forEach(item => {
                const partIndex = newParts.findIndex(p => p.id === item.partId);
                if (partIndex > -1) {
                    newParts[partIndex].stock += item.quantity;
                }
            });
            return newParts;
        });

        // Create inventory movements
        const newMovements: InventoryMovement[] = newReturn.items.map(item => ({
            id: `im-r-${item.partId}-${Date.now()}${Math.random()}`,
            companyId: currentUser.companyId,
            date: newReturn.date,
            partId: item.partId,
            warehouseId: warehouseSettings.defaultWarehouseId || '',
            type: 'Receipt',
            quantity: item.quantity,
            relatedDocumentId: newReturn.id,
            notes: `Return from ${newReturn.customerName}`,
        }));
        setInventoryMovements(prev => [...prev, ...newMovements]);

        // Update customer debt if credit sale
        if (foundSale.type === 'credit' && foundSale.customerName !== t('cash_sale_customer')) {
            setCustomers(prevCustomers => prevCustomers.map(c => {
                if (c.name === foundSale.customerName) {
                    const updatedCustomer = { ...c };
                    updatedCustomer.totalDebt -= newReturn.total;
                    updatedCustomer.paymentHistory = [
                        ...c.paymentHistory,
                        {
                            date: newReturn.date,
                            amount: newReturn.total,
                            type: 'return' as const,
                            refId: newReturn.id,
                            notes: `${t('return')} ${t('for')} ${t('invoice')} #${foundSale.id}`,
                        },
                    ];
                    return updatedCustomer;
                }
                return c;
            }));
        }

        // Add to sales returns
        setSalesReturns(prev => [newReturn, ...prev]);

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
                        <label htmlFor="invoice-id" className="block text-sm font-medium text-muted-foreground">{t('enter_original_invoice_id')}</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="text"
                                id="invoice-id"
                                value={originalSaleId}
                                onChange={e => setOriginalSaleId(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleFindInvoice()}
                                className="block w-full rounded-none rounded-s-md border-input bg-background p-2 focus:ring-ring focus:border-ring sm:text-sm"
                            />
                            <button onClick={handleFindInvoice} className="relative inline-flex items-center space-x-2 rounded-e-md border border-input bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus:z-10">
                                <Search size={16} />
                                <span>{t('find_invoice')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {foundSale && (
                <Card>
                    <h3 className="text-lg font-bold mb-2">{t('invoice_found_details')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div><span className="text-muted-foreground">{t('invoice_no')}:</span> <span className="font-semibold">{foundSale.id}</span></div>
                        <div><span className="text-muted-foreground">{t('customer')}:</span> <span className="font-semibold">{foundSale.customerName}</span></div>
                        <div><span className="text-muted-foreground">{t('date')}:</span> <span className="font-semibold">{foundSale.date}</span></div>
                        <div><span className="text-muted-foreground">{t('sale_type')}:</span> <span className="font-semibold">{t(foundSale.type)}</span></div>
                    </div>
                    
                    <h3 className="text-lg font-bold mt-6 mb-2">{t('return_items')}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-start">{t('part_name')}</th>
                                    <th className="px-4 py-3 text-center">{t('original_quantity')}</th>
                                    <th className="px-4 py-3 text-center">{t('item_already_returned')}</th>
                                    <th className="px-4 py-3 text-center">{t('price')}</th>
                                    <th className="px-4 py-3 text-center w-32">{t('return_quantity')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {itemsToReturn.map(item => (
                                    <tr key={item.partId} className="hover:bg-accent">
                                        <td className="px-4 py-2 font-medium">{item.name}</td>
                                        <td className="px-4 py-2 text-center">{item.soldQty}</td>
                                        <td className="px-4 py-2 text-center text-yellow-600">{item.previouslyReturnedQty > 0 ? item.previouslyReturnedQty : '-'}</td>
                                        <td className="px-4 py-2 text-center">{item.price.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <input 
                                                type="number" 
                                                value={item.returnQty}
                                                onChange={e => handleItemChange(item.partId, e.target.value)}
                                                min="0"
                                                max={item.soldQty - item.previouslyReturnedQty}
                                                className="w-24 p-1 text-center bg-background border border-input rounded-md focus:ring-ring"
                                                disabled={item.soldQty - item.previouslyReturnedQty === 0}
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
                <button onClick={handleProcessReturn} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-50" disabled={!foundSale || totalReturnValue === 0}>
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

const SalesReturnsList: React.FC<{
    onNewReturnClick: () => void;
}> = ({ onNewReturnClick }) => {
    const { t, lang } = useLocalization();
    const { salesReturns: allSalesReturns, setSalesReturns, currentUser } = useAppStore();

    const salesReturns = useMemo(() => allSalesReturns.filter(sr => sr.companyId === currentUser?.companyId), [allSalesReturns, currentUser]);

    const columns = useMemo(() => [
        { Header: t('return_id'), accessor: 'id', width: 150 },
        { Header: t('date'), accessor: 'date', width: 150 },
        { Header: t('original_sale_id'), accessor: 'originalSaleId', width: 180 },
        {
            Header: t('customer_name'),
            accessor: 'customerName',
            width: 250,
            Cell: ({ row }: { row: SalesReturn }) => <span className="font-medium text-foreground whitespace-nowrap">{row.customerName}</span>,
        },
        {
            Header: t('items'),
            accessor: 'items',
            width: 150,
            Cell: ({ row }: { row: SalesReturn }) => `${row.items.length} ${row.items.length === 1 ? t('item_singular') : t('item_plural')}`,
        },
        {
            Header: t('returned_value'),
            accessor: 'total',
            width: 150,
            Cell: ({ row }: { row: SalesReturn }) => `${row.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === 'ar' ? 'р.с' : 'SAR'}`,
        },
    ], [t, lang]);

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex justify-end">
                <button
                    onClick={onNewReturnClick}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    <span>{t('create_new_return')}</span>
                </button>
            </div>
            <div className="flex-grow">
                <InteractiveTable
                    columns={columns}
                    data={salesReturns}
                    setData={setSalesReturns}
                />
            </div>
        </div>
    );
};


const SalesReturns: React.FC = () => {
    const [view, setView] = useState<'list' | 'create'>('list');

    if (view === 'create') {
        return <CreateReturnForm onCancel={() => setView('list')} onReturnCreated={() => setView('list')} />;
    }

    return <SalesReturnsList
        onNewReturnClick={() => setView('create')}
    />;
};

export default SalesReturns;
