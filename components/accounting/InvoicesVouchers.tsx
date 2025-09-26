

import React, { useState, useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Sale, PurchaseOrder, SalesReturn, Part, JournalEntry, JournalEntryItem, Account } from '../../types';
import InteractiveTable from '../common/InteractiveTable';
import { BookUp, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const InvoicesVouchers: React.FC = () => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState('sales');
    const { addToast } = useToast();

    const { 
        sales, setSales,
        purchaseOrders, setPurchaseOrders,
        salesReturns, setSalesReturns,
        parts,
        accountingSettings,
        setJournalEntries,
        setChartOfAccounts,
        currentUser
    } = useAppStore();

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);

    const applyBalanceChanges = (journalItems: JournalEntryItem[]) => {
        setChartOfAccounts((prevAccs: Account[]) => {
            const accountsMap = new Map(prevAccs.map(acc => [acc.id, acc]));
            const balanceChanges = new Map<string, number>();

            journalItems.forEach(item => {
                const acc = accountsMap.get(item.accountId);
                if (acc) {
                    let change = 0;
                    if (['Asset', 'Expense'].includes(acc.type)) {
                        change = item.debit - item.credit;
                    } else { // Liability, Equity, Revenue
                        change = item.credit - item.debit;
                    }
                    balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
                }
            });

            return prevAccs.map(acc => 
                balanceChanges.has(acc.id) 
                ? { ...acc, balance: acc.balance + balanceChanges.get(acc.id)! } 
                : acc
            );
        });
    };

    const handlePostSale = (sale: Sale) => {
        const { defaultArAccountId, defaultSalesAccountId, defaultCogsAccountId, defaultInventoryAccountId, isVatEnabled, defaultVatRate, defaultVatPayableAccountId } = accountingSettings;

        if (!defaultArAccountId || !defaultSalesAccountId || !defaultCogsAccountId || !defaultInventoryAccountId || (isVatEnabled && !defaultVatPayableAccountId) || !currentUser) {
            addToast(t('error_default_accounts_not_set'), 'error');
            return;
        }
        
        const costOfGoodsSold = sale.items.reduce((sum, item) => {
            const part = partsMap.get(item.partId);
            const cost = part?.averageCost ?? part?.purchasePrice ?? 0;
            return sum + (cost * item.quantity);
        }, 0);

        const journalItems: JournalEntryItem[] = [];

        if(isVatEnabled) {
            const baseRate = 1 + defaultVatRate;
            const preVatAmount = sale.total / baseRate;
            const vatAmount = sale.total - preVatAmount;

            const saleInBaseCurrency = {
                total: sale.total * sale.exchangeRate,
                preVat: preVatAmount * sale.exchangeRate,
                vat: vatAmount * sale.exchangeRate
            };
            
            journalItems.push(
                { accountId: defaultArAccountId, debit: saleInBaseCurrency.total, credit: 0 },
                { accountId: defaultSalesAccountId, debit: 0, credit: saleInBaseCurrency.preVat },
                { accountId: defaultVatPayableAccountId!, debit: 0, credit: saleInBaseCurrency.vat }
            );
        } else {
             const totalInBaseCurrency = sale.total * sale.exchangeRate;
             journalItems.push(
                { accountId: defaultArAccountId, debit: totalInBaseCurrency, credit: 0 },
                { accountId: defaultSalesAccountId, debit: 0, credit: totalInBaseCurrency }
             );
        }
        
        // COGS is always in base currency
        journalItems.push(
            { accountId: defaultCogsAccountId, debit: costOfGoodsSold, credit: 0 },
            { accountId: defaultInventoryAccountId, debit: 0, credit: costOfGoodsSold }
        );
        
        const newEntry: JournalEntry = {
            id: `je-${sale.id}`,
            companyId: currentUser.companyId,
            entryNumber: `JV-S-${sale.id}`,
            date: sale.date,
            description: `${t('sales_invoice')} #${sale.id}`,
            items: journalItems,
            isPosted: true, // Auto-post on creation
        };

        setJournalEntries(prev => [...prev, newEntry]);
        setSales(prev => prev.map(s => s.id === sale.id ? { ...s, isPosted: true, journalEntryId: newEntry.id } : s));
        
        applyBalanceChanges(journalItems);
        
        addToast(t('posting_successful'), 'success');
    };
    
    const handlePostPurchaseInvoice = (po: PurchaseOrder) => {
        if (po.status !== 'Received' || !currentUser) return;

        const { defaultInventoryAccountId, defaultApAccountId, isVatEnabled, defaultVatRate, defaultVatReceivableAccountId } = accountingSettings;
        if (!defaultInventoryAccountId || !defaultApAccountId || (isVatEnabled && !defaultVatReceivableAccountId)) {
            addToast(t('error_default_accounts_not_set'), 'error');
            return;
        }
        
        const journalItems: JournalEntryItem[] = [];

        if (isVatEnabled) {
            const vatAmount = po.total * defaultVatRate;
            const totalWithVat = po.total + vatAmount;

            const poInBaseCurrency = {
                total: po.total * po.exchangeRate,
                vat: vatAmount * po.exchangeRate,
                totalWithVat: totalWithVat * po.exchangeRate
            };

             journalItems.push(
                 { accountId: defaultInventoryAccountId, debit: poInBaseCurrency.total, credit: 0 },
                 { accountId: defaultVatReceivableAccountId!, debit: poInBaseCurrency.vat, credit: 0},
                 { accountId: defaultApAccountId, debit: 0, credit: poInBaseCurrency.totalWithVat },
            );
        } else {
            const totalInBaseCurrency = po.total * po.exchangeRate;
            journalItems.push(
                 { accountId: defaultInventoryAccountId, debit: totalInBaseCurrency, credit: 0 },
                 { accountId: defaultApAccountId, debit: 0, credit: totalInBaseCurrency },
            );
        }

        const newEntry: JournalEntry = {
            id: `je-${po.id}`,
            companyId: currentUser.companyId,
            entryNumber: `JV-P-${po.id}`,
            date: po.date,
            description: `${t('purchase_order')} #${po.id}`,
            items: journalItems,
            isPosted: true,
        };

        setJournalEntries(prev => [...prev, newEntry]);
        setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, isPosted: true, journalEntryId: newEntry.id } : p));
        
        applyBalanceChanges(journalItems);
        
        addToast(t('posting_successful'), 'success');
    };
    
    const handlePostReturn = (salesReturn: SalesReturn) => {
        const { defaultArAccountId, defaultSalesReturnAccountId, defaultCogsAccountId, defaultInventoryAccountId, isVatEnabled, defaultVatRate, defaultVatPayableAccountId } = accountingSettings;
        const originalSale = sales.find(s => s.id === salesReturn.originalSaleId);

        if (!defaultArAccountId || !defaultSalesReturnAccountId || !defaultCogsAccountId || !defaultInventoryAccountId || (isVatEnabled && !defaultVatPayableAccountId) || !originalSale || !currentUser) {
            addToast(t('error_default_accounts_not_set'), 'error');
            return;
        }
        
        const costOfGoodsReturned = salesReturn.items.reduce((sum, item) => {
            const part = partsMap.get(item.partId);
            const cost = part?.averageCost ?? part?.purchasePrice ?? 0;
            return sum + (cost * item.quantity);
        }, 0);

        const journalItems: JournalEntryItem[] = [];

        if(isVatEnabled) {
            const baseRate = 1 + defaultVatRate;
            const preVatAmount = salesReturn.total / baseRate;
            const vatAmount = salesReturn.total - preVatAmount;

            const returnInBaseCurrency = {
                total: salesReturn.total * originalSale.exchangeRate,
                preVat: preVatAmount * originalSale.exchangeRate,
                vat: vatAmount * originalSale.exchangeRate
            };
            
            journalItems.push(
                { accountId: defaultSalesReturnAccountId, debit: returnInBaseCurrency.preVat, credit: 0 },
                { accountId: defaultVatPayableAccountId!, debit: returnInBaseCurrency.vat, credit: 0 },
                { accountId: defaultArAccountId, debit: 0, credit: returnInBaseCurrency.total }
            );
        } else {
            const totalInBaseCurrency = salesReturn.total * originalSale.exchangeRate;
             journalItems.push(
                { accountId: defaultSalesReturnAccountId, debit: totalInBaseCurrency, credit: 0 },
                { accountId: defaultArAccountId, debit: 0, credit: totalInBaseCurrency }
            );
        }

        journalItems.push(
            { accountId: defaultInventoryAccountId, debit: costOfGoodsReturned, credit: 0 },
            { accountId: defaultCogsAccountId, debit: 0, credit: costOfGoodsReturned }
        );
        
        const newEntry: JournalEntry = {
            id: `je-${salesReturn.id}`,
            companyId: currentUser.companyId,
            entryNumber: `JV-R-${salesReturn.id}`,
            date: salesReturn.date,
            description: `${t('sales_return')} #${salesReturn.id}`,
            items: journalItems,
            isPosted: true,
        };

        setJournalEntries(prev => [...prev, newEntry]);
        setSalesReturns(prev => prev.map(r => r.id === salesReturn.id ? { ...r, isPosted: true, journalEntryId: newEntry.id } : r));
        
        applyBalanceChanges(journalItems);
        
        addToast(t('posting_successful'), 'success');
    };

    const salesColumns = useMemo(() => [
        { Header: t('sale_id'), accessor: 'id', width: 150 },
        { Header: t('date'), accessor: 'date', width: 150 },
        { Header: t('customer_name'), accessor: 'customerName', width: 250 },
        { Header: t('total'), accessor: 'total', width: 150, Cell: ({row}: { row: Sale }) => row.total.toLocaleString() },
        { Header: t('posting_status'), accessor: 'isPosted', width: 150, Cell: ({row}: { row: Sale }) => (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.isPosted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {row.isPosted ? t('posted') : t('unposted')}
            </span>
        )},
        { Header: t('actions'), accessor: 'actions', width: 150, Cell: ({row}: { row: Sale }) => (
            row.isPosted ?
            <button className="flex items-center gap-2 text-sm text-green-600" disabled><CheckCircle size={16}/> {t('posted')}</button> :
            <button onClick={() => handlePostSale(row)} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"><BookUp size={16}/> {t('post_to_ledger')}</button>
        )}
    ], [t]);
    
     const invoiceColumns = useMemo(() => [
        { Header: t('po_id'), accessor: 'id', width: 150 },
        { Header: t('date'), accessor: 'date', width: 150 },
        { Header: t('supplier_name'), accessor: 'supplierName', width: 250 },
        { Header: t('total'), accessor: 'total', width: 150, Cell: ({row}: { row: PurchaseOrder }) => row.total.toLocaleString() },
        { Header: t('status'), accessor: 'status', width: 150 },
        { Header: t('posting_status'), accessor: 'isPosted', width: 150, Cell: ({row}: { row: PurchaseOrder }) => (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.isPosted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {row.isPosted ? t('posted') : t('unposted')}
            </span>
        )},
        { Header: t('actions'), accessor: 'actions', width: 150, Cell: ({row}: { row: PurchaseOrder }) => {
            const canPost = row.status === 'Received' && !row.isPosted;
            return row.isPosted ? 
            <button className="flex items-center gap-2 text-sm text-green-600" disabled><CheckCircle size={16}/> {t('posted')}</button> :
            <button onClick={() => handlePostPurchaseInvoice(row)} disabled={!canPost} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"><BookUp size={16}/> {t('post_to_ledger')}</button>
        }}
    ], [t]);
    
    const returnsColumns = useMemo(() => [
        { Header: t('return_id'), accessor: 'id', width: 150 },
        { Header: t('date'), accessor: 'date', width: 150 },
        { Header: t('customer_name'), accessor: 'customerName', width: 250 },
        { Header: t('total'), accessor: 'total', width: 150, Cell: ({row}: { row: SalesReturn }) => row.total.toLocaleString() },
        { Header: t('posting_status'), accessor: 'isPosted', width: 150, Cell: ({row}: { row: SalesReturn }) => (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.isPosted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {row.isPosted ? t('posted') : t('unposted')}
            </span>
        )},
        { Header: t('actions'), accessor: 'actions', width: 150, Cell: ({row}: { row: SalesReturn }) => (
            row.isPosted ?
            <button className="flex items-center gap-2 text-sm text-green-600" disabled><CheckCircle size={16}/> {t('posted')}</button> :
            <button onClick={() => handlePostReturn(row)} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"><BookUp size={16}/> {t('post_to_ledger')}</button>
        )}
    ], [t]);


    const unpostedSales = useMemo(() => sales.filter(s => !s.isPosted), [sales]);
    const unpostedPurchaseInvoices = useMemo(() => purchaseOrders.filter(p => !p.isPosted && p.status === 'Received'), [purchaseOrders]);
    const unpostedReturns = useMemo(() => salesReturns.filter(r => !r.isPosted), [salesReturns]);

    const tabs = [
        { id: 'sales', label: t('sales_invoices'), data: unpostedSales, columns: salesColumns },
        { id: 'purchases', label: t('purchase_orders'), data: unpostedPurchaseInvoices, columns: invoiceColumns },
        { id: 'returns', label: t('sales_returns'), data: unpostedReturns, columns: returnsColumns },
    ];

    const renderContent = () => {
        switch(activeTab) {
            case 'sales':
                if (unpostedSales.length === 0) return <div className="text-center py-10 text-muted-foreground">{t('no_unposted_documents')}</div>;
                return <InteractiveTable columns={salesColumns} data={unpostedSales} setData={setSales as any} />;
            case 'purchases':
                if (unpostedPurchaseInvoices.length === 0) return <div className="text-center py-10 text-muted-foreground">{t('no_unposted_documents')}</div>;
                return <InteractiveTable columns={invoiceColumns} data={unpostedPurchaseInvoices} setData={setPurchaseOrders as any} />;
            case 'returns':
                 if (unpostedReturns.length === 0) return <div className="text-center py-10 text-muted-foreground">{t('no_unposted_documents')}</div>;
                return <InteractiveTable columns={returnsColumns} data={unpostedReturns} setData={setSalesReturns as any} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
             <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                        activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                    >
                        <span>{tab.label}</span>
                        {tab.data.length > 0 && <span className="bg-primary/20 text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{tab.data.length}</span>}
                    </button>
                ))}
                </nav>
            </div>
            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default InvoicesVouchers;