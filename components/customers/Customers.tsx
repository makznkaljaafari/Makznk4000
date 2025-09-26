import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import CustomerList from './CustomerList';
import CustomerReports from './CustomerReports';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../utils/permissions';

const Customers: React.FC<{ setActiveView: (view: string) => void; }> = ({ setActiveView }) => {
  const { t } = useLocalization();
  const { hasPermission } = usePermissions();
  const { customerListFilter, setCustomerListFilter } = useAppStore();

  const allTabs: { id: string, label: string, permission: Permission }[] = [
    { id: 'list', label: t('customer_list'), permission: 'view_customers' },
    { id: 'reports', label: t('customer_reports'), permission: 'view_reports' },
  ];
  
  const tabs = allTabs.filter(tab => hasPermission(tab.permission));

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'list');
  
  useEffect(() => {
     if (customerListFilter) {
      setActiveTab('list');
    }
  }, [customerListFilter]);
  
   useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
        setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);
  
  const handleTabChange = (tabId: string) => {
    if (activeTab === 'list' && tabId !== 'list') {
      setCustomerListFilter(null);
    }
    setActiveTab(tabId);
  }


  const renderContent = () => {
    switch(activeTab) {
        case 'list': return <CustomerList setActiveView={setActiveView} />;
        case 'reports': return <CustomerReports />;
        default: return null;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold">{t('customers')}</h1>
        <div className="border-b border-border">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
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

export default Customers;