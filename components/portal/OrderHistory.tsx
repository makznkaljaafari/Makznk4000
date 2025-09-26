

import React, { useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Sale } from '../../types';
import Card from '../common/Card';
import { History, RefreshCw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const OrderHistory: React.FC = () => {
    const { t, lang } = useLocalization();
    const { addToast } = useToast();
    const { loggedInCustomer, sales, reorder } = useAppStore();

    const customerSales = useMemo(() => {
        if (!loggedInCustomer) return [];
        return sales
            .filter(s => s.customerName === loggedInCustomer.name)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [loggedInCustomer, sales]);

    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${lang === 'ar' ? 'р.с' : 'SAR'}`;
    };
    
    const getStatusChip = (status?: Sale['status']) => {
        const statusText = status || 'Completed';
        const styles = {
            'Pending Review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            'Processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            'Shipped': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
            'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[statusText]}`}>{t(statusText.toLowerCase().replace(' ', '_'))}</span>;
    };
    
    const handleReorder = (saleId: string) => {
        reorder(saleId);
        addToast(t('items_added_to_cart_for_reorder'), 'success');
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <History size={24} /> {t('order_history')}
            </h2>
             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="p-3 text-start">{t('invoice_no')}</th>
                            <th className="p-3 text-start">{t('date')}</th>
                            <th className="p-3 text-end">{t('total')}</th>
                            <th className="p-3 text-center">{t('status')}</th>
                            <th className="p-3 text-center">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {customerSales.map(sale => (
                            <tr key={sale.id} className="hover:bg-muted/50">
                                <td className="p-3 font-mono text-primary">{sale.id}</td>
                                <td className="p-3">{sale.date}</td>
                                <td className="p-3 text-end font-semibold">{formatCurrency(sale.total)}</td>
                                <td className="p-3 text-center">{getStatusChip(sale.status)}</td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => handleReorder(sale.id)}
                                        className="flex items-center gap-1.5 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-muted"
                                        title={t('reorder')}
                                    >
                                        <RefreshCw size={14} />
                                        <span>{t('reorder')}</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {customerSales.length === 0 && <p className="text-center py-8 text-muted-foreground">{t('no_orders_found')}</p>}
            </div>
        </Card>
    );
};

export default OrderHistory;
