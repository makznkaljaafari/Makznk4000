
import React, { useState, useEffect } from 'react';
import { PartKit, Part } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { PartSearchModal, SearchableItem } from '../common/PartSearchModal';

type KitItem = PartKit['items'][0] & {
    name: string;
};

const PartKitModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (kitData: Omit<PartKit, 'id' | 'companyId'> & { id?: string }) => void;
    kit: PartKit | null;
}> = ({ isOpen, onClose, onSave, kit }) => {
    const { t } = useLocalization();
    const { parts, partKits } = useAppStore();

    const [name, setName] = useState('');
    const [items, setItems] = useState<KitItem[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const partsMap = React.useMemo(() => new Map(parts.map(p => [p.id, p])), [parts]);

    useEffect(() => {
        if (kit) {
            setName(kit.name);
            const detailedItems = kit.items.map(item => {
                const part = partsMap.get(item.partId) as Part | undefined;
                return {
                    ...item,
                    name: part?.name || 'Unknown Part'
                };
            });
            setItems(detailedItems);
        } else {
            setName('');
            setItems([]);
        }
    }, [kit, isOpen, partsMap]);
    
    const handleSave = () => {
        if (!name.trim() || items.length === 0) return;
        const kitData = {
            id: kit?.id,
            name,
            items: items.map(({ partId, quantity }) => ({ partId, quantity }))
        };
        onSave(kitData);
    };
    
    const handleSelectItem = (item: SearchableItem) => {
        if(item.type === 'kit') return; // Cannot add a kit to a kit

        if (!items.some(i => i.partId === item.id)) {
            setItems(prev => [...prev, { partId: item.id, name: item.name, quantity: 1 }]);
        }
        setIsSearchOpen(false);
    };
    
    const updateItemQuantity = (partId: string, quantity: number) => {
        setItems(prev => prev.map(item => item.partId === partId ? { ...item, quantity: Math.max(1, quantity) } : item));
    };

    const removeItem = (partId: string) => {
        setItems(prev => prev.filter(item => item.partId !== partId));
    };

    if (!isOpen) return null;

    return (
        <>
            <PartSearchModal 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
                onSelectItem={handleSelectItem} 
                parts={parts}
                partKits={partKits}
                priceType="sellingPrice"
            />
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl m-4 flex flex-col h-[80vh]">
                    <header className="p-4 border-b border-border flex justify-between items-center">
                        <h2 className="text-xl font-bold">{kit ? t('edit_kit') : t('create_new_kit')}</h2>
                        <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                    </header>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('kit_name')}</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2" />
                        </div>
                        <div>
                            <h3 className="text-md font-semibold mb-2">{t('kit_components')}</h3>
                            <div className="space-y-2">
                                {items.map(item => (
                                    <div key={item.partId} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                        <span className="flex-grow font-medium">{item.name}</span>
                                        <input type="number" value={item.quantity} onChange={e => updateItemQuantity(item.partId, parseInt(e.target.value, 10))} className="w-20 p-1 text-center bg-input rounded-md" min="1"/>
                                        <button onClick={() => removeItem(item.partId)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                             <button onClick={() => setIsSearchOpen(true)} className="mt-2 flex items-center gap-2 text-sm text-primary font-semibold">
                                <Plus size={16} /> {t('add_part_to_kit')}
                            </button>
                        </div>
                    </div>
                    <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">{t('save')}</button>
                    </footer>
                </div>
            </div>
        </>
    );
};
export default PartKitModal;
