import React, { useState, useMemo, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { FinancialAccount, Currency } from '../../types';
import InteractiveTable from '../common/InteractiveTable';
import { Plus, Edit, Trash2, Landmark, Banknote } from 'lucide-react';
import AccountModal from './AccountModal';
import Tooltip from '../common/Tooltip';

const AccountList: React.FC = () => {
    const { t, lang } = useLocalization();
    const { financialAccounts, setFinancialAccounts, currencies } = useAppStore();
    const [modalAccount, setModalAccount] = useState<FinancialAccount | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    const currenciesMap = useMemo(() => new Map<string, Currency>(currencies.map(c => [c.id, c])), [currencies]);

    const handleAddNew = () => {
        setModalAccount(null);
        setIsModalOpen(true);
    };

    const handleEdit = (account: FinancialAccount) => {
        setModalAccount(account);
        setIsModalOpen(true);
    };

    const handleDelete = (accountId: string) => {
        if (window.confirm(t('delete_account_confirm'))) {
            setFinancialAccounts(prev => prev.filter(a => a.id !== accountId));
            setNotification(t('account_deleted_success'));
        }
    };

    const handleSave = (data: Omit<FinancialAccount, 'id' | 'balances'> & { id?: string; balances?: { currencyId: string; balance: number }[] }) => {
        if (data.id) { // Edit
            setFinancialAccounts(prev => prev.map(acc => acc.id === data.id ? { ...acc, ...data } as FinancialAccount : acc));
        } else { // Add
            const newAccount: FinancialAccount = {
                ...data,
                id: `acc-${Date.now().toString().slice(-6)}`,
                balances: data.balances || []
            };
            setFinancialAccounts(prev => [newAccount, ...prev]);
        }
        setIsModalOpen(false);
        setNotification(t('account_saved_success'));
    };

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const calculateTotalInSAR = (balances: { currencyId: string; balance: number }[]) => {
        return balances.reduce((total, balanceItem) => {
            const currency = currenciesMap.get(balanceItem.currencyId);
            const rate = currency?.exchangeRate || 1;
            return total + (balanceItem.balance * rate);
        }, 0);
    };

    const columns = useMemo(() => [
        { Header: t('account_name'), accessor: 'name', width: 250, Cell: ({row}:{row:FinancialAccount}) => <div className="font-medium flex items-center gap-2">{row.type === 'bank' ? <Landmark size={16} className="text-muted-foreground"/> : <Banknote size={16} className="text-muted-foreground"/>}<span>{row.name}</span></div>},
        { Header: t('account_type'), accessor: 'type', width: 100, Cell: ({row}:{row:FinancialAccount}) => t(row.type)},
        { Header: t('bank_name'), accessor: 'bankName', width: 200, Cell: ({row}:{row:FinancialAccount}) => row.bankName || '-'},
        { Header: t('account_number'), accessor: 'accountNumber', width: 200, Cell: ({row}:{row:FinancialAccount}) => row.accountNumber || '-'},
        {
            Header: t('total_balance_sar'),
            accessor: 'balances',
            width: 220,
            Cell: ({ row }: { row: FinancialAccount }) => {
                const totalSAR = calculateTotalInSAR(row.balances);
                const tooltipContent = row.balances.map(b => {
                    const currency = currenciesMap.get(b.currencyId);
                    return `${b.balance.toLocaleString('en-US')} ${currency?.symbol || ''}`;
                }).join(' / ');

                return (
                    <Tooltip text={`${t('balances_by_currency')}: ${tooltipContent}`}>
                        <span className="font-bold font-mono cursor-help underline decoration-dashed">
                            {totalSAR.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                        </span>
                    </Tooltip>
                );
            }
        },
        { Header: t('actions'), accessor: 'actions', width: 120, Cell: ({ row }: { row: FinancialAccount }) => (
            <div className="flex items-center justify-center gap-2">
                <button onClick={() => handleEdit(row)} className="p-2 text-muted-foreground hover:text-primary transition-colors" title={t('edit')}><Edit size={18} /></button>
                <button onClick={() => handleDelete(row.id)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors" title={t('delete')}><Trash2 size={18} /></button>
            </div>
        )}
    ], [t, lang, currenciesMap]);

    return (
        <div className="h-full flex flex-col gap-4">
            {notification && <div className="fixed top-20 right-5 p-4 rounded-lg shadow-lg text-white z-[100] bg-green-500">{notification}</div>}
            <AccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} account={modalAccount}/>
            <div className="flex justify-end">
                <button onClick={handleAddNew} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors">
                    <Plus size={20} />
                    <span>{t('add_new_account')}</span>
                </button>
            </div>
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={financialAccounts} setData={setFinancialAccounts} />
            </div>
        </div>
    );
};

export default AccountList;