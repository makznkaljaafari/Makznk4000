

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { JournalEntry } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Edit, Trash2, CheckCircle, AlertCircle, BookUp, FileCheck } from 'lucide-react';
import JournalEntryModal from './JournalEntryModal';

const EntryReview: React.FC = () => {
    const { t } = useLocalization();
    const { journalEntries, setJournalEntries, chartOfAccounts, setChartOfAccounts } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const unpostedEntries = useMemo(() => {
        return journalEntries
            .filter(je => !je.isPosted)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [journalEntries]);

    const isEntryBalanced = (entry: JournalEntry): boolean => {
        const totals = entry.items.reduce((acc, item) => ({
            debit: acc.debit + item.debit,
            credit: acc.credit + item.credit,
        }), { debit: 0, credit: 0 });
        return totals.debit > 0 && totals.debit.toFixed(5) === totals.credit.toFixed(5);
    };

    const handleOpenModal = (entry: JournalEntry) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    const handlePostEntry = (entryId: string) => {
        setJournalEntries(prev => prev.map(je => 
            je.id === entryId ? { ...je, isPosted: true } : je
        ));
        showNotification(t('entry_posted_successfully'));
    };
    
    const handlePostAll = () => {
        let postedCount = 0;
        setJournalEntries(prev => prev.map(je => {
            if (!je.isPosted && isEntryBalanced(je)) {
                postedCount++;
                return { ...je, isPosted: true };
            }
            return je;
        }));
        if (postedCount > 0) {
            showNotification(t('all_entries_posted'));
        }
    };

    const handleDeleteEntry = (entryToDelete: JournalEntry) => {
        if (!window.confirm(t('delete_entry_confirm'))) return;

        const balanceChanges = new Map<string, number>();
        entryToDelete.items.forEach(item => {
            const acc = chartOfAccounts.find(a => a.id === item.accountId);
            if (!acc) return;
            const change = (['Asset', 'Expense'].includes(acc.type)) ? (item.credit - item.debit) : (item.debit - item.credit);
            balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
        });

        setChartOfAccounts(prevAccounts => 
            prevAccounts.map(acc => {
                if (balanceChanges.has(acc.id)) {
                    return { ...acc, balance: acc.balance + balanceChanges.get(acc.id)! };
                }
                return acc;
            })
        );

        setJournalEntries(prev => prev.filter(je => je.id !== entryToDelete.id));
        showNotification(t('entry_deleted_successfully'));
    };

    const handleSaveFromModal = (entryData: Omit<JournalEntry, 'id' | 'entryNumber'> & { id?: string }) => {
        const oldEntry = entryData.id ? journalEntries.find(je => je.id === entryData.id) : null;
        
        const balanceChanges = new Map<string, number>();

        if (oldEntry) {
            oldEntry.items.forEach(item => {
                const acc = chartOfAccounts.find(a => a.id === item.accountId);
                if (!acc) return;
                const change = (['Asset', 'Expense'].includes(acc.type)) ? (item.credit - item.debit) : (item.debit - item.credit);
                balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
            });
        }

        const finalItems = entryData.items.map(item => ({...item}));
        
        finalItems.forEach(item => {
            const acc = chartOfAccounts.find(a => a.id === item.accountId);
            if (!acc) return;
            const change = (['Asset', 'Expense'].includes(acc.type)) ? (item.debit - item.credit) : (item.credit - item.debit);
            balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
        });

        setChartOfAccounts(prevAccounts => 
            prevAccounts.map(acc => {
                if (balanceChanges.has(acc.id)) {
                    return { ...acc, balance: acc.balance + balanceChanges.get(acc.id)! };
                }
                return acc;
            })
        );

        if (entryData.id) {
            setJournalEntries(prev => prev.map(je => 
                je.id === entryData.id ? { ...je, ...entryData, items: finalItems } as JournalEntry : je
            ));
        }
        
        showNotification(t('entry_saved_successfully'));
        handleCloseModal();
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {notification && <div className="fixed top-20 right-5 p-4 rounded-lg shadow-lg text-white z-[100] bg-green-500">{notification}</div>}
            
            <JournalEntryModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveFromModal}
                entry={editingEntry}
            />

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                 <div>
                    <h2 className="text-2xl font-bold">{t('entry_review')}</h2>
                    <p className="text-muted-foreground text-sm">{t('entry_review_desc')}</p>
                 </div>
                <button
                    onClick={handlePostAll}
                    disabled={unpostedEntries.filter(isEntryBalanced).length === 0}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <FileCheck size={20} />
                    <span>{t('post_all_balanced')}</span>
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-3 p-1">
                {unpostedEntries.length > 0 ? unpostedEntries.map(entry => {
                    const total = entry.items.reduce((sum, item) => sum + item.debit, 0);
                    const balanced = isEntryBalanced(entry);
                    return (
                        <Card key={entry.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <span className="font-bold text-primary">{entry.entryNumber}</span>
                                    <span className="text-sm text-muted-foreground">{entry.date}</span>
                                    {balanced ? 
                                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle size={14}/> {t('balanced')}</span>
                                        :
                                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><AlertCircle size={14}/> {t('unbalanced')}</span>
                                    }
                                </div>
                                <p className="mt-1 text-foreground">{entry.description}</p>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <span className="font-mono font-semibold text-lg">{total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                <button onClick={() => handleDeleteEntry(entry)} className="p-2 text-muted-foreground hover:text-red-500" title={t('delete')}><Trash2 size={16}/></button>
                                <button onClick={() => handleOpenModal(entry)} className="p-2 text-muted-foreground hover:text-primary" title={t('edit')}><Edit size={16}/></button>
                                <button onClick={() => handlePostEntry(entry.id)} disabled={!balanced} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                                    <BookUp size={16}/> <span>{t('post')}</span>
                                </button>
                            </div>
                        </Card>
                    )
                }) : (
                     <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('no_unposted_entries_to_review')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EntryReview;
