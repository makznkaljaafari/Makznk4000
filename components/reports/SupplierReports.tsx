import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { PurchaseOrder } from '../../types';

const SupplierReports: React.FC = () => {
    const { t, lang } = useLocalization();
    const { suppliers, purchaseOrders } = useAppStore();
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const supplierData = useMemo(() => {
        if (!selectedSupplierId) return null;

        const supplierPOs = purchaseOrders.filter(po => po.supplierName === suppliers.find(s => s.id === selectedSupplierId)?.name);
        
        const totalPurchaseValue = supplierPOs.reduce((sum, po) => sum + po.total, 0);

        const aging = {
            '0-30': 0,
            '31-60': 0,
            '61-90': 0,
            '91+': 0,
        };

        const today = new Date();
        supplierPOs.forEach(po => {
            // Assuming payables are tracked from PO date if not paid
            const poDate = new Date(po.date);
            const age = (today.getTime() - poDate.getTime()) / (1000 * 3600 * 24);
            if (age <= 30) aging['0-30'] += po.total;
            else if (age <= 60) aging['31-60'] += po.total;
            else if (age <= 90) aging['61-90'] += po.total;
            else aging['91+'] += po.total;
        });

        return {
            supplierPOs: supplierPOs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            totalPurchaseValue,
            poCount: supplierPOs.length,
            aging,
        };
    }, [selectedSupplierId, suppliers, purchaseOrders]);

    return (
        <div className="space-y-6">
            <Card>
                <label className="block text-sm font-medium text-muted-foreground">{t('select_supplier')}</label>
                <select 
                    value={selectedSupplierId} 
                    onChange={e => setSelectedSupplierId(e.target.value)} 
                    className="mt-1 block w-full max-w-md bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                >
                    <option value="">{t('select_supplier')}...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </Card>

            {!supplierData ? (
                <Card className="text-center py-12"><p className="text-muted-foreground">{t('select_supplier_to_view_report')}</p></Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <Card><h3 className="text-sm font-medium text-muted-foreground">{t('total_purchases')}</h3><p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(supplierData.totalPurchaseValue)}</p></Card>
                        <Card><h3 className="text-sm font-medium text-muted-foreground">{t('number_of_pos')}</h3><p className="text-2xl font-bold mt-1">{supplierData.poCount}</p></Card>
                    </div>

                    <Card>
                        <h3 className="text-lg font-semibold mb-4">{t('payables_aging')}</h3>
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div><p className="text-sm text-muted-foreground">{t('0-30_days_short')}</p><p className="font-bold text-lg">{formatCurrency(supplierData.aging['0-30'])}</p></div>
                            <div><p className="text-sm text-muted-foreground">{t('31-60_days_short')}</p><p className="font-bold text-lg">{formatCurrency(supplierData.aging['31-60'])}</p></div>
                            <div><p className="text-sm text-muted-foreground">{t('61-90_days_short')}</p><p className="font-bold text-lg">{formatCurrency(supplierData.aging['61-90'])}</p></div>
                            <div><p className="text-sm text-muted-foreground">{t('91_plus_days_short')}</p><p className="font-bold text-lg text-red-500">{formatCurrency(supplierData.aging['91+'])}</p></div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-semibold mb-4">{t('purchase_orders')}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-muted-foreground uppercase">
                                    <tr>
                                        <th className="p-2 text-start">{t('po_id')}</th>
                                        <th className="p-2 text-start">{t('date')}</th>
                                        <th className="p-2 text-end">{t('total')}</th>
                                        <th className="p-2 text-center">{t('status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierData.supplierPOs.map(po => (
                                        <tr key={po.id} className="border-t border-border">
                                            <td className="p-2 font-mono">{po.id}</td>
                                            <td className="p-2">{po.date}</td>
                                            <td className="p-2 text-end font-semibold">{formatCurrency(po.total)}</td>
                                            <td className="p-2 text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${po.status === 'Received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {t(po.status.toLowerCase())}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default SupplierReports;
