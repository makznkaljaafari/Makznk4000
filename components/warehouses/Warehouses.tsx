

import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import WarehouseList from './WarehouseList';
import InventoryMovementsList from './InventoryMovementsList';
import StoreTransfers from './StoreTransfers';
import WarehouseReports from './WarehouseReports';

const Warehouses: React.FC = () => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState('list');
    
    const tabs = [
        { id: 'list', label: t('store_list') },
        { id: 'movements', label: t('inventory_movements') },
        { id: 'transfers', label: t('store_transfers') },
        { id: 'reports', label: t('warehouse_reports') },
    ];
    
    const renderContent = () => {
        switch (activeTab) {
            case 'list': return <WarehouseList />;
            case 'movements': return <InventoryMovementsList />;
            case 'transfers': return <StoreTransfers />;
            case 'reports': return <WarehouseReports />;
            default: return null;
        }
    };
    
    return (
        <div className="space-y-6 h-full flex flex-col">
            <h1 className="text-3xl font-bold">{t('warehouses')}</h1>

            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
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

export default Warehouses;
