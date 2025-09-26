

import React, { useState, useMemo, useEffect } from 'react';
import { Supplier } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Edit, Trash2, UserSquare2, Link as LinkIcon, CreditCard } from 'lucide-react';
import InteractiveTable from '../common/InteractiveTable';
import SupplierModal from './SupplierModal';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppStore } from '../../stores/useAppStore';
import { createSupplier, updateSupplier } from '../../services/databaseService';

const SuppliersList: React.FC<{
    suppliers: Supplier[];
    setSuppliers: (updater: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;
    setActiveView: (view: string) => void;
}> = ({ suppliers: allSuppliers, setSuppliers, setActiveView }) => {
    const { t, lang } = useLocalization();
    const { hasPermission } = usePermissions();
    const { currentUser, setLoggedInSupplier, addSupplier, updateSupplier: updateSupplierInStore, purchaseOrders, openRecordPaymentModal } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const { addToast } = useToast();

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

    const suppliers = useMemo(() => allSuppliers.filter(s => s.companyId === currentUser?.companyId), [allSuppliers, currentUser]);

    const handleAddNew = () => {
        setSelectedSupplier(null);
        setIsModalOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (supplierId: string) => {
        setSupplierToDelete(supplierId);
        setConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (supplierToDelete) {
            // TODO: Call database service to delete
            setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete));
            addToast(t('supplier_deleted_success'), 'success');
        }
        setConfirmModalOpen(false);
        setSupplierToDelete(null);
    };
    
    const handleSave = async (supplierData: Omit<Supplier, 'id' | 'companyId'> & { id?: string }) => {
        if (!currentUser) return;
        try {
            if (supplierData.id) { // Editing existing
                const updated = await updateSupplier(supplierData.id, supplierData);
                updateSupplierInStore(updated);
                addToast(t('supplier_updated_success'), 'success');
            } else { // Adding new
                const newSupplierWithId: Supplier = {
                    ...supplierData,
                    id: `sup-${Date.now().toString().slice(-8)}`,
                    companyId: currentUser.companyId,
                };
                const newSupplier = await createSupplier(newSupplierWithId);
                addSupplier(newSupplier);
                addToast(t('supplier_saved_success'), 'success');
            }
            setIsModalOpen(false);
        } catch(error) {
            console.error(error);
            addToast(t('failed_to_save_supplier'), 'error');
        }
    };
    
    const handleViewPortal = (supplier: Supplier) => {
        setLoggedInSupplier(supplier);
        setActiveView('supplier-portal');
    };

    const handleCopyLink = (supplier: Supplier) => {
        const url = `${window.location.origin}${window.location.pathname}?portal=supplier&id=${supplier.id}`;
        navigator.clipboard.writeText(url);
        addToast(t('link_copied_to_clipboard'), 'success');
    };

    const supplierStats = useMemo(() => {
        const stats = new Map<string, { poCount: number }>();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        purchaseOrders.forEach(po => {
            if (new Date(po.date) >= thirtyDaysAgo) {
                const supplier = suppliers.find(s => s.name === po.supplierName);
                if(supplier) {
                    const currentStats = stats.get(supplier.id) || { poCount: 0 };
                    currentStats.poCount++;
                    stats.set(supplier.id, currentStats);
                }
            }
        });
        return stats;
    }, [purchaseOrders, suppliers]);


    const columns = useMemo(() => [
        { Header: t('supplier_name'), accessor: 'name', width: 250 },
        { Header: t('phone'), accessor: 'phone', width: 150 },
        { Header: t('contact_person'), accessor: 'contactPerson', width: 200 },
        { Header: t('total_debt'), accessor: 'totalDebt', width: 150, Cell: ({ row }: { row: Supplier }) => <span className={row.totalDebt > 0 ? 'text-red-500 font-semibold' : ''}>{row.totalDebt.toLocaleString('en-US')} {lang === 'ar' ? 'р.с' : 'SAR'}</span>},
        { Header: t('recent_pos'), accessor: 'recent_pos', width: 150, Cell: ({ row }: { row: Supplier }) => supplierStats.get(row.id)?.poCount || 0 },
        {
            Header: t('actions'),
            accessor: 'actions',
            width: 200,
            Cell: ({ row }: { row: Supplier }) => (
                hasPermission('manage_purchases') && (
                    <div className="flex items-center justify-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openRecordPaymentModal(row.id, 'payable'); }} className="p-2 text-muted-foreground hover:text-green-500 transition-colors" title={t('record_payment')}><CreditCard size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleViewPortal(row); }} className="p-2 text-muted-foreground hover:text-blue-500 transition-colors" title={t('view_supplier_portal')}><UserSquare2 size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleCopyLink(row); }} className="p-2 text-muted-foreground hover:text-purple-500 transition-colors" title={t('copy_portal_link')}><LinkIcon size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="p-2 text-muted-foreground hover:text-primary transition-colors" title={t('edit')}><Edit size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id); }} className="p-2 text-muted-foreground hover:text-red-500 transition-colors" title={t('delete')}><Trash2 size={18} /></button>
                    </div>
                )
            ),
        }
    ], [t, lang, hasPermission, supplierStats, openRecordPaymentModal]);

    return (
        <div className="h-full flex flex-col gap-4">
            <SupplierModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                supplier={selectedSupplier}
            />

            <ConfirmationModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('delete_supplier')}
                message={t('delete_supplier_confirm')}
            />

            {hasPermission('manage_purchases') && (
                <div className="flex justify-end">
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={20} />
                        <span>{t('add_new_supplier')}</span>
                    </button>
                </div>
            )}
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={suppliers} setData={setSuppliers} />
            </div>
        </div>
    );
};

export default SuppliersList;