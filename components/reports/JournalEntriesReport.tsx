import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Account, JournalEntry } from '../../types';
import AccountSearchModal from '../accounting/AccountSearchModal';
import { ChevronDown, ChevronUp } from 'lucide-react';

const JournalEntriesReport: React.FC = () => {
    const { t, lang } = useLocalization();
    const { journalEntries, chartOfAccounts } = useAppStore();
    const [filterAccount, setFilterAccount] = useState<Account | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

    const accountsMap = useMemo(() => new Map(chartOfAccounts.map(a => [a.id, a.name])), [chartOfAccounts]);

    const filteredEntries = useMemo(() => {
        let entries = [...journalEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (filterAccount) {
            entries = entries.filter(entry => entry.items.some(item => item.accountId === filterAccount.id));
        }
        return entries;
    }, [journalEntries, filterAccount]);

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const toggleExpand = (entryId: string) => {
        setExpandedEntryId(prev => prev === entryId ? null : entryId);
    };

    return (
        <div className="space-y-6">
            <AccountSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSelectAccount={setFilterAccount} />
            
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-muted-foreground">{t('filter_by_account')}</label>
                        <button onClick={() => setIsModalOpen(true)} className="mt-1 w-full max-w-md text-start bg-background border border-input rounded-md p-2">
                            {filterAccount ? `${filterAccount.id} - ${filterAccount.name}` : t('all_accounts')}
                        </button>
                    </div>
                     {filterAccount && <button onClick={() => setFilterAccount(null)} className="mt-6 text-sm text-primary">{t('clear_filter')}</button>}
                </div>
            </Card>

            <div className="space-y-3">
                {filteredEntries.map(entry => {
                    const total = entry.items.reduce((sum, item) => sum + item.debit, 0);
                    const isExpanded = expandedEntryId === entry.id;
                    return (
                        <Card key={entry.id} className="p-0">
                            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-accent/50" onClick={() => toggleExpand(entry.id)}>
                                <div>
                                    <p className="font-bold">{entry.entryNumber} <span className="ms-4 font-normal text-muted-foreground">{entry.date}</span></p>
                                    <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono font-semibold">{formatCurrency(total)} {lang === 'ar' ? 'ر.س' : 'SAR'}</span>
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="border-t border-border p-4 bg-muted/20">
                                    <table className="w-full text-sm">
                                        <thead className="text-xs text-muted-foreground">
                                            <tr>
                                                <th className="p-2 text-start">{t('account')}</th>
                                                <th className="p-2 text-end">{t('debit')}</th>
                                                <th className="p-2 text-end">{t('accounting_credit')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entry.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="p-2">{accountsMap.get(item.accountId) || item.accountId}</td>
                                                    <td className="p-2 text-end font-mono">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
                                                    <td className="p-2 text-end font-mono">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
             {filteredEntries.length === 0 && <Card className="p-8 text-center text-muted-foreground">{t('no_entries_found')}</Card>}
        </div>
    );
};

export default JournalEntriesReport;
