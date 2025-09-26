import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';

const VAT_RATE = 0.15;

const KpiCard: React.FC<{ title: string; value: string; className?: string }> = ({ title, value, className = '' }) => (
  <Card>
    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
    <p className={`text-2xl font-bold mt-1 ${className}`}>{value}</p>
  </Card>
);

const TaxReport: React.FC = () => {
    const { t, lang } = useLocalization();
    const { sales, purchaseOrders } = useAppStore();
    
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(thisMonthStart.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const reportData = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= start && saleDate <= end;
        });

        const filteredPOs = purchaseOrders.filter(po => {
            const poDate = new Date(po.date);
            return poDate >= start && poDate <= end;
        });
        
        let totalSales = 0;
        let outputVat = 0;
        filteredSales.forEach(s => {
            // Assuming s.total is VAT-inclusive
            const preVatAmount = s.total / (1 + VAT_RATE);
            totalSales += preVatAmount;
            outputVat += s.total - preVatAmount;
        });

        let totalPurchases = 0;
        let inputVat = 0;
        filteredPOs.forEach(po => {
            // Assuming po.total is pre-tax
            totalPurchases += po.total;
            inputVat += po.total * VAT_RATE;
        });
        
        const netVat = outputVat - inputVat;

        return {
            totalSales,
            outputVat,
            totalPurchases,
            inputVat,
            netVat,
            salesTransactions: filteredSales,
            purchaseTransactions: filteredPOs
        };

    }, [sales, purchaseOrders, startDate, endDate]);

    return (
        <div className="space-y-6">
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('from')}</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('to')}</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3"/>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-bold mb-4">{t('vat_summary')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard title={t('output_vat_sales')} value={formatCurrency(reportData.outputVat)} className="text-red-500" />
                    <KpiCard title={t('input_vat_purchases')} value={formatCurrency(reportData.inputVat)} className="text-green-500" />
                    <KpiCard title={t('net_vat_due')} value={formatCurrency(reportData.netVat)} className={reportData.netVat >= 0 ? 'text-red-500' : 'text-green-500'} />
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-bold mb-4">{t('sales_transactions')}</h3>
                    <div className="overflow-auto max-h-96">
                        <table className="w-full text-sm">
                            <thead><tr><th className="p-2 text-start">{t('sale_id')}</th><th className="p-2 text-end">{t('total')}</th><th className="p-2 text-end">{t('vat_amount')}</th></tr></thead>
                            <tbody>{reportData.salesTransactions.map(s => <tr key={s.id} className="border-t border-border"><td className="p-2">{s.id}</td><td className="p-2 text-end">{formatCurrency(s.total)}</td><td className="p-2 text-end">{formatCurrency(s.total - (s.total / (1+VAT_RATE)))}</td></tr>)}</tbody>
                        </table>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-lg font-bold mb-4">{t('purchase_transactions')}</h3>
                    <div className="overflow-auto max-h-96">
                        <table className="w-full text-sm">
                            <thead><tr><th className="p-2 text-start">{t('po_id')}</th><th className="p-2 text-end">{t('total')}</th><th className="p-2 text-end">{t('vat_amount')}</th></tr></thead>
                            <tbody>{reportData.purchaseTransactions.map(p => <tr key={p.id} className="border-t border-border"><td className="p-2">{p.id}</td><td className="p-2 text-end">{formatCurrency(p.total)}</td><td className="p-2 text-end">{formatCurrency(p.total * VAT_RATE)}</td></tr>)}</tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default TaxReport;
