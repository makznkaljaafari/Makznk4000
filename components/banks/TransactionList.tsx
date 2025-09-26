
import React, { useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { FinancialAccount, FinancialTransaction, Currency } from '../../types';
import InteractiveTable from '../common/InteractiveTable';
import { ArrowRightLeft, TrendingDown, TrendingUp } from 'lucide-react';

const TransactionList: React.FC = () => {
    const { t, lang } = useLocalization();
    const { financialTransactions, setFinancialTransactions, financialAccounts, currencies } = useAppStore();

    const accountsMap = useMemo(() => new Map<string, FinancialAccount>(financialAccounts.map(a => [a.id, a])), [financialAccounts]);
    const currenciesMap = useMemo(() => new Map<string, Currency>(currencies.map(c => [c.id, c])), [currencies]);

    const formatCurrency = (amount: number, accountId: string) => {
        const account = accountsMap.get(accountId);
        const currencyId = account?.currencyId;
        const currency = currencyId ? currenciesMap.get(currencyId) : undefined;
        const symbol = currency?.symbol || '...';
        return `${amount.toLocaleString('en-US', {minimumFractionDigits: 2})} ${symbol}`;
    };

    const columns = useMemo(() => [
        { Header: t('date'), accessor: 'date', width: 150 },
        { Header: t('transaction_type'), accessor: 'type', width: 150, Cell: ({row}:{row:FinancialTransaction}) => {
            const Icon = row.type === 'deposit' ? TrendingUp : row.type === 'withdrawal' ? TrendingDown : ArrowRightLeft;
            return <div className="flex items-center gap-2"><Icon size={16}/><span>{t(row.type)}</span></div>
        }},
        { Header: t('account'), accessor: 'accountId', width: 250, Cell: ({row}:{row:FinancialTransaction}) => { const account = accountsMap.get(row.accountId); return account?.name || row.accountId; }},
        { Header: t('to_account'), accessor: 'toAccountId', width: 250, Cell: ({row}:{row:FinancialTransaction}) => { if(!row.toAccountId) return '-'; const account = accountsMap.get(row.toAccountId); return account?.name || row.toAccountId; }},
        { Header: t('amount'), accessor: 'amount', width: 180, Cell: ({row}:{row:FinancialTransaction}) => <span className={`font-bold font-mono ${row.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(row.amount, row.accountId)}</span>},
        { Header: t('description'), accessor: 'description', width: 300},
        { Header: t('related_document'), accessor: 'relatedDocumentId', width: 150, Cell: ({row}:{row:FinancialTransaction}) => row.relatedDocumentId || '-'},
    ], [t, lang, accountsMap, currenciesMap]);

    const sortedTransactions = useMemo(() => [...financialTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [financialTransactions]);

    return (
        <div className="h-full flex flex-col gap-4">
             <div className="flex-grow">
                <InteractiveTable columns={columns} data={sortedTransactions} setData={setFinancialTransactions} />
            </div>
        </div>
    );
};

export default TransactionList;
