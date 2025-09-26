import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Account } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import InteractiveTable from '../common/InteractiveTable';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import AccountModal from './AccountModal';
import { useToast } from '../../contexts/ToastContext';

const ChartOfAccounts: React.FC = () => {
    const { t, lang } = useLocalization();
    const { chartOfAccounts, setChartOfAccounts } = useAppStore();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const processedAccounts = useMemo(() => {
        const result: (Account & { level: number })[] = [];
        const accountsMap = new Map(chartOfAccounts.map(acc => [acc.id, acc]));

        const buildHierarchy = (parentId: string | null = null, level = 0) => {
            const children = chartOfAccounts
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
    
    const filteredAccounts = useMemo(() => {
        if (!searchTerm) {
            return processedAccounts;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        // A simple filter that loses hierarchy but shows results.
        // For a better UX, we would keep parents of matched children.
        return processedAccounts.filter(acc => 
            acc.name.toLowerCase().includes(lowerCaseSearch) ||
            acc.id.toLowerCase().includes(lowerCaseSearch)
        );
    }, [processedAccounts, searchTerm]);


    const handleAddNew = () => {
        setSelectedAccount(null);
        setIsModalOpen(true);
    };

    const handleEdit = (account: Account) => {
        setSelectedAccount(account);
        setIsModalOpen(true);
    };

    const handleDelete = (accountId: string) => {
        if (window.confirm(t('delete_account_confirm_general'))) {
            setChartOfAccounts(prev => prev.filter(acc => acc.id !== accountId));
            addToast(t('account_deleted_success_general'), 'success');
        }
    };
    
    const handleSave = (accountData: Omit<Account, 'id' | 'balance' | 'isActive'> & { id?: string }) => {
        if (accountData.id) { // Editing
            setChartOfAccounts(prev => prev.map(acc => 
                acc.id === accountData.id ? { ...acc, ...accountData } : acc
            ));
        } else { // Adding
            const newAccount: Account = { 
                ...accountData, 
                id: `acc-${Date.now().toString().slice(-6)}`, // This should be a proper ID from backend
                balance: 0,
                isActive: true
            };
            setChartOfAccounts(prev => [...prev, newAccount]);
        }
        setIsModalOpen(false);
        addToast(t('account_saved_success_general'), 'success');
    };

    const columns = useMemo(() => [
        { 
            Header: t('account_id'), 
            accessor: 'id', 
            width: 150 
        },
        { 
            Header: t('account_name'), 
            accessor: 'name', 
            width: 350,
            Cell: ({ row }: { row: Account & { level: number } }) => (
                <div style={{ paddingLeft: `${row.level * 1.5}rem` }} className="font-medium text-foreground whitespace-nowrap">
                    {row.name}
                </div>
            )
        },
        { 
            Header: t('account_type'), 
            accessor: 'type', 
            width: 150,
            Cell: ({ row }: { row: Account }) => t(row.type)
        },
        { 
            Header: t('balance'), 
            accessor: 'balance', 
            width: 200,
            Cell: ({ row }: { row: Account }) => `${row.balance.toLocaleString('en-US', {minimumFractionDigits: 2})} ${lang === 'ar' ? 'р.с' : 'SAR'}`
        },
        {
            Header: t('actions'),
            accessor: 'actions',
            width: 150,
            Cell: ({ row }: { row: Account }) => (
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => handleEdit(row)} className="text-primary hover:text-primary/80 transition-colors" title={t('edit')}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 transition-colors" title={t('delete')}><Trash2 size={18} /></button>
                </div>
            ),
        }
    ], [t, lang]);
    
    return (
        <div className="space-y-4 h-full flex flex-col">
            <AccountModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                account={selectedAccount}
            />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div className="relative flex-grow w-full sm:w-auto">
                    <input 
                        type="text"
                        placeholder={`${t('search_account')}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 ps-10 border border-input bg-background rounded-md focus:ring-2 focus:ring-ring"
                    />
                    <Search className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground" size={20} />
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    <span>{t('add_new_account')}</span>
                </button>
            </div>
            
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={filteredAccounts} setData={setChartOfAccounts} />
            </div>
        </div>
    );
};

export default ChartOfAccounts;