
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import InteractiveTable from '../common/InteractiveTable';
import { Plus } from 'lucide-react';
import CreateTransferForm from './CreateTransferForm';
import { Warehouse } from '../../types';

const StoreTransfersList: React.FC<{onNewTransferClick: () => void}> = ({ onNewTransferClick }) => {
    const { t } = useLocalization();
    const { storeTransfers, setStoreTransfers, warehouses } = useAppStore();
    
    const warehousesMap = useMemo(() => new Map<string, Warehouse>(warehouses.map(w => [w.id, w])), [warehouses]);

    const columns = useMemo(() => [
        { Header: t('transfer_id'), accessor: 'id', width: 150 },
        { Header: t('date'), accessor: 'date', width: 150 },
        { Header: t('from_warehouse'), accessor: 'fromWarehouseId', width: 250, Cell: ({ row }: { row: { fromWarehouseId: string } }) => {
            const warehouse = warehousesMap.get(row.fromWarehouseId);
            return warehouse?.name || row.fromWarehouseId;
        }},
        { Header: t('to_warehouse'), accessor: 'toWarehouseId', width: 250, Cell: ({ row }: { row: { toWarehouseId: string } }) => {
            const warehouse = warehousesMap.get(row.toWarehouseId);
            return warehouse?.name || row.toWarehouseId;
        }},
        { Header: t('items'), accessor: 'items', width: 120, Cell: ({ row }: { row: { items: any[] } }) => row.items.length },
        { Header: t('transfer_status'), accessor: 'status', width: 150, Cell: ({ row }: { row: { status: string } }) => (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">{t(row.status.toLowerCase())}</span>
        )},
    ], [t, warehousesMap]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-end">
                <button onClick={onNewTransferClick} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors">
                    <Plus size={20} />
                    <span>{t('create_new_transfer')}</span>
                </button>
            </div>
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={storeTransfers} setData={setStoreTransfers} />
            </div>
        </div>
    );
};

const StoreTransfers: React.FC = () => {
    const [view, setView] = useState<'list' | 'create'>('list');
    
    if (view === 'create') {
        return <CreateTransferForm onCancel={() => setView('list')} onTransferCreated={() => setView('list')} />;
    }
    
    return <StoreTransfersList onNewTransferClick={() => setView('create')} />;
};

export default StoreTransfers;
