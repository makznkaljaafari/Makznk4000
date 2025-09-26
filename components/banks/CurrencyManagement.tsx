
import React, { useState, useMemo, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Currency } from '../../types';
import InteractiveTable from '../common/InteractiveTable';
import { Plus, Edit, Trash2 } from 'lucide-react';
import CurrencyModal from './CurrencyModal';

const CurrencyManagement: React.FC = () => {
    const { t } = useLocalization();
    const { currencies, setCurrencies, financialAccounts } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const handleAddNew = () => {
        setSelectedCurrency(null);
        setIsModalOpen(true);
    };

    const handleEdit = (currency: Currency) => {
        setSelectedCurrency(currency);
        setIsModalOpen(true);
    };

    const handleDelete = (currencyId: string) => {
        if (financialAccounts.some(acc => acc.currencyId === currencyId)) {
            setNotification({type: 'error', message: t('currency_in_use_error')});
            return;
        }
        if (window.confirm(t('delete_currency_confirm'))) {
            setCurrencies(prev => prev.filter(c => c.id !== currencyId));
            setNotification({type: 'success', message: t('currency_deleted_success')});
        }
    };
    
    const handleSave = (data: Omit<Currency, 'id'> & { id?: string }) => {
        if (data.id) {
            setCurrencies(prev => prev.map(c => c.id === data.id ? { ...c, ...data } as Currency : c));
        } else {
            const newCurrency: Currency = { ...data, id: `curr-${Date.now().toString().slice(-6)}` };
            setCurrencies(prev => [newCurrency, ...prev]);
        }
        setIsModalOpen(false);
        setNotification({type: 'success', message: t('currency_saved_success')});
    };
    
    useEffect(() => {
        if(notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const columns = useMemo(() => [
        { Header: t('currency_name'), accessor: 'name', width: 300, Cell: ({row}: {row:Currency}) => <span className="font-medium">{row.name}</span> },
        { Header: t('currency_symbol'), accessor: 'symbol', width: 150 },
        { Header: t('exchange_rate'), accessor: 'exchangeRate', width: 200, Cell: ({row}: {row:Currency}) => <span className="font-mono">{row.exchangeRate}</span> },
        { Header: t('actions'), accessor: 'actions', width: 150, Cell: ({ row }: { row: Currency }) => {
                const isBaseCurrency = row.symbol.toUpperCase() === 'SAR';
                return (
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => handleEdit(row)} className="text-primary hover:text-primary/80" title={t('edit')}><Edit size={18} /></button>
                        {!isBaseCurrency && <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700" title={t('delete')}><Trash2 size={18} /></button>}
                    </div>
                );
            },
        }
    ], [t]);

    return (
        <div className="h-full flex flex-col gap-4">
            {notification && <div className={`fixed top-20 right-5 p-4 rounded-lg shadow-lg text-white z-[100] ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{notification.message}</div>}
            <CurrencyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} currency={selectedCurrency}/>
             <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold">{t('currency_list')}</h2>
                <button onClick={handleAddNew} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90">
                    <Plus size={20} />
                    <span>{t('add_new_currency')}</span>
                </button>
            </div>
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={currencies} setData={setCurrencies} />
            </div>
        </div>
    );
};

export default CurrencyManagement;
