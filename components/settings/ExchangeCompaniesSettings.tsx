import React, { useState, useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { ExchangeCompany, Currency } from '../../types';
import InteractiveTable from '../common/InteractiveTable';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';
import ExchangeCompanyModal from './ExchangeCompanyModal';
import ToggleSwitch from '../common/ToggleSwitch';
import Tooltip from '../common/Tooltip';

const ExchangeCompaniesSettings: React.FC = () => {
    const { t } = useLocalization();
    const { exchangeCompanies, setExchangeCompanies, currencies } = useAppStore();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<ExchangeCompany | null>(null);
    const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

    const currenciesMap = useMemo(() => new Map<string, Currency>(currencies.map(c => [c.id, c])), [currencies]);

    const calculateTotalInSAR = (balances: { currencyId: string; balance: number }[]) => {
        return balances.reduce((total, balanceItem) => {
            const currency = currenciesMap.get(balanceItem.currencyId);
            const rate = currency?.exchangeRate || 1;
            return total + (balanceItem.balance * rate);
        }, 0);
    };


    const handleAddNew = () => {
        setSelectedCompany(null);
        setIsModalOpen(true);
    };

    const handleEdit = (company: ExchangeCompany) => {
        setSelectedCompany(company);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (companyId: string) => {
        setCompanyToDelete(companyId);
    };

    const handleConfirmDelete = () => {
        if (companyToDelete) {
            setExchangeCompanies(prev => prev.filter(c => c.id !== companyToDelete));
            addToast(t('exchange_company_deleted_success'), 'success');
        }
        setCompanyToDelete(null);
    };

    const handleSave = (companyData: Omit<ExchangeCompany, 'id'> & { id?: string }) => {
        if (companyData.id) {
            setExchangeCompanies(prev => prev.map(c => c.id === companyData.id ? { ...c, ...companyData } as ExchangeCompany : c));
        } else {
            const newCompany: ExchangeCompany = { ...companyData, id: `ec-${Date.now()}`, balances: companyData.balances || [] };
            setExchangeCompanies(prev => [newCompany, ...prev]);
        }
        addToast(t('exchange_company_saved_success'), 'success');
        setIsModalOpen(false);
    };

    const handleToggleActive = (companyId: string, isActive: boolean) => {
        setExchangeCompanies(prev => prev.map(c => c.id === companyId ? { ...c, isActive } : c));
    };

    const columns = useMemo(() => [
        { Header: t('exchange_company_name'), accessor: 'name', width: 300 },
        {
            Header: t('total_balance_sar'),
            accessor: 'balances',
            width: 220,
            Cell: ({ row }: { row: ExchangeCompany }) => {
                const totalSAR = calculateTotalInSAR(row.balances);
                const tooltipContent = row.balances.map(b => {
                    const currency = currenciesMap.get(b.currencyId);
                    return `${b.balance.toLocaleString('en-US')} ${currency?.symbol || ''}`;
                }).join(' / ');

                return (
                    <Tooltip text={`${t('balances_by_currency')}: ${tooltipContent || t('no_balance')}`}>
                        <span className="font-bold font-mono cursor-help underline decoration-dashed">
                            {totalSAR.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                        </span>
                    </Tooltip>
                );
            }
        },
        {
            Header: t('status'),
            accessor: 'isActive',
            width: 150,
            Cell: ({ row }: { row: ExchangeCompany }) => (
                <ToggleSwitch enabled={row.isActive} onChange={(checked) => handleToggleActive(row.id, checked)} />
            ),
        },
        {
            Header: t('actions'),
            accessor: 'actions',
            width: 150,
            Cell: ({ row }: { row: ExchangeCompany }) => (
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => handleEdit(row)} className="text-primary hover:text-primary/80" title={t('edit')}><Edit size={18} /></button>
                    <button onClick={() => handleDeleteClick(row.id)} className="text-red-500 hover:text-red-700" title={t('delete')}><Trash2 size={18} /></button>
                </div>
            ),
        },
    ], [t, currenciesMap]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <ExchangeCompanyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} company={selectedCompany} />
            <ConfirmationModal
                isOpen={!!companyToDelete}
                onClose={() => setCompanyToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={t('delete')}
                message={t('delete_exchange_company_confirm')}
            />

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t('exchange_companies')}</h2>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    <span>{t('add_new_exchange_company')}</span>
                </button>
            </div>
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={exchangeCompanies} setData={setExchangeCompanies} />
            </div>
        </div>
    );
};

export default ExchangeCompaniesSettings;