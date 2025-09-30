
import React, { useState, useMemo, useEffect } from 'react';
import { Sale, Customer, InventoryMovement, Currency, Part, UpsellSuggestion, DynamicPricingSuggestion, Company, Promotion } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Printer, Save, X, FilePlus, Gift, Camera, ScanBarcode, Zap, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { PartSearchModal, SearchableItem } from '../common/PartSearchModal';
import { useToast } from '../../contexts/ToastContext';
import { useInvoiceCalculator, FormInvoiceItem } from '../../hooks/useInvoiceCalculator';
import InvoiceItemsTable from './InvoiceItemsTable';
import { generateUpsellRecommendations, getDynamicPricingSuggestion, generateSalesPitch } from '../../services/geminiService';
import AiUpsellSuggestions from './AiUpsellSuggestions';
import AiPricingSuggestion from './AiPricingSuggestion';
import SalesPitchModal from './SalesPitchModal';
import { logService } from '../../services/logService';
import InvoiceDetailModal from './InvoiceDetailModal';
import BarcodeScanner from '../common/BarcodeScanner';
import Spinner from '../common/Spinner';
import Card from '../common/Card';
import CustomerModal from '../customers/CustomerModal';
import { createCustomer } from '../../services/databaseService';


export const CreateInvoiceForm: React.FC<{
  setActiveTab: (tab: string) => void;
}> = ({ setActiveTab }) => {
    const { t } = useLocalization();
    const { parts, customers, sales, warehouseSettings, currencies, partKits, openAiAssistant, currentUser, companies, customerSettings, addSale, promotions, formPrefill, setFormPrefill, addCustomer } = useAppStore();
    const { addToast } = useToast();
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [customerId, setCustomerId] = useState<string>('cash_sale');
    const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('credit');
    const [statement, setStatement] = useState('');
    const [currencyId, setCurrencyId] = useState<string>(currencies.find(c => c.symbol === 'SAR')?.id || currencies[0]?.id || '');
    const [suggestions, setSuggestions] = useState<UpsellSuggestion[] | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [pricingSuggestion, setPricingSuggestion] = useState<DynamicPricingSuggestion | null>(null);
    const [isPricingSuggesting, setIsPricingSuggesting] = useState(false);
    const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
    const [pitchContent, setPitchContent] = useState<string | null>(null);
    const [isPitchLoading, setIsPitchLoading] = useState(false);
    const [pitchForPartName, setPitchForPartName] = useState<string | null>(null);
    const [invoiceToPrint, setInvoiceToPrint] = useState<Sale | null>(null);
    const [pointsInput, setPointsInput] = useState('');
    const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);


    const currentCompany = useMemo(() => companies.find(c => c.id === currentUser?.companyId), [companies, currentUser]);
    const taxRate = useMemo(() => (currentCompany?.taxSettings?.isEnabled ? currentCompany.taxSettings.rate : 0), [currentCompany]);
    const selectedCustomer = useMemo(() => customers.find(c => c.id === customerId), [customerId, customers]);
    const { riyalValuePerPoint, loyaltyProgramEnabled } = customerSettings;

    const selectedCurrency = useMemo(() => currencies.find(c => c.id === currencyId), [currencyId, currencies]);
    
    const [
        items,
        { addItem, addFilledItem, addKit, removeItem, updateItem, resetItems, setLoyaltyPointsToUse, removeItems, copyItems },
        { subtotal, totalDiscount, vat, grandTotal, loyaltyDiscount },
        loyaltyPointsToUse
    ] = useInvoiceCalculator([], taxRate, riyalValuePerPoint);

    const activePromotions = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return promotions.filter(p => p.isActive && p.startDate <= today && p.endDate >= today);
    }, [promotions]);
    
    const getApplicablePromotion = (part: Part, quantity: number): { promotion: Promotion, discountAmount: number } | null => {
        for (const promo of activePromotions) {
            if (promo.minQuantity && quantity < promo.minQuantity) continue;

            const isApplicable = 
                promo.applicableTo === 'all' ||
                (promo.applicableTo === 'products' && promo.applicableIds?.includes(part.id)) ||
                (promo.applicableTo === 'categories' && part.category && promo.applicableIds?.includes(part.category));

            if (isApplicable) {
                let discountAmount = 0;
                if (promo.type === 'percentage') {
                    discountAmount = part.sellingPrice * (promo.value / 100);
                } else if (promo.type === 'fixed_amount') {
                    discountAmount = promo.value;
                }
                return { promotion: promo, discountAmount: discountAmount * quantity };
            }
        }
        return null;
    };


    useEffect(() => {
        const pointsToRedeem = Number(pointsInput);
        if (!selectedCustomer || !loyaltyProgramEnabled || isNaN(pointsToRedeem)) {
            setLoyaltyPointsToUse(0);
            return;
        }
        const availablePoints = selectedCustomer.loyaltyPoints || 0;
        const validPoints = Math.max(0, Math.min(pointsToRedeem, availablePoints));
        
        setLoyaltyPointsToUse(validPoints);

    }, [pointsInput, selectedCustomer, loyaltyProgramEnabled, setLoyaltyPointsToUse]);


    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchModalRowIndex, setSearchModalRowIndex] = useState<number | null>(null);

    // Effect for handling form pre-fill from AI commands
    useEffect(() => {
        if (formPrefill?.form === 'sale') {
            const { customerName, items: prefillItems } = formPrefill.data;
            const customer = customers.find(c => c.name.toLowerCase().includes(customerName?.toLowerCase()));
            if (customer) {
                setCustomerId(customer.id);
            } else if (customerName) {
                 setCustomerId('cash_sale'); // Fallback to cash sale if customer not found
                 addToast(`${t('customer')} "${customerName}" ${t('not_found')}.`, 'warning');
            }
            
            if (prefillItems && prefillItems.length > 0) {
                resetItems(); // Clear existing items before adding new ones
                prefillItems.forEach((item: { partName: string, quantity: number, price?: number }) => {
                    // Find the best match for the part name
                    const part = parts.find(p => p.name.toLowerCase().includes(item.partName.toLowerCase()));
                    if (part) {
                        const priceToUse = item.price !== undefined ? item.price : part.sellingPrice;
                        addFilledItem({ partId: part.id, name: part.name, price: priceToUse, quantity: item.quantity });
                    } else {
                        addToast(`${t('part_not_found')}: ${item.partName}`, 'warning');
                    }
                });
            }
            setFormPrefill(null); // Clear prefill after using it
        }
    }, [formPrefill, customers, parts, setFormPrefill, resetItems, addFilledItem, t, addToast]);


    useEffect(() => {
        const handler = setTimeout(() => {
            const validItems = items.filter(i => i.partId);
            if (validItems.length > 0) {
                const fetchSuggestions = async () => {
                    setIsSuggesting(true);
                    try {
                        const result = await generateUpsellRecommendations(validItems.map(i => ({partId: i.partId!, name: i.name, quantity: i.quantity})), parts);
                        const currentPartIds = new Set(validItems.map(i => i.partId));
                        const filteredResult = result?.filter(s => !currentPartIds.has(s.partId)) || null;
                        setSuggestions(filteredResult);
                    } catch (e) {
                        console.error("Failed to fetch upsell suggestions:", e);
                    } finally {
                        setIsSuggesting(false);
                    }
                };
                fetchSuggestions();
            } else {
                setSuggestions(null);
            }
        }, 1000); // Debounce for 1 second

        return () => clearTimeout(handler);
    }, [items, parts]);
    
    useEffect(() => {
        setPricingSuggestion(null);
        if (customerId && customerId !== 'cash_sale') {
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                const fetchSuggestion = async () => {
                    setIsPricingSuggesting(true);
                    try {
                        const result = await getDynamicPricingSuggestion(customer);
                        if (result && result.discountPercentage > 0) {
                            setPricingSuggestion(result);
                        }
                    } catch (e) {
                        console.error("Failed to fetch pricing suggestion:", e);
                    } finally {
                        setIsPricingSuggesting(false);
                    }
                };
                fetchSuggestion();
            }
        }
    }, [customerId, customers]);

    const handleAddItemFromSuggestion = (partId: string) => {
        const part = parts.find(p => p.id === partId);
        if (part) {
            addFilledItem({ partId: part.id, name: part.name, price: part.sellingPrice, quantity: 1 });
            addToast(t('item_added'), 'success');
        }
    };
    
    const applyPricingSuggestion = (discountPercentage: number) => {
        items.forEach((item, index) => {
            if(item.partId || item.kitId) {
                updateItem(index, { discountPercent: discountPercentage });
            }
        });
        addToast(t('discount_applied_to_all_items', { discount: discountPercentage }), 'success');
        setPricingSuggestion(null);
    };

    const handleSaveInvoice = async () => {
        if (!currentCompany || !currentUser) return;
        
        const validItems = items.filter(i => (i.partId || i.kitId) && i.quantity > 0);

        if (validItems.length === 0) {
            addToast(t('error_empty_invoice'), 'error');
            return;
        }

        const finalCustomer = customers.find(c => c.id === customerId);
        
        const itemsForRpc: { partId: string; quantity: number; price: number }[] = [];
        validItems.forEach(item => {
             // The RPC will handle kits internally if we enhance it later.
             // For now, we flatten the kit components into the items list.
            if (item.type === 'part' && item.partId) {
                itemsForRpc.push({ partId: item.partId, quantity: item.quantity, price: item.price });
            } else if (item.type === 'kit' && item.kitItems) {
                item.kitItems.forEach(kitComp => {
                    itemsForRpc.push({
                        partId: kitComp.partId,
                        quantity: item.quantity * kitComp.quantityPerKit,
                        price: kitComp.price 
                    });
                });
            }
        });
        
        setIsSaving(true);
        try {
            const saleDetails = {
                customerId: customerId === 'cash_sale' ? null : customerId,
                customerName: finalCustomer?.name || t('cash_sale_customer'),
                saleType: paymentType,
                dueDate: paymentType === 'credit' ? (new Date(new Date(invoiceDate).setDate(new Date(invoiceDate).getDate() + (customerSettings.defaultPaymentTermsDays || 30))).toISOString().split('T')[0]) : null,
                items: itemsForRpc,
                currencyId: currencyId,
                exchangeRate: selectedCurrency?.exchangeRate || 1,
                notes: statement,
            };

            const newSaleFromDB = await addSale(saleDetails);

            logService.logActivity('create_invoice', { invoiceId: newSaleFromDB.id, total: newSaleFromDB.total, customer: newSaleFromDB.customerName });
            
            setInvoiceToPrint(newSaleFromDB);
            resetItems();
            addToast(t('invoice_created_successfully'), 'success');

        } catch (error) {
            addToast((error as Error).message, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleItemUpdateWithPromotion = (index: number, newValues: Partial<FormInvoiceItem>) => {
        const partId = newValues.partId || items[index].partId;
        const quantity = newValues.quantity || items[index].quantity;
        
        let finalValues = { ...newValues, notes: newValues.notes ?? items[index].notes };
    
        if (partId) {
            const part = parts.find(p => p.id === partId);
            if (part) {
                const promoResult = getApplicablePromotion(part, quantity);
                if (promoResult) {
                    finalValues.discountAmount = promoResult.discountAmount;
                    finalValues.notes = `${t('promotion_applied')}: ${promoResult.promotion.name}`;
                    // Unset discountPercent to avoid conflict
                    finalValues.discountPercent = undefined;
                }
            }
        }
        updateItem(index, finalValues);
    };

    const handleSaveNewCustomer = async (customerData: Omit<Customer, 'id' | 'totalDebt' | 'paymentHistory' | 'companyId'> & { id?: string }) => {
        if (!currentUser) return;
        try {
            const customerToCreate = { 
                ...customerData, 
                companyId: currentUser.companyId,
            };
            const newCustomer = await createCustomer(customerToCreate);
            addCustomer(newCustomer);
            setCustomerId(newCustomer.id);
            addToast(t('customer_saved_success'), 'success');
            setIsCustomerModalOpen(false);
        } catch (error) {
            console.error("Error saving customer:", error);
            addToast(error instanceof Error ? error.message : t('failed_to_save_customer'), 'error');
        }
    };


    return (
        <div className="h-full flex flex-col gap-4">
            <CustomerModal 
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleSaveNewCustomer}
                customer={null}
            />
            <PartSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelectItem={(item: SearchableItem) => {
                    if (searchModalRowIndex === null) return;
                    if (item.type === 'part') {
                       handleItemUpdateWithPromotion(searchModalRowIndex, { type: 'part', partId: item.id, kitId: undefined, kitItems: undefined, name: item.name, price: item.sellingPrice, quantity: 1, discountPercent: 0, discountAmount: 0 });
                    } else {
                       const kitComponents = item.items.map(i => {
                           const part = parts.find(p => p.id === i.partId);
                           return { partId: i.partId, name: part?.name || '', quantityPerKit: i.quantity, price: part?.sellingPrice || 0 }
                       });
                       updateItem(searchModalRowIndex, { type: 'kit', partId: undefined, kitId: item.id, name: item.name, price: item.totalPrice, quantity: 1, kitItems: kitComponents, discountPercent: 0, discountAmount: 0 });
                    }
                }}
                parts={parts}
                partKits={partKits}
                priceType="sellingPrice"
            />
            <SalesPitchModal
                isOpen={isPitchModalOpen}
                onClose={() => setIsPitchModalOpen(false)}
                isLoading={isPitchLoading}
                content={pitchContent}
                partName={pitchForPartName}
            />
            <InvoiceDetailModal invoice={invoiceToPrint} onClose={() => { setInvoiceToPrint(null); setActiveTab('invoices'); }} />
            <BarcodeScanner isOpen={isBarcodeScannerOpen} onClose={() => setIsBarcodeScannerOpen(false)} onScan={(val) => addToast('Scanned: ' + val, 'info')} />
            
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full bg-background border border-input rounded-md p-2 pe-10">
                                <option value="cash_sale">{t('cash_sale_customer')}</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                             <button onClick={() => setIsCustomerModalOpen(true)} className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:bg-primary/10 rounded-full" title={t('add_new_customer')}>
                                <Plus size={20}/>
                            </button>
                        </div>
                    </div>
                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-background border border-input rounded-md p-2"/>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value as any)} className="bg-background border border-input rounded-md p-2">
                        <option value="credit">{t('credit')}</option>
                        <option value="cash">{t('cash')}</option>
                    </select>
                    <select value={currencyId} onChange={e => setCurrencyId(e.target.value)} className="bg-background border border-input rounded-md p-2">
                        {currencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </Card>

            
            <div className="flex-grow flex flex-col gap-4 min-h-[300px]">
                <div className="flex-grow">
                    <InvoiceItemsTable 
                        items={items}
                        onUpdateItem={handleItemUpdateWithPromotion}
                        onRemoveItem={removeItem}
                        onRemoveItems={removeItems}
                        onCopyItems={copyItems}
                        onAddItem={addItem}
                        onSearchPart={(index) => { setSearchModalRowIndex(index); setIsSearchModalOpen(true); }}
                        onGeneratePitch={(index) => {
                            const item = items[index];
                            const part = parts.find(p => p.id === item.partId);
                            if(part) {
                                setIsPitchLoading(true);
                                setPitchForPartName(part.name);
                                setIsPitchModalOpen(true);
                                generateSalesPitch(part).then(pitch => setPitchContent(pitch)).finally(() => setIsPitchLoading(false));
                            }
                        }}
                        parts={parts}
                        openAiAssistant={openAiAssistant}
                    />
                </div>
                {pricingSuggestion && <AiPricingSuggestion suggestion={pricingSuggestion} isLoading={isPricingSuggesting} onApply={applyPricingSuggestion} />}
                <AiUpsellSuggestions suggestions={suggestions} isLoading={isSuggesting} onAddSuggestion={handleAddItemFromSuggestion} />
            </div>
            <Card>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <textarea placeholder={t('notes')} value={statement} onChange={e => setStatement(e.target.value)} rows={4} className="lg:col-span-2 bg-background border border-input rounded-lg p-2"></textarea>
                    <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('subtotal')}</span><span>{subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('total_discount')}</span><span>{totalDiscount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('vat_15')}</span><span>{vat.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                         {loyaltyProgramEnabled && selectedCustomer && (selectedCustomer.loyaltyPoints || 0) > 0 && 
                            <div className="flex items-center gap-2">
                                <Gift size={16} className="text-primary"/>
                                <input type="text" placeholder={t('use_loyalty_points')} value={pointsInput} onChange={e => setPointsInput(e.target.value)} className="w-full p-1 bg-input rounded text-sm text-center"/>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">( {selectedCustomer.loyaltyPoints} / -{loyaltyDiscount.toFixed(2)} )</span>
                            </div>
                         }
                        <div className="flex justify-between font-bold text-xl pt-2 border-t border-border/50"><span className="">{t('grand_total')}</span><span>{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} {selectedCurrency?.symbol}</span></div>
                    </div>
                </div>
            </Card>
            <div className="flex items-center gap-2 pt-2">
                 <button onClick={handleSaveInvoice} disabled={isSaving} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {isSaving ? <Spinner className="w-5 h-5" /> : <Save size={18} />}
                    {t('save_invoice')}
                </button>
                 <button onClick={() => setActiveTab('invoices')} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-muted transition-colors">
                    <ArrowLeft size={18} />
                    {t('back_to_list')}
                </button>
            </div>
        </div>
    );
};
