
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Lock, AlertTriangle, BookLock, Sparkles } from 'lucide-react';
import { JournalEntry, JournalEntryItem } from '../../types';
import { useToast } from '../../contexts/ToastContext';

const PostingAndClosing: React.FC = () => {
    const { t } = useLocalization();
    const {
        sales,
        purchaseOrders,
        accountingSettings,
        setAccountingSettings,
        chartOfAccounts,
        setChartOfAccounts,
        journalEntries,
        setJournalEntries,
        currentUser
    } = useAppStore();
    const { addToast } = useToast();
    
    const [closeUptoDate, setCloseUptoDate] = useState(new Date().toISOString().split('T')[0]);

    const { unpostedSalesCount, unpostedPurchasesCount } = useMemo(() => {
        const closeDate = new Date(closeUptoDate);
        closeDate.setHours(23, 59, 59, 999);
        return {
            unpostedSalesCount: sales.filter(s => !s.isPosted && new Date(s.date) <= closeDate).length,
            unpostedPurchasesCount: purchaseOrders.filter(p => p.status === 'Received' && !p.isPosted && new Date(p.date) <= closeDate).length,
        };
    }, [sales, purchaseOrders, closeUptoDate]);

    const canClose = unpostedSalesCount === 0 && unpostedPurchasesCount === 0;

    const handleClosePeriod = () => {
        if (!canClose) {
            addToast(t('error_unposted_docs_exist'), 'error');
            return;
        }

        const confirmMsg = t('close_period_warning').replace('{date}', closeUptoDate);
        if (window.confirm(confirmMsg)) {
            setAccountingSettings({ lastClosingDate: closeUptoDate });
            addToast(t('period_closed_successfully'), 'success');
        }
    };

    const handleGenerateClosingEntries = () => {
        const confirmMsg = t('generate_closing_entries_confirm').replace('{date}', closeUptoDate);
        if (!window.confirm(confirmMsg)) return;

        const { retainedEarningsAccountId } = accountingSettings;
        if (!retainedEarningsAccountId || !currentUser) {
            addToast(t('retained_earnings_account_not_set'), 'error');
            return;
        }
        
        const periodStartDate = accountingSettings.lastClosingDate ? new Date(accountingSettings.lastClosingDate) : new Date(new Date(closeUptoDate).getFullYear(), 0, 0);
        periodStartDate.setDate(periodStartDate.getDate() + 1);
        const periodEndDate = new Date(closeUptoDate);
        periodEndDate.setHours(23, 59, 59, 999);

        const accountsToClose = chartOfAccounts.filter(acc => acc.type === 'Revenue' || acc.type === 'Expense');
        const closingJournalItems: JournalEntryItem[] = [];
        let netProfit = 0;

        accountsToClose.forEach(acc => {
            const periodMovements = journalEntries
                .filter(je => {
                    const jeDate = new Date(je.date);
                    return jeDate >= periodStartDate && jeDate <= periodEndDate;
                })
                .flatMap(je => je.items)
                .filter(item => item.accountId === acc.id);
            
            if (periodMovements.length === 0) return;

            const { debit, credit } = periodMovements.reduce((sum, item) => ({ debit: sum.debit + item.debit, credit: sum.credit + item.credit }), { debit: 0, credit: 0 });

            if (acc.type === 'Revenue') {
                const balance = credit - debit;
                if (balance > 0) {
                    closingJournalItems.push({ accountId: acc.id, debit: balance, credit: 0 });
                    netProfit += balance;
                }
            } else { // Expense
                const balance = debit - credit;
                if (balance > 0) {
                    closingJournalItems.push({ accountId: acc.id, debit: 0, credit: balance });
                    netProfit -= balance;
                }
            }
        });

        if (closingJournalItems.length === 0) {
             addToast(t('no_balances_to_close'), 'success');
             return;
        }

        closingJournalItems.push({
            accountId: retainedEarningsAccountId,
            debit: netProfit < 0 ? -netProfit : 0,
            credit: netProfit > 0 ? netProfit : 0,
        });
        
        const newEntry: JournalEntry = {
            id: `je-close-${closeUptoDate}`,
            companyId: currentUser.companyId,
            entryNumber: `JV-CL-${closeUptoDate}`,
            date: closeUptoDate,
            description: t('closing_entry_for_period').replace('{date}', closeUptoDate),
            items: closingJournalItems,
            isPosted: true, // Closing entries are final
        };

        setJournalEntries(prev => [...prev, newEntry]);
        
        const balanceChanges = new Map<string, number>();
        newEntry.items.forEach(item => {
            const acc = chartOfAccounts.find(a => a.id === item.accountId);
            if (!acc) return;
            let change = (['Asset', 'Expense'].includes(acc.type)) ? (item.debit - item.credit) : (item.credit - item.debit);
            balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
        });
        
        setChartOfAccounts(prevAccs => prevAccs.map(acc => 
            balanceChanges.has(acc.id) ? { ...acc, balance: acc.balance + balanceChanges.get(acc.id)! } : acc
        ));
        
        addToast(t('closing_entry_generated_successfully'), 'success');
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl font-bold">{t('posting_closing')}</h2>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <Lock size={14} />
                        <span>{t('last_closing_date')}:</span>
                        <span className="font-semibold text-foreground">{accountingSettings.lastClosingDate || t('no_period_closed')}</span>
                    </div>
                </div>
                <div className="border-t border-border p-4 sm:p-6 space-y-3">
                    <h3 className="text-md font-semibold">{t('unposted_documents_summary')}</h3>
                    <div className="flex items-center justify-between text-sm">
                        <p>{t('unposted_sales')}:</p>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${unpostedSalesCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{unpostedSalesCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <p>{t('unposted_purchases')}:</p>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${unpostedPurchasesCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{unpostedPurchasesCount}</span>
                    </div>
                    {!canClose && (
                        <div className="p-3 mt-2 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/40 dark:text-yellow-300 flex items-center gap-3">
                            <AlertTriangle size={20} />
                            <div>
                                <h4 className="font-bold">{t('action_required')}</h4>
                                <p className="text-sm">{t('please_post_all_documents')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="flex flex-col">
                    <div className="p-6">
                        <h3 className="text-lg font-bold">{t('close_period')}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{t('close_period_warning_short')}</p>
                    </div>
                    <div className="p-6 flex-grow space-y-2">
                        <label htmlFor="close-date" className="block text-sm font-medium">{t('close_up_to_date')}</label>
                        <input id="close-date" type="date" value={closeUptoDate} onChange={e => setCloseUptoDate(e.target.value)} className="block w-full max-w-xs bg-background border border-input rounded-md p-2"/>
                    </div>
                    <div className="p-6 mt-auto bg-muted/30 border-t border-border">
                        <button onClick={handleClosePeriod} disabled={!canClose} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg shadow hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <BookLock size={18}/>
                            <span>{t('close_period')}</span>
                        </button>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <div className="p-6">
                        <h3 className="text-lg font-bold">{t('generate_closing_entries')}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{t('generate_closing_entries_desc')}</p>
                    </div>
                    <div className="p-6 flex-grow">
                        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-300 flex items-center gap-3">
                            <AlertTriangle size={20} />
                            <p className="text-sm font-medium">{t('year_end_process_warning')}</p>
                        </div>
                    </div>
                    <div className="p-6 mt-auto bg-muted/30 border-t border-border">
                         <button onClick={handleGenerateClosingEntries} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors">
                            <Sparkles size={18}/>
                            <span>{t('generate_closing_entries')}</span>
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default PostingAndClosing;
