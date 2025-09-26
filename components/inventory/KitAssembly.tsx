
import React, { useState, useMemo, useCallback } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import Card from '../common/Card';
import { Part, PartKit } from '../../types';
import { Package, CheckSquare, AlertTriangle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const KitAssembly: React.FC = () => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { partKits, parts, inventoryMovements, assembleKit } = useAppStore();
    
    const [selectedKitId, setSelectedKitId] = useState<string>('');
    const [quantity, setQuantity] = useState(1);

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);

    const getStock = useCallback((partId: string) => {
        return inventoryMovements
            .filter(m => m.partId === partId)
            .reduce((sum, m) => sum + m.quantity, 0);
    }, [inventoryMovements]);

    const componentRequirements = useMemo(() => {
        if (!selectedKitId) return [];
        const kit = partKits.find(k => k.id === selectedKitId);
        if (!kit) return [];
        
        return kit.items.map(item => {
            const part = partsMap.get(item.partId);
            const availableStock = part ? getStock(part.id) : 0;
            const requiredStock = item.quantity * quantity;
            return {
                partId: item.partId,
                name: part?.name || 'Unknown Part',
                required: requiredStock,
                available: availableStock,
                sufficient: availableStock >= requiredStock,
            };
        });
    }, [selectedKitId, quantity, partKits, partsMap, getStock]);
    
    const canAssemble = componentRequirements.length > 0 && componentRequirements.every(c => c.sufficient);

    const handleAssemble = async () => {
        if (!canAssemble) {
            addToast(t('insufficient_stock_for_assembly'), 'error');
            return;
        }
        try {
            await assembleKit(selectedKitId, quantity);
            addToast(t('kit_assembly_success', { count: quantity }), 'success');
            // Reset form
            setSelectedKitId('');
            setQuantity(1);
        } catch (error) {
            addToast((error as Error).message, 'error');
        }
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">{t('kit_assembly')}</h2>
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('select_kit_to_assemble')}</label>
                        <select
                            value={selectedKitId}
                            onChange={e => setSelectedKitId(e.target.value)}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm p-2"
                        >
                            <option value="" disabled>{t('select_a_kit')}...</option>
                            {partKits.map(kit => (
                                <option key={kit.id} value={kit.id}>{kit.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('quantity_to_assemble')}</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min="1"
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm p-2"
                        />
                    </div>
                </div>
            </Card>

            {selectedKitId && (
                <Card className="p-6">
                    <h3 className="font-bold mb-4">{t('component_requirements')}</h3>
                    <div className="space-y-3">
                        {componentRequirements.map(req => (
                            <div key={req.partId} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                                <span className="font-medium">{req.name}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm">{t('required')}: {req.required}</span>
                                    <span className={`text-sm flex items-center gap-1 ${req.sufficient ? 'text-green-500' : 'text-red-500'}`}>
                                        {req.sufficient ? <CheckSquare size={14} /> : <AlertTriangle size={14} />}
                                        {t('available')}: {req.available}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleAssemble}
                    disabled={!canAssemble}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow disabled:opacity-50"
                >
                    <Package size={18} />
                    {t('assemble_kit')}
                </button>
            </div>
        </div>
    );
};
export default KitAssembly;
