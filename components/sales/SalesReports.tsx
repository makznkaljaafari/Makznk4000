import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { LineChart, Line, Bar, BarChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import InteractiveTable from '../common/InteractiveTable';
import { Search } from 'lucide-react';
import { Part, Sale } from '../../types';

const KpiCard: React.FC<{ title: string; value: string; className?: string }> = ({ title, value, className = '' }) => (
  <Card>
    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
    <p className={`text-2xl font-bold mt-1 ${className}`}>{value}</p>
  </Card>
);

const SalesReports: React.FC = () => {
    const { t, lang } = useLocalization();
    const { sales, parts, customers } = useAppStore();
    
    const [view, setView] = useState('overview');
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [period, setPeriod] = useState('last_30_days');
    const [searchTerm, setSearchTerm] = useState('');

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };
    
    const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setPeriod(value);
        const today = new Date();
        let start = new Date();

        switch (value) {
            case 'last_7_days':
                start.setDate(today.getDate() - 7);
                break;
            case 'last_30_days':
                start.setDate(today.getDate() - 30);
                break;
            case 'this_month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'custom_range':
                return;
            default:
                start = new Date(0); // All time
        }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    };

    const filteredSales = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= start && saleDate <= end;
        });
    }, [sales, startDate, endDate]);

    const overviewData = useMemo(() => {
        if (filteredSales.length === 0) return null;

        let totalRevenue = 0;
        let totalProfit = 0;
        const salesByDate: Record<string, { revenue: number, profit: number }> = {};
        const paymentTypes = { cash: 0, credit: 0 };

        filteredSales.forEach(sale => {
            totalRevenue += sale.total;
            paymentTypes[sale.type]++;
            let saleProfit = 0;
            sale.items.forEach(item => {
                const part = partsMap.get(item.partId);
                if (part) {
                    const cost = part.averageCost || part.purchasePrice;
                    saleProfit += (item.price - cost) * item.quantity;
                }
            });
            totalProfit += saleProfit;

            const dateStr = sale.date;
            if (!salesByDate[dateStr]) salesByDate[dateStr] = { revenue: 0, profit: 0 };
            salesByDate[dateStr].revenue += sale.total;
            salesByDate[dateStr].profit += saleProfit;
        });

        const salesTrend = Object.entries(salesByDate).map(([date, data]) => ({ date, ...data })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const paymentTypeData = [{name: t('cash'), value: paymentTypes.cash}, {name: t('credit'), value: paymentTypes.credit}];

        return {
            totalRevenue,
            totalProfit,
            invoiceCount: filteredSales.length,
            avgInvoice: totalRevenue / filteredSales.length,
            salesTrend,
            paymentTypeData
        };
    }, [filteredSales, partsMap, t]);

    const ByCustomerView = () => {
        const customerData = useMemo(() => {
            const stats: Record<string, { id: string; name: string; invoices: number; revenue: number }> = {};
            filteredSales.forEach(sale => {
                if (!stats[sale.customerName]) {
                    stats[sale.customerName] = { id: sale.customerName, name: sale.customerName, invoices: 0, revenue: 0 };
                }
                stats[sale.customerName].invoices++;
                stats[sale.customerName].revenue += sale.total;
            });
            return Object.values(stats).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }, [filteredSales, searchTerm]);
        
        const columns = useMemo(() => [
            { Header: t('customer_name'), accessor: 'name', width: 400 },
            { Header: t('number_of_invoices'), accessor: 'invoices', width: 200 },
            { Header: t('total_revenue'), accessor: 'revenue', width: 200, Cell: ({row}: { row: { revenue: number }}) => formatCurrency(row.revenue) },
        ], [t]);

        return (
             <div className="h-full flex flex-col gap-4">
                <div className="relative">
                    <input type="text" placeholder={t('search_by_customer')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 ps-10 border border-input rounded-md"/>
                    <Search className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground" size={20}/>
                </div>
                <div className="flex-grow">
                    <InteractiveTable columns={columns} data={customerData} setData={() => {}}/>
                </div>
            </div>
        )
    };
    
    const ByProductView = () => {
        const productData = useMemo(() => {
            const stats: Record<string, { id: string; name: string; partNumber: string; quantity: number; revenue: number; cost: number; profit: number; }> = {};
            filteredSales.forEach(sale => {
                sale.items.forEach(item => {
                    const part = partsMap.get(item.partId);
                    if (part) {
                        if (!stats[item.partId]) {
                            stats[item.partId] = { id: part.id, name: part.name, partNumber: part.partNumber, quantity: 0, revenue: 0, cost: 0, profit: 0 };
                        }
                        const cost = part.averageCost || part.purchasePrice;
                        const itemRevenue = item.price * item.quantity;
                        const itemCost = cost * item.quantity;
                        stats[item.partId].quantity += item.quantity;
                        stats[item.partId].revenue += itemRevenue;
                        stats[item.partId].cost += itemCost;
                        stats[item.partId].profit += itemRevenue - itemCost;
                    }
                });
            });
            return Object.values(stats).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()));
        }, [filteredSales, partsMap, searchTerm]);

        const columns = useMemo(() => [
            { Header: t('part_name'), accessor: 'name', width: 300 },
            { Header: t('part_number'), accessor: 'partNumber', width: 150 },
            { Header: t('quantity_sold'), accessor: 'quantity', width: 120 },
            { Header: t('avg_price'), accessor: 'revenue', Cell: ({row}: { row: { revenue: number, quantity: number }}) => formatCurrency(row.revenue / row.quantity) , width: 150 },
            { Header: t('total_revenue'), accessor: 'revenue', Cell: ({row}: { row: { revenue: number }}) => formatCurrency(row.revenue), width: 150 },
            { Header: t('total_cost'), accessor: 'cost', Cell: ({row}: { row: { cost: number }}) => formatCurrency(row.cost), width: 150 },
            { Header: t('total_profit'), accessor: 'profit', Cell: ({row}: { row: { profit: number }}) => formatCurrency(row.profit), width: 150 },
        ], [t]);

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
        )
    };
    
    const OverviewView = () => {
        const COLORS = ['#10b981', '#f59e0b'];
        
        return !overviewData ? (
            <Card className="text-center py-12"><p className="text-muted-foreground">{t('no_sales_data')}</p></Card>
        ) : (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard title={t('total_sales')} value={formatCurrency(overviewData.totalRevenue)} className="text-primary"/>
                    <KpiCard title={t('total_profit')} value={formatCurrency(overviewData.totalProfit)} className="text-green-500"/>
                    <KpiCard title={t('number_of_invoices')} value={overviewData.invoiceCount.toString()} />
                    <KpiCard title={t('average_invoice_value')} value={formatCurrency(overviewData.avgInvoice)} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                         <h3 className="text-lg font-semibold mb-4">{t('sales_trend')}</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={overviewData.salesTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 12 }} />
                                <YAxis tickFormatter={formatCurrency} tick={{ fill: 'currentColor', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" name={t('revenue')} stroke="hsl(var(--primary))" strokeWidth={2} />
                                <Line type="monotone" dataKey="profit" name={t('profit')} stroke="#10b981" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                     <Card>
                         <h3 className="text-lg font-semibold mb-4">{t('sales_by_payment_type')}</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={overviewData.paymentTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                    {overviewData.paymentTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => value} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('period')}</label>
                        <select value={period} onChange={handlePeriodChange} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                            <option value="last_7_days">{t('last_7_days')}</option>
                            <option value="last_30_days">{t('last_30_days')}</option>
                            <option value="this_month">{t('this_month')}</option>
                            <option value="custom_range">{t('custom_range')}</option>
                        </select>
                    </div>
                    {period === 'custom_range' && (
                        <>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('from')}</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('to')}</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3" />
                        </div>
                        </>
                    )}
                </div>
            </Card>

            <div className="flex items-center gap-2 rounded-lg bg-muted p-1 self-start">
                <button onClick={() => setView('overview')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'overview' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('overview')}</button>
                <button onClick={() => setView('by_customer')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'by_customer' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('sales_by_customer')}</button>
                <button onClick={() => setView('by_product')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'by_product' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('sales_by_product')}</button>
            </div>
            
            <div className="flex-grow min-h-0">
                {view === 'overview' && <OverviewView />}
                {view === 'by_customer' && <ByCustomerView />}
                {view === 'by_product' && <ByProductView />}
            </div>

        </div>
    );
};

export default SalesReports;