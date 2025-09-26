

import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { CreatePurchaseInvoiceForm } from './CreatePOForm';
import PurchaseInvoicesList from './PurchaseOrdersList';
import SuppliersList from './SuppliersList';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../utils/permissions';
import PurchaseReturns from './PurchaseReturns';


const Purchases: React.FC<{ setActiveView: (view: string) => void; }> = ({ setActiveView }) => {
  const { t } = useLocalization();
  const { purchaseOrders, setPurchaseOrders, suppliers, setSuppliers, purchasesActiveTab, setPurchasesActiveTab } = useAppStore();
  const { hasPermission } = usePermissions();

  const allTabs: { id: string, label: string, permission: Permission }[] = [
    { id: 'create', label: t('create_purchase_order'), permission: 'manage_purchases' },
    { id: 'orders', label: t('purchase_orders'), permission: 'view_purchases' },
    { id: 'suppliers', label: t('suppliers'), permission: 'manage_purchases' },
    { id: 'returns', label: t('purchase_returns'), permission: 'manage_purchases' },
  ];
  
  const tabs = allTabs.filter(tab => hasPermission(tab.permission));

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === purchasesActiveTab)) {
        setPurchasesActiveTab(tabs[0].id);
    }
  }, [tabs, purchasesActiveTab, setPurchasesActiveTab]);

  const renderContent = () => {
    switch (purchasesActiveTab) {
      case 'create':
        return <CreatePurchaseInvoiceForm setActiveTab={setPurchasesActiveTab} />;
      case 'orders':
        return <PurchaseInvoicesList purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} setActiveTab={setPurchasesActiveTab} />;
      case 'suppliers':
        return <SuppliersList suppliers={suppliers} setSuppliers={setSuppliers} setActiveView={setActiveView} />;
      case 'returns':
        return <PurchaseReturns />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold">{t('purchases')}</h1>

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPurchasesActiveTab(tab.id)}
              className={`${
                purchasesActiveTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              title={tab.id === 'create' ? '(Ctrl + P)' : ''}
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

export default Purchases;