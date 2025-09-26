


import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import AccountList from './AccountList';
import TransactionList from './TransactionList';
import NewTransactionForm from './NewTransactionForm';

const Banks: React.FC = () => {
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState('accounts');

  const tabs = [
    { id: 'accounts', label: t('financial_accounts') },
    { id: 'transactions', label: t('all_transactions') },
    { id: 'new_transaction', label: t('new_transaction') },
  ];

  const renderContent = () => {
    switch(activeTab) {
        case 'accounts': return <AccountList />;
        case 'transactions': return <TransactionList />;
        case 'new_transaction': return <NewTransactionForm onTransactionSuccess={() => setActiveTab('transactions')}/>
        default: return null;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold">{t('banks')}</h1>
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

export default Banks;