
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Part, Warehouse } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { PartSearchModal, SearchableItem } from '../common/PartSearchModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Search } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const StockBalancesReport = () => {
    const { t } = useLocalization();
    const { parts, warehouses, inventoryMovements } = useAppStore();
    const [filterWarehouseId, setFilterWarehouseId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const stockBalances = useMemo(() => {
        const balances: Record<string, Record<string, number>> = {};
        inventoryMovements.forEach(m => {
            if (!balances[m.partId]) balances[m.partId] = {};
            if (!balances[m.partId][m.warehouseId]) balances[m.partId][m.warehouseId] = 0;
            balances[m.partId][m.warehouseId] += m.quantity;
        });
        
        const reportData = [];
        for (const part of parts) {
            if (balances[part.id]) {
                for (const warehouseId in balances[part.id]) {
                    reportData.push({
                        part,
                        warehouseId,
                        stock: balances[part.id][warehouseId],
                    });
                }
            } else {
                 // Show items with 0 stock in all warehouses if "all" is selected
                 if (filterWarehouseId === 'all') {
                     for (const warehouse of warehouses) {
                         reportData.push({ part, warehouseId: warehouse.id, stock: 0 });
                     }
                 }
            }
        }
        return reportData;
    }, [parts, inventoryMovements, warehouses, filterWarehouseId]);
    
    const filteredData = useMemo(() => {
        return stockBalances.filter(item => {
            const warehouseMatch = filterWarehouseId === 'all' || item.warehouseId === filterWarehouseId;
            const searchTermMatch = !searchTerm || item.part.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
            return warehouseMatch && searchTermMatch;
        });
    }, [stockBalances, filterWarehouseId, searchTerm]);

    const warehousesMap = useMemo(() => new Map<string, Warehouse>(warehouses.map(w => [w.id, w])), [warehouses]);

    return (
        <Card className="h-full flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                     <select value={filterWarehouseId} onChange={e => setFilterWarehouseId(e.target.value)} className="block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                        <option value="all">{t('all_warehouses')}</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('search_by_part_name')} className="block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"/>
                </div>
            </div>
            <div className="flex-grow overflow-auto">
                <table className="w-full text-sm">
                     <thead className="sticky top-0 bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-start">{t('part_name')}</th>
                            <th className="px-4 py-3 text-start">{t('part_number')}</th>
                            <th className="px-4 py-3 text-start">{t('warehouse')}</th>
                            <th className="px-4 py-3 text-center">{t('current_stock')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                        {filteredData.map(({part, warehouseId, stock}) => (
                            <tr key={`${part.id}-${warehouseId}`} className="hover:bg-accent">
                                <td className="px-4 py-2 font-medium">{part.name}</td>
                                <td className="px-4 py-2 text-muted-foreground">{part.partNumber}</td>
                                <td className="px-4 py-2">{warehousesMap.get(warehouseId)?.name || warehouseId}</td>
                                <td className={`px-4 py-2 text-center font-bold ${stock <= part.minStock ? 'text-red-500' : 'text-green-500'}`}>{stock}</td>
                            </tr>
                        ))}
                     </tbody>
                </table>
                {filteredData.length === 0 && <p className="text-center p-8 text-muted-foreground">{t('no_stock_data')}</p>}
            </div>
        </Card>
    );
};

const ItemMovementReport = () => {
    const { t } = useLocalization();
    const { parts, inventoryMovements, warehouses, partKits } = useAppStore();
    const { addToast } = useToast();
    const [selectedPart, setSelectedPart] = useState<Part | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const warehousesMap = useMemo(() => new Map<string, Warehouse>(warehouses.map(w => [w.id, w])), [warehouses]);

    const handleSelectItem = (item: SearchableItem) => {
        if (item.type === 'part') {
            setSelectedPart(item);
        } else {
            addToast(t('movement_history_for_parts_only'), 'info');
        }
        setIsModalOpen(false);
    };
    
    const movementHistory = useMemo(() => {
        if (!selectedPart) return [];
        const partMovements = inventoryMovements
            .filter(m => m.partId === selectedPart.id)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const balances = new Map<string, number>();
        return partMovements.map(m => {
            const currentBalance = balances.get(m.warehouseId) || 0;
            const newBalance = currentBalance + m.quantity;
            balances.set(m.warehouseId, newBalance);
            return { ...m, runningBalance: newBalance };
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [selectedPart, inventoryMovements]);

    return (
        <Card className="h-full flex flex-col gap-4">
            <PartSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSelectItem={handleSelectItem} parts={parts} partKits={partKits} priceType="sellingPrice"/>
             <div className="flex flex-col sm:flex-row gap-4 items-center">
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors">
                    <Search size={18}/> {t('search_part')}
                </button>
                {selectedPart && <h3 className="text-lg font-bold">{t('item_movement_history_for')}: <span className="text-primary">{selectedPart.name}</span></h3>}
             </div>
             <div className="flex-grow overflow-auto">
                {!selectedPart ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('select_part_to_view_history')}</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-start">{t('date')}</th>
                                <th className="px-4 py-3 text-start">{t('warehouse')}</th>
                                <th className="px-4 py-3 text-start">{t('movement_type')}</th>
                                <th className="px-4 py-3 text-center">{t('quantity_changed')}</th>
                                <th className="px-4 py-3 text-center">{t('running_balance')}</th>
                                <th className="px-4 py-3 text-start">{t('related_document')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {movementHistory.map(m => (
                                <tr key={m.id}>
                                    <td className="px-4 py-2">{m.date}</td>
                                    <td className="px-4 py-2">{warehousesMap.get(m.warehouseId)?.name || m.warehouseId}</td>
                                    <td className="px-4 py-2">{t(m.type)}</td>
                                    <td className={`px-4 py-2 text-center font-bold ${m.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                                    <td className="px-4 py-2 text-center font-semibold">{m.runningBalance}</td>
                                    <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{m.relatedDocumentId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Card>
    );
};

const StockDistributionReport = () => {
    const { t } = useLocalization();
    const { parts, warehouses, inventoryMovements } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');

    const { tableData, chartData } = useMemo(() => {
        const balances: Record<string, Record<string, number>> = {};
        inventoryMovements.forEach(m => {
            if (!balances[m.partId]) balances[m.partId] = {};
            if (!balances[m.partId][m.warehouseId]) balances[m.partId][m.warehouseId] = 0;
            balances[m.partId][m.warehouseId] += m.quantity;
        });

        const newTableData = parts.map(part => {
            let totalStock = 0;
            const warehouseStocks: Record<string, number> = {};
            
            warehouses.forEach(warehouse => {
                const stockInWarehouse = balances[part.id]?.[warehouse.id] || 0;
                warehouseStocks[warehouse.id] = stockInWarehouse;
                totalStock += stockInWarehouse;
            });

            return {
                ...part,
                totalStock,
                warehouseStocks,
            };
        });

        const newChartData = warehouses.map(warehouse => {
            let totalStockInWarehouse = 0;
            parts.forEach(part => {
                totalStockInWarehouse += balances[part.id]?.[warehouse.id] || 0;
            });
            return {
                name: warehouse.name,
                totalStock: totalStockInWarehouse
            };
        });
        
        return { tableData: newTableData, chartData: newChartData };
    }, [parts, warehouses, inventoryMovements]);

    const filteredTableData = useMemo(() => {
        if (!searchTerm) return tableData;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return tableData.filter(item => 
            item.name.toLowerCase().includes(lowerCaseSearch) ||
            item.partNumber.toLowerCase().includes(lowerCaseSearch)
        );
    }, [tableData, searchTerm]);

    const chartColors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="text-lg font-semibold mb-4">{t('total_stock_by_warehouse')}</h3>
                 {chartData.length === 0 ? (
                    <p className="text-center p-8 text-muted-foreground">{t('no_data_for_chart')}</p>
                 ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} tickFormatter={(value) => new Intl.NumberFormat('en-US').format(value as number)} />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--accent))' }}
                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                                formatter={(value: number) => new Intl.NumberFormat('en-US').format(value)}
                            />
                            <Legend />
                            <Bar dataKey="totalStock" name={t('total_stock')} radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 )}
            </Card>

            <Card className="h-[60vh] flex flex-col gap-4">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{t('stock_distribution_by_part')}</h3>
                    <div className="w-full max-w-sm">
                        <input
                            type="text"
                            placeholder={t('search_by_part_name')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </div>

                <div className="flex-grow overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/50 z-10">
                            <tr>
                                <th className="p-3 text-start">{t('part_name')}</th>
                                <th className="p-3 text-start">{t('part_number')}</th>
                                <th className="p-3 text-center font-bold text-primary">{t('total_stock')}</th>
                                {warehouses.map(wh => (
                                    <th key={wh.id} className="p-3 text-center">{wh.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTableData.map(item => (
                                <tr key={item.id} className="hover:bg-accent">
                                    <td className="p-3 font-medium">{item.name}</td>
                                    <td className="p-3 text-muted-foreground">{item.partNumber}</td>
                                    <td className="p-3 text-center font-bold text-primary">{item.totalStock}</td>
                                    {warehouses.map(wh => (
                                        <td key={wh.id} className="p-3 text-center font-mono">
                                            {item.warehouseStocks[wh.id] > 0 ? item.warehouseStocks[wh.id] : <span className="text-muted-foreground">-</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTableData.length === 0 && <p className="text-center p-8 text-muted-foreground">{t('no_stock_data')}</p>}
                </div>
            </Card>
        </div>
    );
};

const WarehouseReports: React.FC = () => {
    const { t } = useLocalization();
    const [reportType, setReportType] = useState<'balances' | 'movement' | 'distribution'>('balances');
    
    const renderReport = () => {
        switch(reportType) {
            case 'balances': return <StockBalancesReport />;
            case 'movement': return <ItemMovementReport />;
            case 'distribution': return <StockDistributionReport />;
            default: return null;
        }
    }
    
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 border-b border-border pb-2">
                <h3 className="text-lg font-semibold text-muted-foreground">{t('select_report_type')}:</h3>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-1">
                     <button onClick={() => setReportType('balances')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${reportType === 'balances' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('stock_balances_report')}</button>
                     <button onClick={() => setReportType('movement')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${reportType === 'movement' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('item_movement_report')}</button>
                     <button onClick={() => setReportType('distribution')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${reportType === 'distribution' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('stock_distribution_report')}</button>
                </div>
            </div>
            <div>
                {renderReport()}
            </div>
        </div>
    );
};

export default WarehouseReports;
