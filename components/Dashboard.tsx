

import React, { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, CartesianGrid, Pie, PieChart } from 'recharts';
import Card from './common/Card';
import { useAppStore } from '../stores/useAppStore';
import { useLocalization } from '../hooks/useLocalization';
import { ArrowUpRight, DollarSign, Archive, AlertTriangle, Users, FileText, Package, CheckSquare, Clock, TrendingUp, ShoppingCart, Plus, Truck, Landmark, UserPlus, GripVertical } from 'lucide-react';
import CardSkeleton from './common/CardSkeleton';
import { Customer, Part, InventoryMovement, Sale, AccountType } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { XYCoord } from 'dnd-core';
import { generateDashboardInsights } from '../services/geminiService';
import AiInsightsCard from './dashboard/AiInsightsCard';

interface DashboardProps {
    setActiveView: (view: string) => void;
    isLoading: boolean;
}

const StatCard = React.memo(({ icon, title, value, action, onActionClick, valueClass = '' }: { icon: React.ReactNode, title: string, value: string | number, action?: string, onActionClick?: () => void, valueClass?: string }) => (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
      </div>
      <div className="mt-2">
        <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
        {action && (
          <a href="#" onClick={(e) => { e.preventDefault(); onActionClick?.() }} className="ms-auto flex items-center text-xs text-muted-foreground hover:text-primary">
            <span>{action}</span>
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
      </div>
    </Card>
));

const InfoListCard = React.memo(({title, items, emptyMessage }: {title: string, items: {id: string, primary: string, secondary: string, value?: string, valueClass?: string, onClick?: () => void}[], emptyMessage?: string }) => {
    const { t } = useLocalization();
    return (
        <Card className="h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex-shrink-0">{title}</h2>
            <div className="space-y-4 overflow-y-auto flex-grow">
                {items.map(item => (
                    <div key={item.id} className={`flex justify-between items-center ${item.onClick ? 'cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-lg' : 'p-2 -m-2'}`} onClick={item.onClick}>
                        <div>
                            <p className="font-medium text-sm">{item.primary}</p>
                            <p className="text-xs text-muted-foreground">{item.secondary}</p>
                        </div>
                        {item.value && <div className={`font-bold text-md ${item.valueClass || ''}`}>{item.value}</div>}
                    </div>
                ))}
                 {items.length === 0 && <p className="text-sm text-center py-4 text-muted-foreground">{emptyMessage || t('no_data_available')}</p>}
            </div>
        </Card>
    );
});

interface DebtAgingDataPoint {
    id: string;
    name: string;
    value: number;
}


// Admin Dashboard
const AdminDashboard = ({ setActiveView }: { setActiveView: (view: string) => void }) => {
    const { t, lang } = useLocalization();
    const { customers: allCustomers, sales: allSales, parts: allParts, setCustomerListFilter, currentUser, setFocusedItem, activeCompany, updateDashboardLayout, dashboardInsights, setDashboardInsights, setSalesActiveTab, setPurchasesActiveTab, setCustomerListFilter: setCustFilter, setInventoryFilter } = useAppStore();
    const { hasPermission } = usePermissions();
    const [isInsightsLoading, setIsInsightsLoading] = useState(false);

    const customers = useMemo(() => allCustomers.filter(c => c.companyId === currentUser?.companyId), [allCustomers, currentUser]);
    const sales = useMemo(() => allSales.filter(s => s.companyId === currentUser?.companyId), [allSales, currentUser]);
    const parts = useMemo(() => allParts.filter(p => p.companyId === currentUser?.companyId), [allParts, currentUser]);

    useEffect(() => {
        const fetchInsights = async () => {
            if (dashboardInsights === null) { // Fetch only if not already fetched
                setIsInsightsLoading(true);
                try {
                    const result = await generateDashboardInsights({ sales, parts, customers });
                    setDashboardInsights(result);
                } catch (e) {
                    console.error("Failed to fetch dashboard insights:", e);
                } finally {
                    setIsInsightsLoading(false);
                }
            }
        };
        fetchInsights();
    }, [sales, parts, customers, dashboardInsights, setDashboardInsights]);


    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // KPIs
    const kpiCards = useMemo(() => [
        { id: 'total_sales', icon: <DollarSign/>, title: t('total_sales'), value: `${sales.reduce((sum, sale) => sum + sale.total, 0).toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`, action: null, onActionClick: null },
        { id: 'total_customers', icon: <Users/>, title: t('total_customers'), value: customers.length, action: t('view_all'), onActionClick: () => setActiveView('customers') },
        { id: 'total_debt', icon: <DollarSign/>, title: t('total_debt'), value: customers.reduce((sum, customer) => sum + customer.totalDebt, 0).toLocaleString('en-US'), valueClass: 'text-amber-500', action: t('view_all'), onActionClick: () => setActiveView('customers') },
        { id: 'low_stock_items', icon: <AlertTriangle/>, title: t('low_stock_items'), value: parts.filter(part => part.stock <= part.minStock).length, valueClass: 'text-red-500', action: t('view_all'), onActionClick: () => { setActiveView('inventory'); setInventoryFilter({ type: 'stock_level', value: 'low', label: t('low_stock') }); } },
    ], [sales, customers, parts, t, lang, setActiveView, setInventoryFilter]);
    
    const layout = activeCompany?.dashboardLayout || ['total_sales', 'total_customers', 'total_debt', 'low_stock_items'];
    const sortedKpiCards = useMemo(() => layout.map(id => kpiCards.find(c => c.id === id)).filter(Boolean) as (typeof kpiCards[0])[], [layout, kpiCards]);

    const moveCard = (dragIndex: number, hoverIndex: number) => {
        const draggedCard = sortedKpiCards[dragIndex];
        const newLayout = [...layout];
        newLayout.splice(dragIndex, 1);
        newLayout.splice(hoverIndex, 0, draggedCard.id);
        updateDashboardLayout(newLayout);
    };

    // Sales Trend Chart Data
    const salesTrendData = useMemo(() => {
        const salesByDay = sales
          .filter(sale => new Date(sale.date) >= thirtyDaysAgo)
          .reduce((acc, sale) => {
            const day = sale.date;
            acc[day] = (acc[day] || 0) + sale.total;
            return acc;
          }, {} as Record<string, number>);

        return Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - i);
            return d.toISOString().split('T')[0];
          })
          .reverse()
          .map(day => ({
            date: day.slice(5),
            [t('sales')]: salesByDay[day] || 0,
          }));
    }, [sales, t]);
    
    // Debt Aging Chart Data
    const debtAgingData = useMemo(() => {
        const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 };
        customers.forEach(customer => {
            if (customer.debtAging) {
                aging['0-30'] += customer.debtAging['0-30'];
                aging['31-60'] += customer.debtAging['31-60'];
                aging['61-90'] += customer.debtAging['61-90'];
                aging['91+'] += customer.debtAging['91+'];
            }
        });
        return [
            { id: '0-30', name: t('less_than_30_days'), value: aging['0-30'] },
            { id: '31-60', name: t('30_60_days'), value: aging['31-60'] },
            { id: '61-90', name: t('61-90_days'), value: aging['61-90'] },
            { id: '91+', name: t('more_than_90_days'), value: aging['91+'] },
        ];
    }, [customers, t]);
    const debtChartColors = ['#3b82f6', '#10b981', '#f97316', '#ef4444'];
    
    const handleBarClick = (data: any) => {
        if (data && data.payload) {
            const payload = data.payload as DebtAgingDataPoint;
            if (payload.id) {
                setCustomerListFilter({ type: 'debt_aging', value: payload.id, label: payload.name });
                setActiveView('debt-management');
            }
        }
    };
    
    // Lists Data
    const recentSalesItems = useMemo(() => [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(s => ({id: s.id, primary: s.customerName, secondary: s.date, value: `+${s.total.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`, valueClass: 'text-green-500'})), [sales, lang]);
    const lowStockItems = useMemo(() => parts.filter(p => p.stock > 0 && p.stock <= p.minStock).sort((a,b) => a.stock - b.stock).slice(0, 5).map(p => ({id: p.id, primary: p.name, secondary: `${t('stock_level')}: ${p.stock} / ${t('min_stock')}: ${p.minStock}`})), [parts, t]);


    const shortcuts = [
        { label: t('create_invoice'), icon: ShoppingCart, view: 'sales', tab: 'create', permission: 'manage_sales', shortcut: 'Ctrl+I' },
        { label: t('create_purchase_order'), icon: Truck, view: 'purchases', tab: 'create', permission: 'manage_purchases', shortcut: 'Ctrl+P' },
        { label: t('add_customer'), icon: UserPlus, view: 'customers', permission: 'manage_customers' },
        { label: t('reports'), icon: FileText, view: 'reports', permission: 'view_reports' },
    ].filter(s => hasPermission(s.permission as any));
    
    const DraggableStatCard: React.FC<{ card: any; index: number; moveCard: (dragIndex: number, hoverIndex: number) => void; }> = ({ card, index, moveCard }) => {
        const ref = React.useRef<HTMLDivElement>(null);
        const [{ handlerId }, drop] = useDrop({
            accept: 'stat_card',
            collect(monitor) { return { handlerId: monitor.getHandlerId() }; },
            hover(item: any, monitor) {
                if (!ref.current) return;
                const dragIndex = item.index;
                const hoverIndex = index;
                if (dragIndex === hoverIndex) return;
                const hoverBoundingRect = ref.current?.getBoundingClientRect();
                const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
                const clientOffset = monitor.getClientOffset();
                const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;
                if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
                if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
                moveCard(dragIndex, hoverIndex);
                item.index = hoverIndex;
            },
        });
        const [{ isDragging }, drag] = useDrag({
            type: 'stat_card',
            item: () => ({ id: card.id, index }),
            collect: (monitor) => ({ isDragging: monitor.isDragging() }),
        });
        drag(drop(ref));

        return (
             <div ref={ref} data-handler-id={handlerId} style={{ opacity: isDragging ? 0.5 : 1 }} className="relative group">
                <StatCard {...card} />
                <div title={t('draggable_cards_tooltip')} className="absolute top-2 start-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground cursor-grab active:cursor-grabbing"><GripVertical size={16}/></div>
            </div>
        )
    };


    return (
         <DndProvider backend={HTML5Backend}>
            <div className="space-y-6">
                 <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
                        <p className="text-muted-foreground">{t('welcome_message', { name: currentUser?.fullName || '' })}</p>
                    </div>
                     <div className="flex items-center gap-2">
                        {shortcuts.map(sc => (
                            <button 
                                key={sc.view} 
                                onClick={() => {
                                    if(sc.view === 'sales') setSalesActiveTab(sc.tab || 'invoices');
                                    if(sc.view === 'purchases') setPurchasesActiveTab(sc.tab || 'orders');
                                    setActiveView(sc.view)
                                }} 
                                title={sc.shortcut || ''}
                                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 text-sm rounded-lg shadow-sm hover:bg-muted transition-colors">
                                <sc.icon size={16}/> {sc.label}
                            </button>
                        ))}
                     </div>
                </div>

                <AiInsightsCard insights={dashboardInsights} isLoading={isInsightsLoading} onRefresh={() => setDashboardInsights(null)} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sortedKpiCards.map((card, index) => (
                        <DraggableStatCard key={card.id} index={index} card={card} moveCard={moveCard} />
                    ))}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-lg font-semibold mb-4">{t('sales_last_30_days')}</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={salesTrendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', {notation: 'compact'}).format(val as number)} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-lg)' }} formatter={(value: number) => new Intl.NumberFormat('en-US').format(value)}/>
                                <Line type="monotone" dataKey={t('sales')} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                    <Card>
                        <h2 className="text-lg font-semibold mb-4">{t('debt_by_age')}</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={debtAgingData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.5)" />
                                <XAxis type="number" tickFormatter={(val) => new Intl.NumberFormat('en-US', {notation: 'compact'}).format(val as number)} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'hsl(var(--accent))'}} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} formatter={(value: number) => new Intl.NumberFormat('en-US').format(value)}/>
                                <Bar dataKey="value" name={t('debt')} radius={[0, 4, 4, 0]} onClick={handleBarClick} barSize={20}>
                                    {debtAgingData.map((entry, index) => (<Cell key={`cell-${index}`} fill={debtChartColors[index % debtChartColors.length]} cursor="pointer" />))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                    <InfoListCard title={t('low_stock_items_alert')} items={lowStockItems} emptyMessage={t('no_low_stock_items')} />
                    <InfoListCard title={t('recent_sales')} items={recentSalesItems} />
                </div>
            </div>
        </DndProvider>
    );
};

// Salesperson Dashboard
const SalespersonDashboard = ({ setActiveView }: { setActiveView: (view: string) => void }) => {
    const { t, lang } = useLocalization();
    const { sales: allSales, customers: allCustomers, currentUser, setFocusedItem } = useAppStore();
    const { hasPermission } = usePermissions();
    if (!currentUser) return null;

    const sales = useMemo(() => allSales.filter(s => s.companyId === currentUser?.companyId), [allSales, currentUser]);
    const customers = useMemo(() => allCustomers.filter(c => c.companyId === currentUser?.companyId), [allCustomers, currentUser]);

    const { myTotalSales, myCustomers, myRecentSales, customersToFollowUp } = useMemo(() => {
        const mySales = sales.filter(s => s.salespersonId === currentUser.id);
        const myCustomers = customers.filter(c => c.assignedSalespersonId === currentUser.id);
        const myTotalSales = mySales.reduce((sum, sale) => sum + sale.total, 0);
        const myRecentSales = mySales.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
        const customersToFollowUp = myCustomers.filter(c => c.totalDebt > (c.creditLimit * 0.8)).sort((a,b) => b.totalDebt - a.totalDebt).slice(0, 5);
        return { myTotalSales, myCustomers, myRecentSales, customersToFollowUp };
    }, [sales, customers, currentUser.id]);

    const recentSalesItems = myRecentSales.map(s => ({id: s.id, primary: s.customerName, secondary: s.date, value: `+${s.total.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`, valueClass: 'text-green-500'}));
    const followUpItems = customersToFollowUp.map(c => ({id: c.id, primary: c.name, secondary: `${t('debt')}: ${c.totalDebt.toLocaleString()}`, onClick: () => { setFocusedItem({type: 'customer', id: c.id}); setActiveView('customers'); }}));

    return (
        <div className="space-y-6">
             <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold">{t('dashboard')} - <span className="text-primary">{t(currentUser?.role || '')}</span></h1>
                <div className="flex items-center gap-2">
                     {hasPermission('manage_sales') && <button onClick={() => setActiveView('sales')} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 text-sm rounded-lg shadow hover:bg-primary/90 transition-colors"><ShoppingCart size={16}/> {t('create_invoice')}</button>}
                </div>
            </div>
            <div className="flex flex-wrap gap-6">
                <StatCard icon={<TrendingUp/>} title={t('total_sales')} value={`${myTotalSales.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`} />
                <StatCard icon={<Users/>} title={t('customers')} value={myCustomers.length} action={t('view_all')} onActionClick={() => setActiveView('customers')} />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InfoListCard title={t('recent_sales')} items={recentSalesItems} />
                <InfoListCard title={t('customers_to_follow_up')} items={followUpItems} />
            </div>
        </div>
    );
};

// Warehouse Manager Dashboard
const WarehouseManagerDashboard = ({ setActiveView }: { setActiveView: (view: string) => void }) => {
    const { t, lang } = useLocalization();
    const { parts: allParts, inventoryMovements: allInventoryMovements, storeTransfers: allStoreTransfers, setFocusedItem, currentUser } = useAppStore();
    const { hasPermission } = usePermissions();

    const parts = useMemo(() => allParts.filter(p => p.companyId === currentUser?.companyId), [allParts, currentUser]);
    const inventoryMovements = useMemo(() => allInventoryMovements.filter(im => im.companyId === currentUser?.companyId), [allInventoryMovements, currentUser]);
    const storeTransfers = useMemo(() => allStoreTransfers.filter(st => st.companyId === currentUser?.companyId), [allStoreTransfers, currentUser]);

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);

    const { lowStockItems, totalInventoryValue, pendingTransfersCount, recentMovements } = useMemo(() => {
        const lowStockItems = parts.filter(p => p.stock <= p.minStock);
        const totalInventoryValue = parts.reduce((sum, part) => sum + ((part.averageCost || part.purchasePrice) * part.stock), 0);
        const pendingTransfersCount = storeTransfers.filter(t => t.status === 'Pending').length;
        const recentMovements = [...inventoryMovements].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
        return { lowStockItems, totalInventoryValue, pendingTransfersCount, recentMovements };
    }, [parts, inventoryMovements, storeTransfers]);
    
    const itemsToReorder = lowStockItems.slice(0,5).map(p => ({id: p.id, primary: p.name, secondary: `${t('stock')}: ${p.stock} / ${t('min_stock')}: ${p.minStock}`}));
    
    const recentMovementItems = recentMovements.map(m => {
        const partName = partsMap.get(m.partId)?.name || 'N/A';
        const quantityText = m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`;
        return {
            id: m.id,
            primary: `${t(m.type)} - ${partName}`,
            secondary: m.date,
            value: quantityText,
            valueClass: m.quantity > 0 ? 'text-green-500' : 'text-red-500'
        };
    });

    return (
        <div className="space-y-6">
             <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold">{t('dashboard')} - <span className="text-primary">{t(currentUser?.role || '')}</span></h1>
                <div className="flex items-center gap-2">
                    {hasPermission('manage_purchases') && <button onClick={() => setActiveView('purchases')} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 text-sm rounded-lg shadow-sm hover:bg-muted"><Truck size={16}/> {t('create_purchase_order')}</button>}
                </div>
            </div>
            <div className="flex flex-wrap gap-6">
                <StatCard icon={<AlertTriangle/>} title={t('low_stock_items')} value={lowStockItems.length} />
                <StatCard icon={<Archive/>} title={t('inventory_value')} value={`${totalInventoryValue.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`} />
                <StatCard icon={<Clock/>} title={t('pending_transfers')} value={pendingTransfersCount} action={t('view_all')} onActionClick={() => setActiveView('warehouses')} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InfoListCard title={t('items_requiring_reorder')} items={itemsToReorder} />
                <InfoListCard title={t('recent_inventory_movements')} items={recentMovementItems} />
            </div>
        </div>
    );
};

const AccountantDashboard = ({ setActiveView }: { setActiveView: (view: string) => void }) => {
    const { t, lang } = useLocalization();
    const { chartOfAccounts: allChartOfAccounts, journalEntries: allJournalEntries, currentUser } = useAppStore();
    const { hasPermission } = usePermissions();

    const chartOfAccounts = useMemo(() => allChartOfAccounts.filter(coa => coa.companyId === currentUser?.companyId), [allChartOfAccounts, currentUser]);
    const journalEntries = useMemo(() => allJournalEntries.filter(je => je.companyId === currentUser?.companyId), [allJournalEntries, currentUser]);


    const { financialSummary, balanceByTypeData } = useMemo(() => {
        const accountsWithBalance = chartOfAccounts.map(acc => {
            const balance = journalEntries
                .filter(je => je.isPosted)
                .flatMap(je => je.items)
                .filter(item => item.accountId === acc.id)
                .reduce((bal, item) => {
                    if (['Asset', 'Expense'].includes(acc.type)) {
                        return bal + item.debit - item.credit;
                    }
                    return bal + item.credit - item.debit;
                }, 0);
            return {...acc, balance};
        });
        
        const summary: Record<AccountType, number> = {
            Asset: 0, Liability: 0, Equity: 0, Revenue: 0, Expense: 0,
        };

        accountsWithBalance.forEach(acc => {
            if (acc.parentAccountId === null) {
                 summary[acc.type] += acc.balance;
            }
        });
        
        const totalRevenue = summary.Revenue;
        const totalExpense = summary.Expense;
        const netProfit = totalRevenue - totalExpense;

        const balanceChartData = Object.entries(summary)
            .filter(([_, value]) => value !== 0)
            .map(([key, value]) => ({ name: t(key as AccountType), value: Math.abs(value) }));

        return { 
            financialSummary: { totalAssets: summary.Asset, totalLiabilities: summary.Liability, netProfit },
            balanceByTypeData: balanceChartData
        };
    }, [chartOfAccounts, journalEntries, t]);
    
    const chartColors = ['#3b82f6', '#ef4444', '#10b981', '#f97316', '#8b5cf6'];

    return (
         <div className="space-y-6">
             <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold">{t('dashboard')} - <span className="text-primary">{t(currentUser?.role || '')}</span></h1>
                <div className="flex items-center gap-2">
                    {hasPermission('manage_accounting') && <button onClick={() => setActiveView('accounting')} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 text-sm rounded-lg shadow hover:bg-primary/90 transition-colors"><Plus size={16}/> {t('add_new_entry')}</button>}
                    {hasPermission('view_reports') && <button onClick={() => setActiveView('reports')} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 text-sm rounded-lg shadow-sm hover:bg-muted"><FileText size={16}/> {t('financial_reports')}</button>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Archive/>} title={t('total_assets')} value={`${financialSummary.totalAssets.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`} />
                <StatCard icon={<Landmark/>} title={t('total_liabilities')} value={`${financialSummary.totalLiabilities.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`} />
                <StatCard icon={<DollarSign/>} title={t('net_profit')} value={`${financialSummary.netProfit.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`} valueClass={financialSummary.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}/>
            </div>
            <Card>
                <h2 className="text-lg font-semibold mb-4">{t('account_type_balances')}</h2>
                 <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={balanceByTypeData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', {notation: 'compact'}).format(val as number)} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                            formatter={(value: number) => new Intl.NumberFormat('en-US').format(value)}
                        />
                        <Bar dataKey="value" name={t('balance')} radius={[4, 4, 0, 0]}>
                            {balanceByTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
};


// Main Dashboard Component
const Dashboard: React.FC<DashboardProps> = ({ setActiveView, isLoading }) => {
  const { t } = useLocalization();
  const { currentUser } = useAppStore();
  
  const renderDashboardByRole = () => {
    switch (currentUser?.role) {
      case 'Salesperson':
        return <SalespersonDashboard setActiveView={setActiveView} />;
      case 'Warehouse Manager':
        return <WarehouseManagerDashboard setActiveView={setActiveView} />;
      case 'Accountant':
        return <AccountantDashboard setActiveView={setActiveView} />;
      case 'Administrator':
      default:
        return <AdminDashboard setActiveView={setActiveView} />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
          <div className="h-9 w-1/3 rounded-lg bg-muted animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <CardSkeleton className="h-[96px]" />
              <CardSkeleton className="h-[96px]" />
              <CardSkeleton className="h-[96px]" />
              <CardSkeleton className="h-[96px]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CardSkeleton className="lg:col-span-1 h-[300px]" />
              <CardSkeleton className="lg:col-span-1 h-[300px]" />
              <CardSkeleton className="lg:col-span-1 h-[300px]" />
              <CardSkeleton className="lg:col-span-1 h-[300px]" />
          </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
        {renderDashboardByRole()}
    </div>
  );
};

export default Dashboard;