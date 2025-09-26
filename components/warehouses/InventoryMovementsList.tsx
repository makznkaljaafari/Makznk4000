
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { InventoryMovement, Part, Warehouse } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import InteractiveTable from '../common/InteractiveTable';

const InventoryMovementsList: React.FC = () => {
    const { t } = useLocalization();
    const { inventoryMovements, setInventoryMovements, parts, warehouses } = useAppStore();
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);
    const warehousesMap = useMemo(() => new Map<string, Warehouse>(warehouses.map(w => [w.id, w])), [warehouses]);
    
    const filteredMovements = useMemo(() => {
        const sortedMovements = [...inventoryMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (selectedWarehouseId === 'all') {
            return sortedMovements;
        }
        return sortedMovements.filter(m => m.warehouseId === selectedWarehouseId);
    }, [inventoryMovements, selectedWarehouseId]);

    const getTypeStyle = (type: InventoryMovement['type']) => {
        switch (type) {
            case 'Receipt':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'Issue':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
            case 'Adjustment':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
            case 'Transfer-In':
                return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
            case 'Transfer-Out':
                 return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };
    
    const columns = useMemo(() => [
        { Header: t('date'), accessor: 'date', width: 150 },
        { 
            Header: t('part_name'), 
            accessor: 'partId', 
            width: 300,
            Cell: ({ row }: { row: InventoryMovement }) => {
                const part = partsMap.get(row.partId);
                return <span className="font-medium">{part?.name || row.partId}</span>;
            }
        },
        { 
            Header: t('movement_type'), 
            accessor: 'type', 
            width: 150,
             Cell: ({ row }: { row: InventoryMovement }) => (
                <div className="flex justify-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeStyle(row.type)}`}>
                        {t(row.type)}
                    </span>
                </div>
            )
        },
        { 
            Header: t('quantity_changed'), 
            accessor: 'quantity', 
            width: 150,
            Cell: ({ row }: { row: InventoryMovement }) => (
                <span className={`font-bold ${row.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                </span>
            )
        },
        { Header: t('related_document'), accessor: 'relatedDocumentId', width: 180 },
        { 
            Header: t('warehouse'), 
            accessor: 'warehouseId', 
            width: 250,
             Cell: ({ row }: { row: InventoryMovement }) => {
                const warehouse = warehousesMap.get(row.warehouseId);
                return <span>{warehouse?.name || row.warehouseId}</span>;
             }
        },
        { Header: t('notes'), accessor: 'notes', width: 300 },
    ], [t, partsMap, warehousesMap]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-start">
                 <div className="max-w-xs w-full">
                    <label htmlFor="warehouse-filter" className="sr-only">{t('filter_by_warehouse')}</label>
                     <select 
                        id="warehouse-filter"
                        value={selectedWarehouseId} 
                        onChange={e => setSelectedWarehouseId(e.target.value)} 
                        className="block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                    >
                        <option value="all">{t('all_warehouses')}</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                 </div>
            </div>
            
             <div className="flex-grow">
                <InteractiveTable columns={columns} data={filteredMovements} setData={setInventoryMovements} />
            </div>
        </div>
    );
};

export default InventoryMovementsList;
