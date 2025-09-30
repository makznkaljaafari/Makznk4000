import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder, Supplier, Part } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Save, ArrowLeft, Sparkles } from 'lucide-react';
import { PartSearchModal, SearchableItem } from '../common/PartSearchModal';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import { useInvoiceCalculator } from '../../hooks/useInvoiceCalculator';
import InvoiceItemsTable from '../sales/InvoiceItemsTable';
import { suggestSupplierForPart } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import PurchaseInvoiceDetailModal from './PurchaseOrderDetailModal';
import SupplierModal from './SupplierModal';
import { createSupplier } from '../../services/databaseService';
import Card from '../common/Card';

export const CreatePurchaseInvoiceForm: React.FC<{
  setActiveTab: (tab: string) => void;
}> = ({ setActiveTab }) => {
    const { t } = useLocalization();
    const { parts, suppliers, currencies, partKits, currentUser, addPurchaseOrder, addSupplier, purchaseOrders, formPrefill, setFormPrefill } = useAppStore();
    const { addToast } = useToast();

    const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [currencyId, setCurrencyId] = useState<string>(currencies.find(c => c.symbol === 'SAR')?.id || currencies[0]?.id || '');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [createdPO, setCreatedPO] = useState<PurchaseOrder | null>(null);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    
    const selectedCurrency = useMemo(() => currencies.find(c => c.id === currencyId), [currencyId, currencies]);

    const [items, { addItem, addFilledItem, removeItem, removeItems, copyItems, updateItem, resetItems }] = useInvoiceCalculator([], 0, 0);

    const { subtotal, totalDiscount, grandTotal } = useMemo(() => {
        const validItems = items.filter(i => (i.partId || i.kitId) && i.quantity > 0);
        const subtotalCalc = validItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const totalDiscountCalc = validItems.reduce((acc, item) => acc + item.discountAmount, 0);
        const grandTotalCalc = subtotalCalc - totalDiscountCalc;
        return { subtotal: subtotalCalc, totalDiscount: totalDiscountCalc, grandTotal: grandTotalCalc };
    }, [items]);

    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchModalRowIndex, setSearchModalRowIndex] = useState<number | null>(null);

    useEffect(() => {
        if (formPrefill?.form === 'po' && formPrefill.data?.partId) {
            const part = parts.find(p => p.id === formPrefill.data.partId);
            if (part) {
                // If the only item is empty, replace it. Otherwise, add a new filled item.
                if (items.length === 1 && !items[0].partId) {
                    updateItem(0, {
                        type: 'part',
                        partId: part.id,
                        name: part.name,
                        price: part.purchasePrice,
                        quantity: part.minStock > 0 ? part.minStock * 2 : 10 // Suggest a reorder quantity
                    });
                } else {
                    addFilledItem({
                        partId: part.id,
                        name: part.name,
                        price: part.purchasePrice,
                        quantity: part.minStock > 0 ? part.minStock * 2 : 10 // Suggest a reorder quantity
                    });
                }

                addToast(t('item_added_to_po_from_alert', { partName: part.name }), 'info');
            }
            setFormPrefill(null); // Clear prefill after using it
            setActiveTab('create'); // Ensure the create tab is active
        }
    }, [formPrefill, parts, setFormPrefill, addFilledItem, t, addToast, setActiveTab, items, updateItem]);


    const handleSuggestSupplier = async () => {
        const firstItemWithPartId = items.find(item => item.partId);
        if (!firstItemWithPartId || !firstItemWithPartId.partId) {
            addToast(t('error_select_part_first'), 'warning');
            return;
        }

        const part = parts.find(p => p.id === firstItemWithPartId.partId);
        if (!part) return;
        
        setIsSuggesting(true);
        try {
            const suggestion = await suggestSupplierForPart(part, purchaseOrders);
            if (suggestion?.supplierName) {
                const suggestedSupplier = suppliers.find(s => s.name === suggestion.supplierName);
                if (suggestedSupplier) {
                    setSupplierId(suggestedSupplier.id);
                    addToast(`${t('suggestion')}: ${suggestion.reason}`, 'info');
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

    const handleSavePO = async () => {
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
            
            const newPO: PurchaseOrder = {
                id: `PO-${Date.now().toString().slice(-6)}`,
                companyId: currentUser.companyId,
                supplierName: supplier?.name || '',
                date: poDate,
                items: validItems.map(i => ({ partId: i.partId!, quantity: i.quantity, purchasePrice: i.price })),
                total: grandTotal,
                status: 'Pending',
                paidAmount: 0,
                currencyId: currencyId,
                exchangeRate: selectedCurrency?.exchangeRate || 1,
                isPosted: false,
                dueDate: dueDate || undefined,
            };
            
            addPurchaseOrder(newPO);
            addToast(t('po_saved_success'), 'success');
            setCreatedPO(newPO);
            resetItems();

        } catch (error) {
            addToast((error as Error).message, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveNewSupplier = async (supplierData: Omit<Supplier, 'id' | 'companyId'> & { id?: string }) => {
        if (!currentUser) return;
        try {
            const newSupplier: Supplier = {
                ...supplierData,
                id: `sup-${Date.now().toString().slice(-8)}`,
                companyId: currentUser.companyId,
                totalDebt: 0,
                creditLimit: supplierData.creditLimit ?? 5000,
                paymentHistory: [],
            };
            addSupplier(newSupplier);
            setSupplierId(newSupplier.id);
            addToast(t('supplier_saved_success'), 'success');
            setIsSupplierModalOpen(false);
        } catch(error) {
            console.error(error);
            addToast(t('failed_to_save_supplier'), 'error');
        }
    };
    
    const handleSelectItemFromModal = (item: SearchableItem) => {
        if (searchModalRowIndex === null) return;

        if (item.type === 'part') {
           updateItem(searchModalRowIndex, { type: 'part', partId: item.id, name: item.name, price: item.purchasePrice, quantity: 1, discountPercent: 0, discountAmount: 0 });
        } else {
           addToast(t('kits_not_supported_in_po'), 'info');
        }
        setIsSearchModalOpen(false);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <SupplierModal 
                isOpen={isSupplierModalOpen}
                onClose={() => setIsSupplierModalOpen(false)}
                onSave={handleSaveNewSupplier}
                supplier={null}
            />
            {createdPO && <PurchaseInvoiceDetailModal 
                isOpen={!!createdPO}
                po={createdPO}
                onClose={() => {
                    setCreatedPO(null);
                    setActiveTab('orders');
                }}
            />}
            <PartSearchModal 
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelectItem={handleSelectItemFromModal}
                parts={parts}
                partKits={partKits}
                priceType="purchasePrice"
            />

            <Card>
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
                        <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('due_date')} ({t('optional')})</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3" />
                    </div>
                </div>
            </Card>
            
            <div className="flex-grow flex flex-col min-h-[300px]">
                <InvoiceItemsTable 
                    items={items}
                    onUpdateItem={updateItem}
                    onRemoveItem={removeItem}
                    onRemoveItems={removeItems}
                    onCopyItems={copyItems}
                    onAddItem={addItem}
                    onSearchPart={(index) => { setSearchModalRowIndex(index); setIsSearchModalOpen(true); }}
                    parts={parts}
                />
            </div>

            <Card>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2"></div>
                    <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('subtotal')}</span><span>{subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('total_discount')}</span><span>{totalDiscount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between font-bold text-xl pt-2 border-t border-border/50"><span className="">{t('grand_total')}</span><span>{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} {selectedCurrency?.symbol}</span></div>
                    </div>
                </div>
            </Card>
            
            <div className="flex items-center gap-2 pt-2">
                <button onClick={handleSavePO} disabled={isSaving} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-50 w-48">
                    {isSaving ? <Spinner className="w-5 h-5"/> : <Save size={18} />}
                    {t('save_purchase_invoice')}
                </button>
                <button onClick={() => setActiveTab('orders')} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-muted transition-colors"><ArrowLeft size={18} />{t('back_to_list')}</button>
            </div>
        </div>
    );
};