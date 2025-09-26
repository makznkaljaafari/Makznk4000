
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import ToggleSwitch from '../common/ToggleSwitch';
import { WarehouseSettings, Part } from '../../types';
import { Save, RotateCw, Archive, Package, Barcode, Calculator, FileEdit, Plus, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

// Reusable Setting Block Component
const SettingBlock: React.FC<{ title: string; description: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, description, icon, children }) => (
    <div className="p-6 border border-border rounded-lg bg-muted/30">
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-prose">{description}</p>
            </div>
        </div>
        <div className="pt-4 mt-4 border-t border-border/50">{children}</div>
    </div>
);


const WarehouseSettingsComponent: React.FC = () => {
    const { t } = useLocalization();
    const { 
        warehouses, 
        warehouseSettings, 
        setWarehouseSettings, 
        parts, 
        inventoryMovements, 
        setParts,
        setInventoryMovements,
        setArchivedInventoryMovements
    } = useAppStore();
    const { addToast } = useToast();
    const [localSettings, setLocalSettings] = useState<WarehouseSettings>(warehouseSettings);
    const [archiveDate, setArchiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [newReason, setNewReason] = useState('');

    useEffect(() => {
        setLocalSettings(warehouseSettings);
    }, [warehouseSettings]);

    const handleSettingChange = (key: keyof WarehouseSettings, value: any) => {
        setLocalSettings(prev => ({...prev, [key]: value}));
    }
    
    const handleReasonChange = (reasons: string[]) => {
        setLocalSettings(prev => ({ ...prev, inventoryAdjustmentReasons: reasons }));
    };

    const handleAddReason = () => {
        if (newReason.trim() && !localSettings.inventoryAdjustmentReasons.includes(newReason.trim())) {
            handleReasonChange([...localSettings.inventoryAdjustmentReasons, newReason.trim()]);
            setNewReason('');
        }
    };
    
    const handleRemoveReason = (reasonToRemove: string) => {
        handleReasonChange(localSettings.inventoryAdjustmentReasons.filter(r => r !== reasonToRemove));
    };

    const handleSaveSettings = () => {
        setWarehouseSettings(localSettings);
        addToast(t('settings_saved_success'), 'success');
    }

    const handleRecalculateStock = () => {
        if(window.confirm(t('recalculate_stock_balances_confirm'))) {
            const newParts = parts.map(p => ({...p, stock: 0}));
            const partsMap = new Map(newParts.map(p => [p.id, p]));

            inventoryMovements.forEach(movement => {
                const part = partsMap.get(movement.partId);
                if(part) {
                    (part as Part).stock += movement.quantity;
                }
            });

            setParts(Array.from(partsMap.values()));
            addToast(t('recalculation_complete'), 'success');
        }
    };
    
    const handleArchiveAction = () => {
        const date = new Date(archiveDate);
        date.setHours(0,0,0,0);

        const movementsToArchive = inventoryMovements.filter(m => new Date(m.date) < date);
        
        if (movementsToArchive.length === 0) {
            addToast(t('archive_no_movements'), 'warning');
            return;
        }

        const confirmMessage = t('archive_confirm', { count: movementsToArchive.length });
        if(window.confirm(confirmMessage)) {
            const movementsToKeep = inventoryMovements.filter(m => new Date(m.date) >= date);
            
            setInventoryMovements(movementsToKeep);
            setArchivedInventoryMovements(prevArchived => [...prevArchived, ...movementsToArchive]);
            
            addToast(t('archive_success', { count: movementsToArchive.length }), 'success');
        }
    };

    return (
        <Card>
            <div className="p-6">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">{t('inventory_settings')}</h2>
                    </div>
                    <button onClick={handleSaveSettings} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors text-base font-semibold">
                        <Save size={18} />
                        <span>{t('save_settings')}</span>
                    </button>
                </div>
                <div className="space-y-8">
                
                    <SettingBlock title={t('general_operation_settings')} description={t('general_operation_settings_desc')} icon={<Package size={20}/>}>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="default-warehouse" className="text-md font-semibold text-foreground">{t('default_warehouse_for_operations')}</label>
                                <select id="default-warehouse" value={localSettings.defaultWarehouseId || ''} onChange={e => handleSettingChange('defaultWarehouseId', e.target.value)} className="mt-2 block w-full max-w-md bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                                    <option value="" disabled>{t('select_default_warehouse')}</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <div><h4 className="text-md font-semibold">{t('enable_low_stock_alerts')}</h4><p className="text-sm text-muted-foreground">{t('low_stock_alerts_desc')}</p></div>
                                <ToggleSwitch enabled={localSettings.enableLowStockAlerts} onChange={v => handleSettingChange('enableLowStockAlerts', v)} aria-label={t('enable_low_stock_alerts')}/>
                            </div>
                            <div className="flex items-center justify-between">
                                <div><h4 className="text-md font-semibold">{t('auto_deduct_stock_on_sale')}</h4><p className="text-sm text-muted-foreground">{t('auto_deduct_stock_on_sale_desc')}</p></div>
                                <ToggleSwitch enabled={localSettings.autoDeductStockOnSale} onChange={v => handleSettingChange('autoDeductStockOnSale', v)} aria-label={t('auto_deduct_stock_on_sale')}/>
                            </div>
                        </div>
                    </SettingBlock>

                    <SettingBlock title={t('inventory_valuation_method')} description={t('inventory_valuation_method_desc')} icon={<Calculator size={20}/>}>
                         <select value={localSettings.inventoryValuationMethod} onChange={e => handleSettingChange('inventoryValuationMethod', e.target.value)} className="mt-2 block w-full max-w-md bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                            <option value="AverageCost">{t('average_cost')}</option>
                            <option value="FIFO">{t('fifo')}</option>
                            <option value="LIFO">{t('lifo')}</option>
                        </select>
                    </SettingBlock>
                    
                    <SettingBlock title={t('barcode_and_labels')} description={t('barcode_and_labels_desc')} icon={<Barcode size={20}/>}>
                        <div className="space-y-6">
                             <div className="flex items-center justify-between">
                                <div><h4 className="text-md font-semibold">{t('enable_barcode_scanning')}</h4><p className="text-sm text-muted-foreground">{t('enable_barcode_scanning_desc')}</p></div>
                                <ToggleSwitch enabled={localSettings.enableBarcodeScanning} onChange={v => handleSettingChange('enableBarcodeScanning', v)} aria-label={t('enable_barcode_scanning')}/>
                            </div>
                            <div>
                                <label htmlFor="barcode-symbology" className="text-md font-semibold text-foreground">{t('default_barcode_symbology')}</label>
                                <select id="barcode-symbology" value={localSettings.defaultBarcodeSymbology} onChange={e => handleSettingChange('defaultBarcodeSymbology', e.target.value)} className="mt-2 block w-full max-w-md bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                                    <option value="CODE128">Code 128</option>
                                    <option value="QR_CODE">QR Code</option>
                                    <option value="EAN13">EAN-13</option>
                                </select>
                            </div>
                        </div>
                    </SettingBlock>

                    <SettingBlock title={t('inventory_adjustments_settings')} description={t('inventory_adjustments_settings_desc')} icon={<FileEdit size={20}/>}>
                        <div>
                            <label className="text-md font-semibold text-foreground">{t('adjustment_reasons')}</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {localSettings.inventoryAdjustmentReasons.map(reason => (
                                    <span key={reason} className="flex items-center gap-1 bg-secondary text-secondary-foreground font-semibold px-3 py-1 rounded-full text-sm">
                                        {reason}
                                        <button onClick={() => handleRemoveReason(reason)} className="text-muted-foreground hover:text-foreground"><X size={14}/></button>
                                    </span>
                                ))}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddReason()} placeholder={t('add_reason_placeholder')} className="block w-full max-w-sm bg-background border border-input rounded-md py-2 px-3"/>
                                <button onClick={handleAddReason} className="flex-shrink-0 flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">{t('add_reason')}</button>
                            </div>
                        </div>
                    </SettingBlock>

                    <SettingBlock title={t('data_management')} description="" icon={<Archive size={20}/>}>
                         <div className="space-y-4">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-muted/50 rounded-lg gap-4">
                                <div><h4 className="font-semibold">{t('recalculate_stock_balances')}</h4><p className="text-xs text-muted-foreground">{t('recalculate_stock_balances_desc')}</p></div>
                                <button onClick={handleRecalculateStock} className="flex-shrink-0 flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg shadow hover:bg-amber-600 text-sm"><RotateCw size={16} /><span>{t('recalculate_stock_balances')}</span></button>
                            </div>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-muted/50 rounded-lg gap-4">
                                 <div><h4 className="font-semibold">{t('archive_old_movements')}</h4><p className="text-xs text-muted-foreground">{t('archive_old_movements_desc')}</p></div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <input type="date" value={archiveDate} onChange={e => setArchiveDate(e.target.value)} className="bg-background border border-input rounded-md py-1.5 px-3 sm:text-sm"/>
                                    <button onClick={handleArchiveAction} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm"><Archive size={16} /><span>{t('run_archive')}</span></button>
                                </div>
                            </div>
                        </div>
                    </SettingBlock>
                </div>
            </div>
        </Card>
    );
};

export default WarehouseSettingsComponent;