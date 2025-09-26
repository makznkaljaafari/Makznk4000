
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { JournalEntry, Account } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X, Plus, Trash2, Search } from 'lucide-react';

interface FormRow {
    id: number;
    accountId: string;
    debit: string;
    credit: string;
}

const getNewRow = (): FormRow => ({
    id: Date.now() + Math.random(),
    accountId: '',
    debit: '',
    credit: ''
});

const JournalEntryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: Omit<JournalEntry, 'id' | 'entryNumber'> & { id?: string }) => void;
    entry: JournalEntry | null;
}> = ({ isOpen, onClose, onSave, entry }) => {
    const { t, lang } = useLocalization();
    const { chartOfAccounts, currentUser } = useAppStore();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<FormRow[]>([getNewRow()]);
    
    useEffect(() => {
        if (entry) {
            setDate(entry.date);
            setDescription(entry.description);
            setItems(entry.items.map(item => ({
                id: Math.random(),
                accountId: item.accountId,
                debit: item.debit > 0 ? String(item.debit) : '',
                credit: item.credit > 0 ? String(item.credit) : '',
            })));
        } else {
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setItems([getNewRow(), getNewRow()]);
        }
    }, [entry, isOpen]);
    
    const accountOptions = useMemo(() => {
        const activeAccounts = chartOfAccounts.filter(acc => acc.isActive);
        const accountsMap = new Map(activeAccounts.map(acc => [acc.id, acc]));
        const result: (Account & { level: number })[] = [];

        const buildHierarchy = (parentId: string | null = null, level = 0) => {
            const children = activeAccounts
                .filter(acc => acc.parentAccountId === parentId)
                .sort((a, b) => a.id.localeCompare(b.id));

            for (const child of children) {
                result.push({ ...child, level });
                buildHierarchy(child.id, level + 1);
            }
        };

        buildHierarchy();
        return result;
    }, [chartOfAccounts]);

    const handleItemChange = (id: number, field: keyof FormRow, value: string) => {
        setItems(currentItems => currentItems.map(item => {
            if (item.id === id) {
                const newItem = { ...item, [field]: value };
                if (field === 'debit' && value) newItem.credit = '';
                if (field === 'credit' && value) newItem.debit = '';
                return newItem;
            }
            return item;
        }));
    };
    
    const addNewRow = () => setItems(prev => [...prev, getNewRow()]);
    const removeRow = (id: number) => setItems(prev => prev.length > 1 ? prev.filter(item => item.id !== id) : prev);

    const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
        const totals = items.reduce((acc, item) => ({
            debit: acc.debit + (parseFloat(item.debit) || 0),
            credit: acc.credit + (parseFloat(item.credit) || 0),
        }), { debit: 0, credit: 0 });
        
        return {
            totalDebit: totals.debit,
            totalCredit: totals.credit,
            isBalanced: totals.debit > 0 && totals.debit === totals.credit,
        };
    }, [items]);
    
    const handleSave = () => {
        if (!isBalanced || !currentUser) return;
        
        const finalItems = items
            .filter(item => item.accountId && (item.debit || item.credit))
            .map(item => ({
                accountId: item.accountId,
                debit: parseFloat(item.debit) || 0,
                credit: parseFloat(item.credit) || 0,
            }));
            
        if(finalItems.length === 0) return;

        onSave({ 
            id: entry?.id, 
            companyId: entry?.companyId || currentUser.companyId,
            date, 
            description, 
            items: finalItems 
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl m-4 flex flex-col h-[90vh]">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{entry ? t('edit') : t('add_new_entry')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                
                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-muted-foreground">{t('date')}</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2"/>
                        </div>
                         <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-muted-foreground">{t('description')}</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2" placeholder={t('journal_entry_details')} />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-start min-w-[300px]">{t('account')}</th>
                                    <th className="px-4 py-3 text-center w-40">{t('debit')}</th>
                                    <th className="px-4 py-3 text-center w-40">{t('accounting_credit')}</th>
                                    <th className="p-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="p-1">
                                            <select
                                                value={item.accountId}
                                                onChange={e => handleItemChange(item.id, 'accountId', e.target.value)}
                                                className="w-full bg-background border-0 focus:ring-1 focus:ring-ring rounded-md p-2"
                                            >
                                                <option value="" disabled>{t('select_an_account')}</option>
                                                {accountOptions.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {'--'.repeat(acc.level)} {acc.id} - {acc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-1">
                                            <input type="number" value={item.debit} onChange={e => handleItemChange(item.id, 'debit', e.target.value)} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{direction: 'ltr'}} disabled={!!item.credit}/>
                                        </td>
                                        <td className="p-1">
                                            <input type="number" value={item.credit} onChange={e => handleItemChange(item.id, 'credit', e.target.value)} className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-ring rounded-md p-2" style={{direction: 'ltr'}} disabled={!!item.debit}/>
                                        </td>
                                        <td className="p-1 text-center">
                                            <button onClick={() => removeRow(item.id)} className="text-muted-foreground hover:text-red-500"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addNewRow} className="flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary/90">
                        <Plus size={16}/> {t('add_item')}
                    </button>
                </div>

                <footer className="p-4 bg-muted/50 border-t border-border flex justify-between items-center">
                    <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                            <span className="text-xs text-muted-foreground uppercase">{t('total_debit')}</span>
                            <p className="font-mono font-semibold text-lg">{totalDebit.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                        </div>
                         <div className="text-center">
                            <span className="text-xs text-muted-foreground uppercase">{t('total_credit')}</span>
                            <p className="font-mono font-semibold text-lg">{totalCredit.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="text-center">
                            <span className="text-xs text-muted-foreground uppercase">{t('balance_difference')}</span>
                            <p className={`font-mono font-semibold text-lg ${isBalanced ? 'text-green-500' : 'text-red-500'}`}>
                                {(totalDebit - totalCredit).toLocaleString('en-US', {minimumFractionDigits: 2})}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                        <button onClick={handleSave} disabled={!isBalanced} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                            {t('save')} {t('entry')}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default JournalEntryModal;
