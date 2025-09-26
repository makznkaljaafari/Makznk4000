
import React, { useState, useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Save, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { PartSearchModal, SearchableItem } from '../common/PartSearchModal';
import { useToast } from '../../contexts/ToastContext';
import { useInvoiceCalculator } from '../../hooks/useInvoiceCalculator';
import InvoiceItemsTable from './InvoiceItemsTable';
import { logService } from '../../services/logService';
import { Quotation } from '../../types';


export const CreateQuotationForm: React.FC<{
  setActiveTab: (tab: string) => void;
}> = ({ setActiveTab }) => {
    const { t } = useLocalization();
    const { parts, customers, currencies, partKits, currentUser, setQuotations } = useAppStore();
    const { addToast } = useToast();
    
    const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const [expiryDate, setExpiryDate] = useState(oneWeekFromNow.toISOString().split('T')[0]);

    const [customerId, setCustomerId] = useState<string>('');
    const [statement, setStatement] = useState('');
    const [currencyId, setCurrencyId] = useState<string>(currencies.find(c => c.symbol === 'SAR')?.id || currencies[0]?.id || '');

    const selectedCurrency = useMemo(() => currencies.find(c => c.id === currencyId), [currencyId, currencies]);
    
    const [
        items,
        { addItem, updateItem, resetItems },
        { grandTotal }
    ] = useInvoiceCalculator([], 0, 0); // No tax or loyalty for quotations

    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchModalRowIndex, setSearchModalRowIndex] = useState<number | null>(null);

    const handleSaveQuotation = () => {
        if (!currentUser) return;
        
        const validItems = items.filter(i => (i.partId || i.kitId) && i.quantity > 0);
        if (validItems.length === 0) {
            addToast(t('error_empty_invoice'), 'error'); // Re-use translation
            return;
        }
        if (!customerId) {
            addToast(t('please_select_customer'), 'error'); // Need translation
            return;
        }

        const finalCustomer = customers.find(c => c.id === customerId);
        if (!finalCustomer) return;

        const newQuotation: Quotation = {
            id: `Q-${Date.now().toString().slice(-6)}`,
            companyId: currentUser.companyId,
            customerName: finalCustomer.name,
            items: validItems.map(i => ({ partId: i.partId || i.kitId!, quantity: i.quantity, price: i.price })),
            total: grandTotal,
            date: quotationDate,
            expiryDate: expiryDate,
            status: 'draft',
            currencyId: currencyId,
            exchangeRate: selectedCurrency?.exchangeRate || 1,
            salespersonId: currentUser.role === 'Salesperson' ? currentUser.id : undefined,
            notes: statement,
        };
        
        setQuotations(prev => [newQuotation, ...prev]);
        logService.logActivity('create_quotation', { quotationId: newQuotation.id, total: newQuotation.total });
        
        resetItems();
        addToast(t('quotation_created_success'), 'success');
        setActiveTab('quotations');
    };
    
    return (
        <div className="h-full flex flex-col gap-4">
            <PartSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelectItem={(item: SearchableItem) => {
                    if (searchModalRowIndex === null) return;
                    if (item.type === 'part') {
                       updateItem(searchModalRowIndex, { type: 'part', partId: item.id, kitId: undefined, kitItems: undefined, name: item.name, price: item.sellingPrice, quantity: 1, discountPercent: 0, discountAmount: 0 });
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="md:col-span-2 bg-background border border-input rounded-md p-2">
                    <option value="" disabled>{t('select_customer')}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" value={quotationDate} onChange={e => setQuotationDate(e.target.value)} className="bg-background border border-input rounded-md p-2"/>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="bg-background border border-input rounded-md p-2"/>
            </div>

            <div className="flex-grow">
                <InvoiceItemsTable 
                    items={items}
                    onUpdateItem={updateItem}
                    onRemoveItem={(id) => { /* remove item logic */ }}
                    onAddItem={addItem}
                    onSearchPart={(index) => { setSearchModalRowIndex(index); setIsSearchModalOpen(true); }}
                    onGeneratePitch={() => { /* Not implemented for quotations */ }}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <textarea placeholder={t('notes')} value={statement} onChange={e => setStatement(e.target.value)} rows={4} className="lg:col-span-2 bg-background border border-input rounded-lg p-2"></textarea>
                <div className="space-y-2 bg-card p-4 rounded-lg border border-border">
                    <div className="flex justify-between font-bold text-xl pt-2"><span className="">{t('grand_total')}</span><span>{grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} {selectedCurrency?.symbol}</span></div>
                </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-border mt-2">
                 <button onClick={handleSaveQuotation} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"><Save size={18} />{t('save_quotation')}</button>
                 <button onClick={() => setActiveTab('quotations')} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-muted transition-colors"><ArrowLeft size={18} />{t('back_to_list')}</button>
            </div>
        </div>
    );
};

export default CreateQuotationForm;
