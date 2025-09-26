

import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../utils/permissions';
import ItemList from './ItemList';
import CreatePartForm from './CreatePartForm';
import PartKitsManager from './PartKitsManager';
import PricingManagementTab from './PricingManagementTab';
import InventoryAudit from './InventoryAudit';
import WarehouseReports from '../warehouses/WarehouseReports';
import StoreTransfers from '../warehouses/StoreTransfers';
import InventoryMovementsList from '../warehouses/InventoryMovementsList';
import InventoryAnalysis from './InventoryAnalysis';
import { useAppStore } from '../../stores/useAppStore';
import KitAssembly from './KitAssembly';

const Inventory: React.FC = () => {
    const { t } = useLocalization();
    const { hasPermission } = usePermissions();
    const { inventoryFilter } = useAppStore();

    const allTabs: { id: string; label: string; permission: Permission;}[] = [
        { id: 'list', label: t('item_list'), permission: 'view_warehouses' },
        { id: 'add_new_item', label: t('add_new_item'), permission: 'manage_inventory' },
        { id: 'kits_manager', label: t('kits_manager'), permission: 'manage_inventory' },
        { id: 'kit_assembly', label: t('kit_assembly'), permission: 'manage_inventory' },
        { id: 'pricing_management', label: t('pricing_management'), permission: 'manage_inventory' },
        { id: 'inventory_audit', label: t('inventory_audit'), permission: 'manage_inventory' },
        { id: 'analysis', label: t('inventory_analysis'), permission: 'view_reports' },
        { id: 'movements', label: t('inventory_movements'), permission: 'view_warehouses' },
        { id: 'transfers', label: t('store_transfers'), permission: 'manage_inventory' },
        { id: 'reports', label: t('warehouse_reports'), permission: 'view_reports' },
    ];

    const availableTabs = allTabs.filter(tab => hasPermission(tab.permission));
    const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || 'list');

    useEffect(() => {
        if (inventoryFilter) {
            setActiveTab('list');
        }
    }, [inventoryFilter]);

    const renderContent = () => {
        switch (activeTab) {
            case 'list': return <ItemList setActiveTab={setActiveTab} />;
            case 'add_new_item': return <CreatePartForm setActiveTab={setActiveTab} />;
            case 'kits_manager': return <PartKitsManager />;
            case 'kit_assembly': return <KitAssembly />;
            case 'pricing_management': return <PricingManagementTab />;
            case 'inventory_audit': return <InventoryAudit />;
            case 'analysis': return <InventoryAnalysis />;
            case 'movements': return <InventoryMovementsList />;
            case 'transfers': return <StoreTransfers />;
            case 'reports': return <WarehouseReports />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <h1 className="text-3xl font-bold">{t('inventory')}</h1>
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {availableTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default Inventory;
