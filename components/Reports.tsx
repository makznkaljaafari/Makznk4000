

import React, { useState } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { AreaChart, FileText, PieChart, Users, Building, FileBarChart, Sliders, Briefcase, UserCheck } from 'lucide-react';
import FinancialReports from './accounting/FinancialReports';
import SalesReports from './sales/SalesReports';
import WarehouseReports from './warehouses/WarehouseReports';
import CustomerReports from './customers/CustomerReports';
import PurchaseReports from './reports/PurchaseReports';
import SupplierReports from './reports/SupplierReports';
import JournalEntriesReport from './reports/JournalEntriesReport';
import TaxReport from './reports/TaxReport';
import CustomReportBuilder from './reports/CustomReportBuilder';
import SalespersonPerformanceReport from './reports/SalespersonPerformanceReport';

const Reports: React.FC = () => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState('financial');

    const tabs = [
        { id: 'financial', label: t('financial_reports_accounting'), icon: AreaChart, component: <FinancialReports /> },
        { id: 'sales', label: t('sales_reports'), icon: PieChart, component: <SalesReports /> },
        { id: 'purchases', label: t('purchases_reports'), icon: Briefcase, component: <PurchaseReports /> },
        { id: 'customers', label: t('customer_reports'), icon: Users, component: <CustomerReports /> },
        { id: 'salespersons', label: t('salesperson_performance'), icon: UserCheck, component: <SalespersonPerformanceReport /> },
        { id: 'suppliers', label: t('suppliers_reports'), icon: Building, component: <SupplierReports /> },
        { id: 'entries', label: t('accounting_entries_reports'), icon: FileText, component: <JournalEntriesReport /> },
        { id: 'tax', label: t('tax_reports'), icon: FileBarChart, component: <TaxReport /> },
        { id: 'custom', label: t('custom_reports'), icon: Sliders, component: <CustomReportBuilder /> },
    ];

    const activeComponent = tabs.find(tab => tab.id === activeTab)?.component;

    return (
        <div className="flex flex-col h-full gap-6">
            <h1 className="text-3xl font-bold">{t('reports')}</h1>
            <div className="flex-grow flex flex-col md:flex-row gap-6 min-h-0">
                <aside className="md:w-64 flex-shrink-0 border-e border-border pe-4">
                    <nav className="flex flex-col gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors w-full text-start ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                            >
                                <tab.icon size={20} className="flex-shrink-0" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 overflow-y-auto min-w-0">
                    {activeComponent}
                </main>
            </div>
        </div>
    );
};

export default Reports;
