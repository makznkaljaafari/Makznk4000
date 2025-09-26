


import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import ChartOfAccounts from './ChartOfAccounts';
import JournalEntries from './JournalEntries';
import Ledger from './Ledger';
import FinancialReports from './FinancialReports';
import InvoicesVouchers from './InvoicesVouchers';
import PostingAndClosing from './PostingAndClosing';
import EntryReview from './EntryReview';

const Accounting: React.FC = () => {
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState('chart_of_accounts');

  const tabs = [
    { id: 'chart_of_accounts', label: t('chart_of_accounts') },
    { id: 'journal_entries', label: t('journal_entries') },
    { id: 'invoices_vouchers', label: t('invoices_vouchers') },
    { id: 'entry_review', label: t('entry_review') },
    { id: 'ledgers', label: t('ledgers') },
    { id: 'financial_reports_accounting', label: t('financial_reports_accounting') },
    { id: 'posting_closing', label: t('posting_closing') },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'chart_of_accounts':
        return <ChartOfAccounts />;
      case 'journal_entries':
        return <JournalEntries />;
      case 'invoices_vouchers':
        return <InvoicesVouchers />;
      case 'ledgers':
        return <Ledger />;
      case 'financial_reports_accounting':
        return <FinancialReports />;
      case 'posting_closing':
        return <PostingAndClosing />;
      case 'entry_review':
        return <EntryReview />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold">{t('accounting')}</h1>
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

export default Accounting;
