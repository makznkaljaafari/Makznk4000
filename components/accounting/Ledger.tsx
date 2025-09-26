

import React, { useState, useMemo, FC } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Account, JournalEntryItem } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import AccountSearchModal from './AccountSearchModal';
import { Search } from 'lucide-react';

const Stat: FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`px-4 py-2 rounded-lg ${className}`}>
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
  </div>
);

const Ledger: React.FC = () => {
    const { t, lang } = useLocalization();
    const { journalEntries } = useAppStore();
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === 'ar' ? 'р.с' : 'SAR'}`;
    };
    
    const allTransactionsForAccount = useMemo(() => {
        if (!selectedAccount) return [];
        return journalEntries
            .filter(entry => entry.isPosted) // Only show posted entries in ledger
            .flatMap(entry => 
                entry.items
                    .filter(item => item.accountId === selectedAccount.id)
                    .map(item => ({...item, date: entry.date, description: entry.description, entryNumber: entry.entryNumber }))
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [selectedAccount, journalEntries]);

    const reportData = useMemo(() => {
        if (!selectedAccount) return null;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        const isAssetOrExpense = ['Asset', 'Expense'].includes(selectedAccount.type);

        const openingBalance = allTransactionsForAccount
            .filter(t => new Date(t.date) < start)
            .reduce((acc, t) => acc + (isAssetOrExpense ? (t.debit - t.credit) : (t.credit - t.debit)), 0);
            
        const transactionsInPeriod = allTransactionsForAccount.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });

        const summary = transactionsInPeriod.reduce((acc, t) => ({
            debits: acc.debits + t.debit,
            credits: acc.credits + t.credit,
        }), { debits: 0, credits: 0 });

        let currentBalance = openingBalance;
        const displayRows = transactionsInPeriod.map(t => {
            currentBalance += (isAssetOrExpense ? (t.debit - t.credit) : (t.credit - t.debit));
            return { ...t, runningBalance: currentBalance };
        });

        return {
            openingBalance,
            totalDebits: summary.debits,
            totalCredits: summary.credits,
            closingBalance: currentBalance,
            transactions: displayRows,
        };
    }, [allTransactionsForAccount, startDate, endDate, selectedAccount]);

    return (
        <div className="h-full flex flex-col gap-4">
            <AccountSearchModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelectAccount={setSelectedAccount}
            />

            <Card className="p-4 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-muted-foreground">{t('account')}</label>
                        <button onClick={() => setIsModalOpen(true)} className="mt-1 w-full flex justify-between items-center bg-background border border-input rounded-md shadow-sm py-2 px-3 text-start">
                            <span className={selectedAccount ? 'text-foreground' : 'text-muted-foreground'}>
                                {selectedAccount ? `${selectedAccount.id} - ${selectedAccount.name}` : t('select_an_account')}
                            </span>
                             <Search size={16} className="text-muted-foreground"/>
                        </button>
                    </div>
                     <div>
                        <label htmlFor="start-date" className="text-sm font-medium text-muted-foreground">{t('from')}:</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="text-sm font-medium text-muted-foreground">{t('to')}:</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                    </div>
                </div>
            </Card>

            {selectedAccount ? (
                reportData ? (
                <div className="flex-grow flex flex-col gap-4 min-h-0">
                    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/50 rounded-lg p-4 border border-border">
                        <Stat label={t('opening_balance')} value={formatCurrency(reportData.openingBalance)} />
                        <Stat label={t('total_debits')} value={formatCurrency(reportData.totalDebits)} className="text-red-500" />
                        <Stat label={t('total_credits')} value={formatCurrency(reportData.totalCredits)} className="text-green-500" />
                        <Stat label={t('closing_balance')} value={formatCurrency(reportData.closingBalance)} className="font-orbitron" />
                    </dl>
                     <div className="flex-grow overflow-auto border border-border rounded-lg">
                         <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-start font-semibold">{t('date')}</th>
                                    <th className="px-4 py-3 text-start font-semibold">{t('reference')}</th>
                                    <th className="px-4 py-3 text-start font-semibold">{t('description')}</th>
                                    <th className="px-4 py-3 text-end font-semibold">{t('debit')}</th>
                                    <th className="px-4 py-3 text-end font-semibold">{t('accounting_credit')}</th>
                                    <th className="px-4 py-3 text-end font-semibold">{t('running_balance')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                <tr className="font-semibold bg-muted/20">
                                    <td colSpan={5} className="px-4 py-2 text-start">{t('opening_balance')}</td>
                                    <td className="px-4 py-2 text-end">{formatCurrency(reportData.openingBalance)}</td>
                                </tr>
                                {reportData.transactions.map((t, i) => (
                                    <tr key={i} className="hover:bg-accent">
                                        <td className="px-4 py-2 whitespace-nowrap">{t.date}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{t.entryNumber}</td>
                                        <td className="px-4 py-2 text-muted-foreground text-xs">{t.description}</td>
                                        <td className="px-4 py-2 text-end text-red-500">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                        <td className="px-4 py-2 text-end text-green-500">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                        <td className="px-4 py-2 text-end font-semibold">{formatCurrency(t.runningBalance)}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold bg-muted/50 sticky bottom-0">
                                    <td colSpan={5} className="px-4 py-3 text-start">{t('closing_balance')}</td>
                                    <td className="px-4 py-3 text-end">{formatCurrency(reportData.closingBalance)}</td>
                                </tr>
                            </tbody>
                         </table>
                     </div>
                 </div>
                ) : (
                    <Card className="flex-grow flex items-center justify-center">
                        <p className="text-muted-foreground text-lg">{t('no_transactions_for_account')}</p>
                    </Card>
                )
            ) : (
                <Card className="flex-grow flex items-center justify-center">
                    <p className="text-muted-foreground text-lg">{t('select_account_to_view_ledger')}</p>
                </Card>
            )}
        </div>
    );
};

export default Ledger;
