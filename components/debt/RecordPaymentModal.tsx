import React, { useState, useMemo, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { X, Save } from 'lucide-react';
import { Sale, PurchaseOrder, Currency, ExchangeCompany, FinancialAccount } from '../../types';

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (paymentData: any) => void;
    type: 'receivable' | 'payable';
    preselectedPartyId?: string;
}

type OutstandingDoc = (Sale | PurchaseOrder) & { balance: number };

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, onSave, type, preselectedPartyId }) => {
    const { t } = useLocalization();
    const { customers, suppliers, sales, purchaseOrders, exchangeCompanies, currencies, financialAccounts } = useAppStore();

    const [partyId, setPartyId] = useState(preselectedPartyId || '');
    const [totalAmount, setTotalAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    
    // New state for payment method and multi-currency
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'exchange_transfer'>('cash');
    const [exchangeCompanyId, setExchangeCompanyId] = useState('');
    const [transferReference, setTransferReference] = useState('');
    const [currencyId, setCurrencyId] = useState(currencies.find(c => c.symbol === 'SAR')?.id || '');
    const [exchangeRate, setExchangeRate] = useState('1');
    const [fromAccountId, setFromAccountId] = useState('');

    useEffect(() => {
        const currency = currencies.find(c => c.id === currencyId);
        if(currency) setExchangeRate(String(currency.exchangeRate));
    }, [currencyId, currencies]);

    const parties = useMemo(() => (type === 'receivable' ? customers : suppliers), [type, customers, suppliers]);
    
    useEffect(() => {
        setPartyId(preselectedPartyId || '');
        setTotalAmount('');
        setAllocations({});
    }, [isOpen, type, preselectedPartyId]);
    
    const outstandingDocs = useMemo<OutstandingDoc[]>(() => {
        if (!partyId) return [];
        let docs: OutstandingDoc[] = [];
        const numExchangeRate = parseFloat(exchangeRate) || 1;
        if (type === 'receivable') {
            const customerName = parties.find(p => p.id === partyId)?.name;
            docs = sales
                .filter(s => s.customerName === customerName && (s.total - s.paidAmount > 0.01))
                .map(s => ({ ...s, balance: (s.total - s.paidAmount) * (s.exchangeRate / numExchangeRate) }));
        } else {
            const supplierName = parties.find(p => p.id === partyId)?.name;
            docs = purchaseOrders
                .filter(po => po.supplierName === supplierName && (po.total - po.paidAmount > 0.01))
                .map(po => ({ ...po, balance: (po.total - po.paidAmount) * (po.exchangeRate / numExchangeRate) }));
        }
        return docs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [partyId, type, sales, purchaseOrders, parties, exchangeRate]);

    useEffect(() => { setAllocations({}); }, [partyId]);

    const totalAllocated = useMemo(() => {
        return Object.values(allocations).reduce((sum: number, amount) => sum + Number(amount || 0), 0);
    }, [allocations]);

    const remainingToAllocate = (Number(totalAmount) || 0) - totalAllocated;

    const handleAutoApply = () => {
        let amountToApply = Number(totalAmount) || 0;
        const newAllocations: Record<string, string> = {};
        for (const doc of outstandingDocs) {
            if (amountToApply <= 0) break;
            const appliedAmount = Math.min(amountToApply, doc.balance);
            newAllocations[doc.id] = String(appliedAmount.toFixed(2));
            amountToApply -= appliedAmount;
        }
        setAllocations(newAllocations);
    };
    
    const handleAllocationChange = (docId: string, value: string) => {
        setAllocations(prev => ({ ...prev, [docId]: value }));
    };

    const handleSaveClick = () => {
        const numExchangeRate = parseFloat(exchangeRate) || 1;
        const finalAllocations = Object.entries(allocations)
            .map(([docId, amount]) => ({ docId, amountInBase: (Number(amount) || 0) * numExchangeRate }))
            .filter(alloc => alloc.amountInBase > 0);
            
        onSave({
            partyId, totalAmount: Number(totalAmount), date, notes, type,
            allocations: finalAllocations, paymentMethod, exchangeCompanyId,
            transferReference, currencyId, exchangeRate: numExchangeRate, fromAccountId
        });
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-3xl m-4" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('record_payment')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Party and Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{type === 'receivable' ? t('customer') : t('supplier')}</label>
                            <select value={partyId} onChange={e => setPartyId(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2">
                                <option value="" disabled>{t('select_customer_or_supplier')}</option>
                                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div><label className="block text-sm font-medium text-muted-foreground">{t('date')}</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2"/></div>
                    </div>
                    
                    {/* Payment Method */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('payment_method')}</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="mt-1 block w-full bg-background border border-input rounded-md p-2">
                                <option value="cash">{t('cash')}</option>
                                <option value="exchange_transfer">{t('exchange_transfer')}</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-muted-foreground">{type === 'receivable' ? t('deposit_into_account') : t('payment_from_account')}</label>
                             <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2">
                                <option value="">-</option>
                                {financialAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {paymentMethod === 'exchange_transfer' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg border border-border">
                             <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('exchange_company')}</label>
                                <select value={exchangeCompanyId} onChange={e => setExchangeCompanyId(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2">
                                    <option value="" disabled>{t('select_exchange_company')}</option>
                                    {exchangeCompanies.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('transfer_reference')}</label>
                                <input type="text" value={transferReference} onChange={e => setTransferReference(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2"/>
                            </div>
                        </div>
                    )}
                    
                    {/* Amount & Currency */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                         <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('currency')}</label>
                            <select value={currencyId} onChange={e => setCurrencyId(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2">
                                {currencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('amount')}</label>
                            <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('exchange_rate')}</label>
                            <input type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2"/>
                        </div>
                    </div>
                     <button onClick={handleAutoApply} disabled={!totalAmount || outstandingDocs.length === 0} className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50">{t('auto_apply')}</button>

                    <div>
                        <h3 className="text-md font-semibold mt-4 mb-2">{t('unpaid_invoices')} ({t('in')} {currencies.find(c=>c.id===currencyId)?.symbol})</h3>
                        <div className="border border-input rounded-md max-h-60 overflow-y-auto">
                            {outstandingDocs.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0"><tr>
                                        <th className="p-2 text-start">{t('invoice_no')}</th>
                                        <th className="p-2 text-start">{t('due_date')}</th>
                                        <th className="p-2 text-end">{t('balance_due')}</th>
                                        <th className="p-2 text-end w-40">{t('amount_to_apply')}</th>
                                    </tr></thead>
                                    <tbody>{outstandingDocs.map(doc => (
                                        <tr key={doc.id}>
                                            <td className="p-2 font-mono">{doc.id}</td>
                                            <td className="p-2">{doc.dueDate}</td>
                                            <td className="p-2 text-end">{doc.balance.toFixed(2)}</td>
                                            <td className="p-1"><input type="number" value={allocations[doc.id] ?? ''} onChange={e => handleAllocationChange(doc.id, e.target.value)} max={doc.balance} className="w-full p-1 bg-input rounded text-end"/></td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            ) : (<p className="p-4 text-center text-muted-foreground">{t('no_unpaid_invoices')}</p>)}
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-sm font-semibold p-2 bg-muted/50 rounded-md">
                        <span>{t('total_applied')} / {t('remaining')}</span>
                        <span>{totalAllocated.toFixed(2)} / <span className={remainingToAllocate < -0.01 ? 'text-red-500' : ''}>{remainingToAllocate.toFixed(2)}</span></span>
                    </div>

                    <label className="block text-sm font-medium text-muted-foreground">{t('notes')}</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-background border border-input rounded-md p-2"></textarea>
                </div>
                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                    <button onClick={handleSaveClick} disabled={remainingToAllocate < -0.01 || !partyId || !totalAmount} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"><Save size={16}/> {t('save_payment')}</button>
                </footer>
            </div>
        </div>
    );
};