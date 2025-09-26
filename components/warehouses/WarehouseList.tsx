
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Warehouse } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import InteractiveTable from '../common/InteractiveTable';
import { Plus, Edit, Trash2 } from 'lucide-react';
import WarehouseModal from './WarehouseModal';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';

const WarehouseList: React.FC = () => {
    const { t } = useLocalization();
    const { warehouses: allWarehouses, setWarehouses, currentUser } = useAppStore();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);

    const warehouses = useMemo(() => allWarehouses.filter(w => w.companyId === currentUser?.companyId), [allWarehouses, currentUser]);

    const handleAddNew = () => {
        setSelectedWarehouse(null);
        setIsModalOpen(true);
    };

    const handleEdit = (warehouse: Warehouse) => {
        setSelectedWarehouse(warehouse);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (warehouseId: string) => {
        setWarehouseToDelete(warehouseId);
        setConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if(warehouseToDelete) {
            setWarehouses(prev => prev.filter(w => w.id !== warehouseToDelete));
            addToast(t('warehouse_deleted_success'), 'success');
        }
        setConfirmModalOpen(false);
        setWarehouseToDelete(null);
    };
    
    const handleSave = (warehouseData: Omit<Warehouse, 'id' | 'companyId'> & { id?: string }) => {
        if (!currentUser) return;
        if (warehouseData.id) { // Editing
            setWarehouses(prev => prev.map(w => w.id === warehouseData.id ? { ...w, ...warehouseData } : w));
        } else { // Adding
            const newWarehouse: Warehouse = { ...warehouseData, id: `wh${Date.now().toString().slice(-6)}`, companyId: currentUser.companyId };
            setWarehouses(prev => [newWarehouse, ...prev]);
        }
        setIsModalOpen(false);
        addToast(t('warehouse_saved_success'), 'success');
    };

    const columns = useMemo(() => [
        { Header: t('warehouse_name'), accessor: 'name', width: 300, Cell: ({ row }: { row: Warehouse }) => <span className="font-medium">{row.name}</span> },
        { Header: t('warehouse_location'), accessor: 'location', width: 350 },
        { Header: t('warehouse_manager'), accessor: 'manager', width: 250 },
        { Header: t('phone'), accessor: 'phone', width: 200 },
        {
            Header: t('actions'),
            accessor: 'actions',
            width: 150,
            Cell: ({ row }: { row: Warehouse }) => (
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => handleEdit(row)} className="text-primary hover:text-primary/80 transition-colors" title={t('edit')}><Edit size={18} /></button>
                    <button onClick={() => handleDeleteClick(row.id)} className="text-red-500 hover:text-red-700 transition-colors" title={t('delete')}><Trash2 size={18} /></button>
                </div>
            ),
        }
    ], [t]);
    
    return (
        <div className="space-y-4 h-full flex flex-col">
            <WarehouseModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                warehouse={selectedWarehouse}
            />
            <ConfirmationModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('delete_warehouse')}
                message={t('delete_warehouse_confirm')}
            />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <h2 className="text-2xl font-bold">{t('store_list')}</h2>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    <span>{t('add_new_warehouse')}</span>
                </button>
            </div>
            
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={warehouses} setData={setWarehouses} />
            </div>
        </div>
    );
};

export default WarehouseList;
