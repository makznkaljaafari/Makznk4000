
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import InteractiveTable from '../common/InteractiveTable';
import { PartKit, Part } from '../../types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import PartKitModal from './PartKitModal';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';

const PartKitsManager: React.FC = () => {
    const { t } = useLocalization();
    const { partKits, setPartKits, parts, currentUser } = useAppStore();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKit, setEditingKit] = useState<PartKit | null>(null);
    const [kitToDelete, setKitToDelete] = useState<string | null>(null);

    const kitsForCompany = useMemo(() => partKits.filter(pk => pk.companyId === currentUser?.companyId), [partKits, currentUser]);
    const partsMap = useMemo(() => new Map(parts.map(p => [p.id, p])), [parts]);

    const handleAddNew = () => {
        setEditingKit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (kit: PartKit) => {
        setEditingKit(kit);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (kitId: string) => {
        setKitToDelete(kitId);
    };
    
    const handleConfirmDelete = () => {
        if(kitToDelete) {
            setPartKits(prev => prev.filter(k => k.id !== kitToDelete));
            addToast(t('kit_deleted_success'), 'success');
        }
        setKitToDelete(null);
    };

    const handleSave = (kitData: Omit<PartKit, 'id' | 'companyId'> & { id?: string }) => {
        if(!currentUser) return;

        if (kitData.id) { // Editing
            setPartKits(prev => prev.map(k => k.id === kitData.id ? { ...k, ...kitData } as PartKit : k));
        } else { // Adding
            const newKit: PartKit = { ...kitData, id: `kit-${Date.now()}`, companyId: currentUser.companyId, items: kitData.items };
            setPartKits(prev => [newKit, ...prev]);
        }
        setIsModalOpen(false);
        addToast(t('kit_saved_success'), 'success');
    };

    const columns = useMemo(() => [
        { Header: t('kit_name'), accessor: 'name', width: 400 },
        { Header: t('number_of_items'), accessor: 'items', width: 200, Cell: ({row}: {row: PartKit}) => row.items.length },
        { 
            Header: t('total_price'), 
            accessor: 'total', 
            width: 200,
            Cell: ({row}: {row: PartKit}) => {
                const total = row.items.reduce((sum, item) => {
                    const part = partsMap.get(item.partId) as Part | undefined;
                    return sum + (part ? part.sellingPrice * item.quantity : 0);
                }, 0);
                return `${total.toLocaleString()} ${t('saudi_riyal')}`;
            }
        },
        { Header: t('actions'), accessor: 'actions', width: 150, Cell: ({ row }: { row: PartKit }) => (
            <div className="flex items-center justify-center gap-4">
                <button onClick={() => handleEdit(row)} className="text-primary hover:text-primary/80"><Edit size={18} /></button>
                <button onClick={() => handleDeleteClick(row.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
            </div>
        )}
    ], [t, partsMap]);

    return (
        <div className="h-full flex flex-col gap-4">
            <PartKitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} kit={editingKit} />
            <ConfirmationModal 
                isOpen={!!kitToDelete}
                onClose={() => setKitToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={t('delete_kit')}
                message={t('delete_kit_confirm')}
            />
            <div className="flex justify-end">
                <button onClick={handleAddNew} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90">
                    <Plus size={20} />
                    <span>{t('create_new_kit')}</span>
                </button>
            </div>
            <div className="flex-grow">
                <InteractiveTable columns={columns} data={kitsForCompany} setData={setPartKits as any} />
            </div>
        </div>
    );
};

export default PartKitsManager;
