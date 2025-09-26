

import React, { useState, useMemo, useCallback } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Part, Warehouse, InventoryMovement } from '../../types';
import Card from '../common/Card';
import InteractiveTable from '../common/InteractiveTable';
import { useToast } from '../../contexts/ToastContext';
import { FileEdit, Play, CheckSquare, X, Camera } from 'lucide-react';
import BarcodeScanner from '../common/BarcodeScanner';

interface AuditItem {
    id: string; // partId is the unique key here
    partId: string;
    name: string;
    partNumber: string;
    systemQty: number;
    actualQty: number | null;
}

const InventoryAudit: React.FC = () => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { 
        parts, 
        warehouses, 
        inventoryMovements, 
        setInventoryMovements, 
        setParts,
        currentUser 
    } = useAppStore();

    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || '');
    const [activeAudit, setActiveAudit] = useState<AuditItem[] | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanFilter, setScanFilter] = useState<string | null>(null);

    const calculateStockForWarehouse = useCallback((partId: string, warehouseId: string): number => {
        return inventoryMovements
            .filter(m => m.partId === partId && m.warehouseId === warehouseId)
            .reduce((sum, m) => sum + m.quantity, 0);
    }, [inventoryMovements]);

    const handleStartAudit = () => {
        if (!selectedWarehouseId) {
            addToast(t('please_select_warehouse'), 'warning');
            return;
        }
        
        const auditItems: AuditItem[] = parts.map(part => ({
            id: part.id,
            partId: part.id,
            name: part.name,
            partNumber: part.partNumber,
            systemQty: calculateStockForWarehouse(part.id, selectedWarehouseId),
            actualQty: null,
        }));
        
        setActiveAudit(auditItems);
        setScanFilter(null);
    };

    const handleItemChange = (partId: string, value: string) => {
        const newQty = value === '' ? null : parseInt(value, 10);
        if (activeAudit) {
            setActiveAudit(prevAudit => 
                prevAudit!.map(item => 
                    item.partId === partId ? { ...item, actualQty: isNaN(newQty!) ? null : newQty } : item
                )
            );
        }
    };
    
    const handleCancelAudit = () => {
        setActiveAudit(null);
        setScanFilter(null);
    }
    
    const handleFinalizeAudit = () => {
        if (!activeAudit || !currentUser) return;
        
        const changes = activeAudit.filter(item => item.actualQty !== null && item.actualQty !== item.systemQty);

        if (changes.length === 0) {
            addToast(t('no_changes_to_record'), 'info');
            setActiveAudit(null);
            return;
        }

        const newMovements: InventoryMovement[] = changes.map(item => {
            const difference = (item.actualQty ?? item.systemQty) - item.systemQty;
            return {
                id: `im-adj-${item.partId}-${Date.now()}`,
                companyId: currentUser.companyId,
                date: new Date().toISOString().split('T')[0],
                partId: item.partId,
                warehouseId: selectedWarehouseId,
                type: 'Adjustment',
                quantity: difference,
                notes: t('inventory_audit_adjustment'),
            };
        });

        const stockUpdates = new Map<string, number>();
        newMovements.forEach(m => {
            stockUpdates.set(m.partId, (stockUpdates.get(m.partId) || 0) + m.quantity);
        });

        setInventoryMovements(prev => [...prev, ...newMovements]);
        
        setParts(prevParts => prevParts.map(part => 
            stockUpdates.has(part.id) 
            ? { ...part, stock: part.stock + (stockUpdates.get(part.id) || 0) } 
            : part
        ));

        addToast(t('inventory_audit_complete_success', { count: changes.length }), 'success');
        setActiveAudit(null);
        setScanFilter(null);
    };

    const handleBarcodeScan = (scannedValue: string) => {
        setIsScannerOpen(false);
        if (activeAudit) {
            const itemExists = activeAudit.some(item => item.partNumber === scannedValue);
            if (itemExists) {
                setScanFilter(scannedValue);
                addToast(t('focus_on_scanned_item'), 'info');
            } else {
                addToast(t('part_not_found_from_scan'), 'warning');
            }
        }
    };

    const displayedAuditItems = useMemo(() => {
        if (!activeAudit) return [];
        if (scanFilter) {
            return activeAudit.filter(item => item.partNumber === scanFilter);
        }
        return activeAudit;
    }, [activeAudit, scanFilter]);


    const columns = useMemo(() => [
        { Header: t('part_name'), accessor: 'name', width: 300 },
        { Header: t('part_number'), accessor: 'partNumber', width: 150 },
        { Header: t('system_quantity'), accessor: 'systemQty', width: 150, Cell: ({row}: {row: AuditItem}) => <div className="text-center font-bold">{row.systemQty}</div>},
        { Header: t('actual_quantity'), accessor: 'actualQty', width: 150, Cell: ({row}: {row: AuditItem}) => (
            <input 
                type="number"
                className="w-full p-1 text-center bg-input rounded-md"
                value={row.actualQty ?? ''}
                onChange={(e) => handleItemChange(row.partId, e.target.value)}
                min="0"
            />
        )},
        { Header: t('difference'), width: 150, Cell: ({row}: {row: AuditItem}) => {
            if (row.actualQty === null) return <div className="text-center">-</div>;
            const diff = row.actualQty - row.systemQty;
            const color = diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground';
            return <div className={`text-center font-bold ${color}`}>{diff > 0 ? `+${diff}` : diff}</div>
        }},
    ], [t]);


    if (!activeAudit) {
        if (warehouses.length === 0) {
            return (
                <Card className="h-full flex flex-col items-center justify-center text-center">
                    <h2 className="text-2xl font-bold text-muted-foreground">{t('no_warehouses_found')}</h2>
                    <p className="mt-2 text-muted-foreground">{t('add_warehouse_to_start')}</p>
                </Card>
            );
        }

        return (
            <Card className="h-full flex flex-col items-center justify-center text-center">
                <FileEdit size={64} className="text-primary/50 mb-4" />
                <h2 className="text-2xl font-bold">{t('inventory_audit')}</h2>
                <p className="text-muted-foreground mt-2 mb-6 max-w-md">{t('inventory_audit_desc')}</p>
                <div className="w-full max-w-sm space-y-4">
                    <select 
                        value={selectedWarehouseId}
                        onChange={e => setSelectedWarehouseId(e.target.value)}
                        className="w-full p-3 bg-background border border-input rounded-lg"
                    >
                         {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <button 
                        onClick={handleStartAudit}
                        disabled={!selectedWarehouseId}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground font-bold rounded-lg text-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Play size={20}/>
                        <span>{t('start_audit_session')}</span>
                    </button>
                </div>
            </Card>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4">
            <BarcodeScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleBarcodeScan} />
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-2xl font-bold">{t('audit_in_progress')} - <span className="text-primary">{warehouses.find(w => w.id === selectedWarehouseId)?.name}</span></h2>
                <div className="flex gap-2">
                    <button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
                        <Camera size={18}/>{t('scan_barcode')}
                    </button>
                    <button onClick={handleCancelAudit} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700"><X size={18}/>{t('cancel')}</button>
                    <button onClick={handleFinalizeAudit} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"><CheckSquare size={18}/>{t('finalize_audit')}</button>
                </div>
            </div>
            {scanFilter && (
                 <div className="bg-primary/10 text-primary p-2 rounded-md flex justify-between items-center text-sm">
                    <span className="font-semibold">{t('filtering_by')} Barcode: {scanFilter}</span>
                    <button onClick={() => setScanFilter(null)} className="flex items-center gap-1 font-bold hover:bg-primary/20 p-1 rounded-full"><X size={16}/></button>
                </div>
            )}
            <div className="flex-grow">
                <InteractiveTable
                    columns={columns}
                    data={displayedAuditItems}
                    setData={(dataUpdater) => {
                        if (typeof dataUpdater === 'function' && activeAudit) {
                           const updatedAudit = dataUpdater(activeAudit);
                           // To handle sorting/reordering, we need to merge changes back
                           const updatedMap = new Map(updatedAudit.map(i => [i.id, i]));
                           setActiveAudit(activeAudit.map(item => updatedMap.get(item.id) || item));
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default InventoryAudit;
