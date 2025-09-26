import React, { useState, useMemo } from 'react';
import { useLocalization } from '../../../hooks/useLocalization';
import { useAppStore } from '../../../stores/useAppStore';
import InteractiveTable from '../../common/InteractiveTable';
import { Promotion } from '../../../types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import PromotionModal from './PromotionModal';
import { useToast } from '../../../contexts/ToastContext';
import ConfirmationModal from '../../common/ConfirmationModal';
import { usePermissions } from '../../../hooks/usePermissions';

const Promotions: React.FC = () => {
    const { t } = useLocalization();
    const { hasPermission } = usePermissions();
    const { promotions, setPromotions, currentUser } = useAppStore();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [promotionToDelete, setPromotionToDelete] = useState<string | null>(null);

    const promotionsForCompany = useMemo(() => promotions.filter(p => p.companyId === currentUser?.companyId), [promotions, currentUser]);

    const handleAddNew = () => {
        setEditingPromotion(null);
        setIsModalOpen(true);
    };

    const handleEdit = (promo: Promotion) => {
        setEditingPromotion(promo);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (promoId: string) => {
        setPromotionToDelete(promoId);
    };
    
    const handleConfirmDelete = () => {
        if(promotionToDelete) {
            setPromotions(prev => prev.filter(p => p.id !== promotionToDelete));
            addToast(t('promotion_deleted_success'), 'success');
        }
        setPromotionToDelete(null);
    };

    const handleSave = (promoData: Omit<Promotion, 'id' | 'companyId'> & { id?: string }) => {
        if(!currentUser) return;
        const newPromo: Promotion = {
            ...promoData,
            id: promoData.id || `promo-${Date.now()}`,
            companyId: currentUser.companyId,
            isActive: promoData.isActive === undefined ? true : promoData.isActive,
        };

        setPromotions(prev => {
            const exists = prev.some(p => p.id === newPromo.id);
            if (exists) {
                return prev.map(p => p.id === newPromo.id ? newPromo : p);
            }
            return [newPromo, ...prev];
        });
        
        addToast(promoData.id ? t('promotion_updated_success') : t('promotion_created_success'), 'success');
        setIsModalOpen(false);
    };

    const columns = useMemo(() => [
        { Header: t('promotion_name'), accessor: 'name', width: 300 },
        { Header: t('type'), accessor: 'type', width: 150, Cell: ({row}: {row: Promotion}) => t(row.type) },
        { Header: t('value'), accessor: 'value', width: 100 },
        { Header: t('applicable_to'), accessor: 'applicableTo', width: 200, Cell: ({row}: {row: Promotion}) => t(row.applicableTo) },
        { Header: t('start_date'), accessor: 'startDate', width: 150 },
        { Header: t('end_date'), accessor: 'endDate', width: 150 },
        { Header: t('status'), accessor: 'isActive', width: 100, Cell: ({row}: {row: Promotion}) => (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {row.isActive ? t('active') : t('inactive')}
            </span>
        )},
        { Header: t('actions'), accessor: 'actions', width: 100, Cell: ({ row }: { row: Promotion }) => (
            <div className="flex items-center justify-center gap-2">
                <button onClick={() => handleEdit(row)} className="p-1 text-primary"><Edit size={16}/></button>
                <button onClick={() => handleDeleteClick(row.id)} className="p-1 text-red-500"><Trash2 size={16}/></button>
            </div>
        )}
    ], [t]);

    return (
        <div className="h-full flex flex-col gap-4">
            <PromotionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} promotion={editingPromotion} />
            <ConfirmationModal isOpen={!!promotionToDelete} onClose={() => setPromotionToDelete(null)} onConfirm={handleConfirmDelete} title={t('delete_promotion')} message={t('delete_promotion_confirm')} />

            {hasPermission('manage_sales') && (
                <div className="flex justify-end">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90">
                        <Plus size={20} />
                        <span>{t('add_new_promotion')}</span>
                    </button>
                </div>
            )}
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={promotionsForCompany} setData={setPromotions as any} />
            </div>
        </div>
    );
};

export default Promotions;