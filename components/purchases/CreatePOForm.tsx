


import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PurchaseOrder, Part, Supplier, InventoryMovement } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Trash2, Save, X, Search, Sparkles, ArrowLeft } from 'lucide-react';
import { PartSearchModal, SearchableItem } from '../common/PartSearchModal';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import { suggestSupplierForPart } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import { createPurchaseOrder as dbCreatePurchaseOrder, createSupplier } from '../../services/databaseService';
import PurchaseInvoiceDetailModal from './PurchaseOrderDetailModal';
import SupplierModal from './SupplierModal';

interface FormPOItem {
  id: number;
  partId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

const getEmptyPORow = (): FormPOItem => ({
  id: Date.now() + Math.random(),
  partId: '',
  name: '',
  quantity: 1,
  price: 0,
  total: 0,
});

export const CreatePurchaseInvoiceForm: React.FC<{
  setActiveTab: (tab: string) => void;
}> = ({ setActiveTab }) => {
    const { t } = useLocalization();
    const { parts, suppliers, purchaseOrders, currencies, partKits, currentUser, addPurchaseOrder, addSupplier } = useAppStore();
    const { addToast } = useToast();
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
    const [status, setStatus] = useState<'Pending' | 'Received'>('Pending');
    const [items, setItems] = useState<FormPOItem[]>([getEmptyPORow()]);
    const [currencyId, setCurrencyId] = useState<string>(currencies.find(c => c.symbol === 'SAR')?.id || currencies[0]?.id || '');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [createdPurchaseInvoice, setCreatedPurchaseInvoice] = useState<PurchaseOrder | null>(null);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);


    const selectedCurrency = useMemo(() => currencies.find(c => c.id === currencyId), [currencyId, currencies]);

    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchModalRowIndex, setSearchModalRowIndex] = useState<number | null>(null);

    const updateItem = useCallback((index: number, newValues: Partial<FormPOItem>) => {
        setItems(prevItems => {
            const newItems = [...prevItems];
            let item = { ...newItems[index], ...newValues };
            
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            item.total = quantity * price;
            newItems[index] = item;
            
            return newItems;
        });
    }, []);
    
    const selectPartForRow = (index: number, part: Part) => {
        updateItem(index, {
            partId: part.id,
            name: part.name,
            price: part.purchasePrice,
            quantity: 1,
        });
    };
    
    const handleSelectItemFromModal = (item: SearchableItem) => {
        if (searchModalRowIndex !== null) {
            if (item.type === 'part') {
                selectPartForRow(searchModalRowIndex, item);
            } else {
                addToast(t('kits_not_supported_in_po'), 'info');
            }
        }
        setIsSearchModalOpen(false);
    };

    const handleRemoveItem = (id: number) => {
        if(items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        } else {
            setItems([getEmptyPORow()]);
        }
    };
    
    const handleAddItem = () => {
        setItems([...items, getEmptyPORow()]);
    }

    const grandTotal = useMemo(() => {
        return items.filter(i => i.partId && i.quantity > 0).reduce((acc, item) => acc + item.total, 0);
    }, [items]);
    
    const handleSuggestSupplier = async () => {
        const firstItem = items[0];
        if (!firstItem || !firstItem.partId) {
            addToast(t('error_select_part_first'), 'warning');
            return;
        }

        const part = parts.find(p => p.id === firstItem.partId);
        if (!part) return;
        
        setIsSuggesting(true);
        try {
            const suggestion = await suggestSupplierForPart(part, purchaseOrders);
            if (suggestion?.supplierName) {
                const suggestedSupplier = suppliers.find(s => s.name === suggestion.supplierName);
                if (suggestedSupplier) {
                    setSupplierId(suggestedSupplier.id);
                    addToast(`${t('suggestion')}: ${suggestion.reason}`, 'info');
                } else {
                    addToast(`${t('supplier_not_found')}: ${suggestion.supplierName}`, 'warning');
                }
            } else {
                addToast(t('no_suggestion_available'), 'info');
            }
        } catch (error) {
            addToast(t((error as Error).message), 'error');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSaveInvoice = async () => {
        if (!currentUser) return;
        const validItems = items.filter(i => i.partId && i.quantity > 0);
        if (validItems.length === 0) {
            addToast(t('error_empty_invoice'), 'error');
            return;
        }
        if (!supplierId) {
            addToast(t('please_select_supplier'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            const supplier = suppliers.find(s => s.id === supplierId);
            const poDetails = {
                supplierId,
                supplierName: supplier?.name || '',
                dueDate: dueDate || null,
                items: validItems.map(i => ({ partId: i.partId, quantity: i.quantity, price: i.price }))
            };
            
            const newPoId = await dbCreatePurchaseOrder(poDetails);
            
            const newPurchaseInvoice: PurchaseOrder = {
                id: newPoId,
                companyId: currentUser.companyId,
                supplierName: supplier?.name || '',
                date: invoiceDate,
                items: validItems.map(i => ({ partId: i.partId, quantity: i.quantity, purchasePrice: i.price })),
                total: grandTotal,
                status: 'Pending', // New Invoices are always pending
                paidAmount: 0,
                currencyId: currencyId,
                exchangeRate: selectedCurrency?.exchangeRate || 1,
                isPosted: false,
                dueDate: dueDate || undefined,
            };
            
            addPurchaseOrder(newPurchaseInvoice);
            addToast(t('po_saved_success'), 'success');
            setCreatedPurchaseInvoice(newPurchaseInvoice);

        } catch (error) {
            addToast((error as Error).message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNewSupplier = async (supplierData: Omit<Supplier, 'id' | 'companyId'> & { id?: string }) => {
        if (!currentUser) return;
        try {
            const newSupplierWithId: Supplier = {
                ...supplierData,
                id: `sup-${Date.now().toString().slice(-8)}`,
                companyId: currentUser.companyId,
                totalDebt: 0,
                creditLimit: supplierData.creditLimit ?? 5000,
                paymentHistory: [],
            };
            const newSupplier = await createSupplier(newSupplierWithId);
            addSupplier(newSupplier);
            setSupplierId(newSupplier.id);
            addToast(t('supplier_saved_success'), 'success');
            setIsSupplierModalOpen(false);
        } catch(error) {
            console.error(error);
            addToast(t('failed_to_save_supplier'), 'error');
        }
    };


    return (
        <div className="h-full flex flex-col gap-4 p-4 bg-muted/30 rounded-lg">
            <SupplierModal 
                isOpen={isSupplierModalOpen}
                onClose={() => setIsSupplierModalOpen(false)}
                onSave={handleSaveNewSupplier}
                supplier={null}
            />
            <PurchaseInvoiceDetailModal 
                isOpen={!!createdPurchaseInvoice}
                po={createdPurchaseInvoice}
                onClose={() => {
                    setCreatedPurchaseInvoice(null);
                    setActiveTab('orders');
                }}
            />
            <PartSearchModal 
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelectItem={handleSelectItemFromModal}
                parts={parts}
                partKits={partKits}
                priceType="purchasePrice"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground">{t('supplier')}</label>
                     <div className="relative mt-1">
                        <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm appearance-none pe-20">
                            <option value="" disabled>{t('select_supplier')}</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button onClick={handleSuggestSupplier} disabled={isSuggesting} title={t('suggest_supplier')} className="p-1 text-primary hover:bg-primary/10 rounded-full disabled:opacity-50">
                                {isSuggesting ? <Spinner className="w-5 h-5"/> : <Sparkles size={20}/>}
                            </button>
                             <button onClick={() => setIsSupplierModalOpen(true)} title={t('add_new_supplier')} className="p-1 text-primary hover:bg-primary/10 rounded-full">
                                <Plus size={20}/>
                            </button>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">{t('date')}</label>
                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-muted-foreground">{t('due_date')} ({t('optional')})</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                </div>
            </div>

            <div className="flex-grow min-h-[300px] overflow-y-auto border border-border rounded-lg bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                        <tr>
                            <th className="px-4 py-3 min-w-[300px] text-start">{t('item')}</th>
                            <th className="px-2 py-3 w-32 text-center">{t('quantity')}</th>
                            <th className="px-2 py-3 w-32 text-center">{t('price')}</th>
                            <th className="px-4 py-3 w-40 text-center">{t('total')}</th>
                            <th className="px-2 py-3 w-20 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="p-1">
                                    <button type="button" onClick={() => { setSearchModalRowIndex(index); setIsSearchModalOpen(true); }} className="w-full text-start p-2 rounded-md hover:bg-muted flex justify-between items-center text-sm">
                                        <span>{item.name || t('select_a_part')}</span>
                                        <Search size={16}/>
                                    </button>
                                </td>
                                <td className="p-1"><input type="number" min="0" value={item.quantity} onChange={e => updateItem(index, { quantity: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2"/></td>
                                <td className="p-1"><input type="number" min="0" value={item.price} onChange={e => updateItem(index, { price: Number(e.target.value) })} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2"/></td>
                                <td className="px-4 py-1 text-center font-bold text-foreground">{item.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td className="px-2 py-1 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="p-2 border-t border-border">
                    <button onClick={handleAddItem} className="flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary/90 transition-colors"><Plus size={16} />{t('add_item')}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                 <div className="lg:col-span-2"></div>
                <div className="flex items-center justify-center bg-stone-900 text-stone-50 rounded-lg shadow-lg p-4">
                    <div className="text-center">
                        <span className="text-lg font-medium uppercase tracking-wider text-stone-400">{t('grand_total')}</span>
                        <p className="text-4xl font-bold tracking-tighter text-stone-50 font-orbitron">
                            <span lang="en">{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} {selectedCurrency?.symbol}</span>
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 pt-4 border-t border-border mt-2">
                <button onClick={handleSaveInvoice} disabled={isSaving} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-50 w-32">
                    {isSaving ? <Spinner className="w-5 h-5"/> : <Save size={18} />}
                    {t('save_purchase_invoice')}
                </button>
                <button onClick={() => setActiveTab('orders')} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-muted transition-colors"><ArrowLeft size={18} />{t('back_to_list')}</button>
            </div>
        </div>
    );
};
