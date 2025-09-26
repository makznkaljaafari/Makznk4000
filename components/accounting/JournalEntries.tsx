


import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { JournalEntry } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Plus, Trash2 } from 'lucide-react';
import JournalEntryModal from './JournalEntryModal';
import { useToast } from '../../contexts/ToastContext';

const JournalEntries: React.FC = () => {
    const { t, lang } = useLocalization();
    const { journalEntries, setJournalEntries, chartOfAccounts, setChartOfAccounts } = useAppStore();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

    const sortedEntries = useMemo(() => {
        return [...journalEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [journalEntries]);

    const handleOpenModal = (entry: JournalEntry | null = null) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleSave = (entryData: Omit<JournalEntry, 'id' | 'entryNumber'> & { id?: string }) => {
        const oldEntry = entryData.id ? journalEntries.find(je => je.id === entryData.id) : null;
        
        const balanceChanges = new Map<string, number>();

        // Reverse old entry's impact if editing
        if (oldEntry) {
            oldEntry.items.forEach(item => {
                const acc = chartOfAccounts.find(a => a.id === item.accountId);
                if (!acc) return;
                const change = (['Asset', 'Expense'].includes(acc.type)) ? (item.credit - item.debit) : (item.debit - item.credit);
                balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
            });
        }
        
        // Apply new entry's impact
        entryData.items.forEach(item => {
            const acc = chartOfAccounts.find(a => a.id === item.accountId);
            if (!acc) return;
            const change = (['Asset', 'Expense'].includes(acc.type)) ? (item.debit - item.credit) : (item.credit - item.debit);
            balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
        });

        setChartOfAccounts(prevAccounts => 
            prevAccounts.map(acc => {
                if (balanceChanges.has(acc.id)) {
                    return { ...acc, balance: acc.balance + (balanceChanges.get(acc.id) || 0) };
                }
                return acc;
            })
        );

        if (entryData.id) {
            setJournalEntries(prev => prev.map(je => je.id === entryData.id ? ({ ...je, ...entryData } as JournalEntry) : je));
        } else {
            const newEntry: JournalEntry = {
                ...entryData,
                id: `je-${Date.now()}`,
                entryNumber: `JV-${Date.now().toString().slice(-6)}`,
                isPosted: false,
            };
            setJournalEntries(prev => [newEntry, ...prev]);
        }
        addToast(t('entry_saved_successfully'), 'success');
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('delete_entry_confirm'))) {
            const entryToDelete = journalEntries.find(je => je.id === id);
            if (entryToDelete) {
                const balanceChanges = new Map<string, number>();
                entryToDelete.items.forEach(item => {
                    const acc = chartOfAccounts.find(a => a.id === item.accountId);
                    if (!acc) return;
                    // Reverse the entry's impact
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
            }

            setJournalEntries(prev => prev.filter(je => je.id !== id));
            addToast(t('entry_deleted_successfully'), 'success');
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <JournalEntryModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                entry={editingEntry}
            />

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t('journal_entries')}</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    <span>{t('add_new_entry')}</span>
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-3 p-1">
                {sortedEntries.map(entry => {
                    const total = entry.items.reduce((sum, item) => sum + item.debit, 0);
                    return (
                        <Card key={entry.id} className="p-4 flex justify-between items-center hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenModal(entry)}>
                            <div className="flex-1">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-primary">{entry.entryNumber}</span>
                                    <span className="text-sm text-muted-foreground">{entry.date}</span>
                                </div>
                                <p className="mt-1 text-foreground">{entry.description}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-mono font-semibold text-lg">{total.toLocaleString('en-US', {minimumFractionDigits: 2})} {lang === 'ar' ? 'р.с' : 'SAR'}</span>
                                <button onClick={(e) => {e.stopPropagation(); handleDelete(entry.id)}} className="p-2 text-muted-foreground hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
};

export default JournalEntries;
