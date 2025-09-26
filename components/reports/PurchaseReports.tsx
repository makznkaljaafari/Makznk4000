

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import InteractiveTable from '../common/InteractiveTable';
import { Search } from 'lucide-react';
import { Part } from '../../types';

const KpiCard: React.FC<{ title: string; value: string; className?: string }> = ({ title, value, className = '' }) => (
  <Card>
    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
    <p className={`text-2xl font-bold mt-1 ${className}`}>{value}</p>
  </Card>
);

const PurchaseReports: React.FC = () => {
    const { t, lang } = useLocalization();
    const { purchaseOrders, parts, suppliers } = useAppStore();
    
    const [view, setView] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');

    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const filteredPOs = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return purchaseOrders.filter(po => {
            const poDate = new Date(po.date);
            return poDate >= start && poDate <= end;
        });
    }, [purchaseOrders, startDate, endDate]);

    const OverviewView = () => {
        const reportData = useMemo(() => {
            if (filteredPOs.length === 0) return null;

            let totalPurchaseValue = 0;
            const purchasesByDate: Record<string, { value: number }> = {};
            const productStats: Record<string, { name: string, value: number }> = {};
            const supplierStats: Record<string, { name: string, value: number }> = {};

            filteredPOs.forEach(po => {
                totalPurchaseValue += po.total;

                if (!supplierStats[po.supplierName]) {
                    supplierStats[po.supplierName] = { name: po.supplierName, value: 0 };
                }
                supplierStats[po.supplierName].value += po.total;

                po.items.forEach(item => {
                    const part = partsMap.get(item.partId);
                    if (part) {
                        const partName = part.name;
                        if (!productStats[partName]) {
                            productStats[partName] = { name: partName, value: 0 };
                        }
                        productStats[partName].value += item.purchasePrice * item.quantity;
                    }
                });
                
                const dateStr = po.date;
                if (!purchasesByDate[dateStr]) {
                    purchasesByDate[dateStr] = { value: 0 };
                }
                purchasesByDate[dateStr].value += po.total;
            });
            
            const purchaseTrend = Object.entries(purchasesByDate)
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
            const topSuppliers = Object.values(supplierStats).sort((a, b) => b.value - a.value).slice(0, 5);
            const topProducts = Object.values(productStats).sort((a, b) => b.value - a.value).slice(0, 5);

            return {
                totalPurchaseValue,
                poCount: filteredPOs.length,
                purchaseTrend,
                topSuppliers,
                topProducts,
            };
        }, [filteredPOs, partsMap]);
        
        if (!reportData) {
            return <Card className="text-center py-12"><p className="text-muted-foreground">{t('no_purchase_data')}</p></Card>;
        }

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <KpiCard title={t('total_purchases')} value={formatCurrency(reportData.totalPurchaseValue)} className="text-primary"/>
                    <KpiCard title={t('number_of_pos')} value={reportData.poCount.toString()} />
                </div>
                <Card>
                    <h3 className="text-lg font-semibold mb-4">{t('purchases_trend')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.purchaseTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis tickFormatter={formatCurrency} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="value" name={t('purchases')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-lg font-semibold mb-4">{t('top_suppliers_by_value')}</h3>
                        <ul className="space-y-3">{reportData.topSuppliers.map(s => <li key={s.name} className="flex justify-between items-center text-sm"><span className="text-foreground">{s.name}</span><span className="font-bold text-primary">{formatCurrency(s.value)}</span></li>)}</ul>
                    </Card>
                    <Card>
                        <h3 className="text-lg font-semibold mb-4">{t('top_purchased_products')}</h3>
                        <ul className="space-y-3">{reportData.topProducts.map(p => <li key={p.name} className="flex justify-between items-center text-sm"><span className="text-foreground">{p.name}</span><span className="font-bold text-primary">{formatCurrency(p.value)}</span></li>)}</ul>
                    </Card>
                </div>
            </div>
        );
    };

    const ByProductView = () => {
        const productData = useMemo(() => {
            const stats: Record<string, { id: string; name: string; partNumber: string; quantity: number; value: number; poCount: number }> = {};
            filteredPOs.forEach(po => {
                po.items.forEach(item => {
                    const part = partsMap.get(item.partId);
                    if (part) {
                        if (!stats[item.partId]) {
                            stats[item.partId] = { id: part.id, name: part.name, partNumber: part.partNumber, quantity: 0, value: 0, poCount: 0 };
                        }
                        stats[item.partId].quantity += item.quantity;
                        stats[item.partId].value += item.quantity * item.purchasePrice;
                        stats[item.partId].poCount++;
                    }
                });
            });
            return Object.values(stats).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()));
        }, [filteredPOs, partsMap, searchTerm]);

        const columns = useMemo(() => [
            { Header: t('part_name'), accessor: 'name', width: 300 },
            { Header: t('part_number'), accessor: 'partNumber', width: 150 },
            { Header: t('total_quantity_purchased'), accessor: 'quantity', width: 150 },
            { Header: t('average_purchase_price'), accessor: 'value', Cell: ({row}: { row: { value: number, quantity: number } }) => formatCurrency(row.value / row.quantity), width: 180 },
            { Header: t('total_purchase_value'), accessor: 'value', Cell: ({row}: { row: { value: number } }) => formatCurrency(row.value), width: 180 },
        ], [t, lang]);
        
        return (
            <div className="h-full flex flex-col gap-4">
                <div className="relative">
                    <input type="text" placeholder={t('search_by_product')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 ps-10 border border-input rounded-md"/>
                    <Search className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground" size={20}/>
                </div>
                <div className="flex-grow">
                    <InteractiveTable columns={columns} data={productData} setData={() => {}}/>
                </div>
            </div>
        );
    };

    const BySupplierView = () => {
        const supplierData = useMemo(() => {
            const stats: Record<string, { id: string; name: string; poCount: number; value: number }> = {};
            filteredPOs.forEach(po => {
                if (!stats[po.supplierName]) {
                    stats[po.supplierName] = { id: po.supplierName, name: po.supplierName, poCount: 0, value: 0 };
                }
                stats[po.supplierName].poCount++;
                stats[po.supplierName].value += po.total;
            });
            return Object.values(stats).filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }, [filteredPOs, searchTerm]);
        
        const columns = useMemo(() => [
            { Header: t('supplier_name'), accessor: 'name', width: 400 },
            { Header: t('number_of_pos'), accessor: 'poCount', width: 200 },
            { Header: t('total_purchase_value'), accessor: 'value', Cell: ({row}: { row: { value: number } }) => formatCurrency(row.value), width: 200 },
        ], [t, lang]);

        return (
             <div className="h-full flex flex-col gap-4">
                <div className="relative">
                    <input type="text" placeholder={t('search_by_supplier')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 ps-10 border border-input rounded-md"/>
                    <Search className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground" size={20}/>
                </div>
                <div className="flex-grow">
                    <InteractiveTable columns={columns} data={supplierData} setData={() => {}}/>
                </div>
            </div>
        );
    };

    const onTabClick = (newView: string) => {
        setView(newView);
        setSearchTerm('');
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('from')}</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('to')}</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                    </div>
                </div>
            </Card>

            <div className="flex items-center gap-2 rounded-lg bg-muted p-1 self-start">
                <button onClick={() => onTabClick('overview')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'overview' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('overview')}</button>
                <button onClick={() => onTabClick('by_product')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'by_product' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('purchases_by_product')}</button>
                <button onClick={() => onTabClick('by_supplier')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'by_supplier' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('purchases_by_supplier')}</button>
            </div>
            
            <div className="flex-grow min-h-0">
                {view === 'overview' && <OverviewView />}
                {view === 'by_product' && <ByProductView />}
                {view === 'by_supplier' && <BySupplierView />}
            </div>
        </div>
    );
};

export default PurchaseReports;