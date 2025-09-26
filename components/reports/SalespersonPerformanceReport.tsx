import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { User, Sale } from '../../types';

const KpiCard: React.FC<{ title: string; value: string; className?: string }> = ({ title, value, className = '' }) => (
  <Card>
    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
    <p className={`text-2xl font-bold mt-1 ${className}`}>{value}</p>
  </Card>
);

const SalespersonPerformanceReport: React.FC = () => {
    const { t, lang } = useLocalization();
    const { users, sales } = useAppStore();
    const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('all');

    const salespeople = useMemo(() => users.filter(u => u.role === 'Salesperson'), [users]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
        }).format(amount);
    };

    const reportData = useMemo(() => {
        const salesByPerson = salespeople.map(sp => {
            const personSales = sales.filter(s => s.salespersonId === sp.id);
            const totalSalesValue = personSales.reduce((sum, s) => sum + s.total, 0);
            const invoiceCount = personSales.length;
            const avgInvoiceValue = invoiceCount > 0 ? totalSalesValue / invoiceCount : 0;
            const topSales = [...personSales].sort((a, b) => b.total - a.total).slice(0, 5);
            
            return {
                ...sp,
                totalSalesValue,
                invoiceCount,
                avgInvoiceValue,
                topSales
            };
        });

        if (selectedSalespersonId === 'all') {
            return salesByPerson;
        }
        return salesByPerson.filter(sp => sp.id === selectedSalespersonId);

    }, [sales, salespeople, selectedSalespersonId]);

    return (
        <div className="space-y-6">
             <Card>
                <label className="block text-sm font-medium text-muted-foreground">{t('select_salesperson')}</label>
                <select 
                    value={selectedSalespersonId} 
                    onChange={e => setSelectedSalespersonId(e.target.value)} 
                    className="mt-1 block w-full max-w-md bg-background border border-input rounded-md shadow-sm py-2 px-3"
                >
                    <option value="all">{t('all_salespersons')}</option>
                    {salespeople.map(sp => <option key={sp.id} value={sp.id}>{sp.fullName}</option>)}
                </select>
            </Card>

            {reportData.length === 0 && <Card className="p-8 text-center text-muted-foreground">{t('no_data_available')}</Card>}
            
            <div className="space-y-8">
                {reportData.map(spData => (
                    <Card key={spData.id}>
                        <h2 className="text-xl font-bold text-primary mb-4">{spData.fullName}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <KpiCard title={t('total_sales_value')} value={formatCurrency(spData.totalSalesValue)} />
                            <KpiCard title={t('number_of_invoices_sold')} value={spData.invoiceCount.toString()} />
                            <KpiCard title={t('average_invoice_value')} value={formatCurrency(spData.avgInvoiceValue)} />
                        </div>
                        
                        <h3 className="text-lg font-semibold mb-2">{t('top_sales_by_value')}</h3>
                        {spData.topSales.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-muted-foreground uppercase">
                                        <tr>
                                            <th className="p-2 text-start">{t('sale_id')}</th>
                                            <th className="p-2 text-start">{t('date')}</th>
                                            <th className="p-2 text-start">{t('customer_name')}</th>
                                            <th className="p-2 text-end">{t('total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {spData.topSales.map(sale => (
                                            <tr key={sale.id}>
                                                <td className="p-2 font-mono">{sale.id}</td>
                                                <td className="p-2">{sale.date}</td>
                                                <td className="p-2">{sale.customerName}</td>
                                                <td className="p-2 text-end font-semibold">{formatCurrency(sale.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-sm text-muted-foreground">{t('no_sales_data')}</p>}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default SalespersonPerformanceReport;
