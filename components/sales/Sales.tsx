

import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { CreateInvoiceForm } from './CreateInvoiceForm';
import SalesInvoicesList from './SalesInvoicesList';
import SalesReports from './SalesReports';
import SalesReturns from './SalesReturns';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../utils/permissions';
import SalesAnalysis from './SalesAnalysis';
import CreateQuotationForm from './CreateQuotationForm';
import QuotationsList from './QuotationsList';
import Promotions from './promotions/Promotions';


const Sales: React.FC = () => {
  const { t } = useLocalization();
  const { sales, setSales, salesActiveTab, setSalesActiveTab } = useAppStore();
  const { hasPermission } = usePermissions();

  const allTabs: { id: string; label: string; permission: Permission }[] = [
    { id: 'create', label: t('create_invoice'), permission: 'manage_sales' },
    { id: 'invoices', label: t('sales_invoices_list'), permission: 'view_sales' },
    { id: 'create_quotation', label: t('create_quotation'), permission: 'manage_sales' },
    { id: 'quotations', label: t('quotations'), permission: 'view_sales' },
    { id: 'promotions', label: t('promotions'), permission: 'manage_sales' },
    { id: 'summary', label: t('sales_summary'), permission: 'view_sales' },
    { id: 'analysis', label: t('invoice_analysis'), permission: 'view_sales' },
    { id: 'returns', label: t('sales_returns'), permission: 'manage_sales' },
  ];

  const tabs = allTabs.filter(tab => hasPermission(tab.permission));
  
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === salesActiveTab)) {
        setSalesActiveTab(tabs[0].id);
    }
  }, [tabs, salesActiveTab, setSalesActiveTab]);


  const renderContent = () => {
    switch (salesActiveTab) {
      case 'create':
        return <CreateInvoiceForm setActiveTab={setSalesActiveTab} />;
      case 'invoices':
        return <SalesInvoicesList sales={sales} setSales={setSales} setActiveTab={setSalesActiveTab} />;
      case 'create_quotation':
        return <CreateQuotationForm setActiveTab={setSalesActiveTab} />;
      case 'quotations':
        return <QuotationsList setActiveTab={setSalesActiveTab} />;
      case 'promotions':
        return <Promotions />;
      case 'summary':
        return <SalesReports />;
      case 'analysis':
        return <SalesAnalysis />;
      case 'returns':
        return <SalesReturns />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold">{t('sales')}</h1>

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSalesActiveTab(tab.id)}
              className={`${
                salesActiveTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              title={tab.id === 'create' ? '(Ctrl + I)' : ''}
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

export default Sales;