import React, { useState, useEffect, useMemo } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { SlidersHorizontal, Building, DollarSign, Package, Users, Cog, DatabaseBackup, FileText, Shield, Bell, Search, Truck, Coins } from 'lucide-react';
import Card from './common/Card';
import AccountingSettingsComponent from './settings/AccountingSettings';
import CustomerSettingsComponent from './settings/CustomerSettings';
import WarehouseSettingsComponent from './settings/WarehouseSettings';
import UsersAndPermissions from './settings/UsersAndPermissions';
import GeneralSettings from './settings/GeneralSettings';
import CompanyProfileSettings from './settings/CompanyProfile';
import BackupRestore from './settings/BackupRestore';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../utils/permissions';
import DocumentSettings from './settings/DocumentSettings';
import SecuritySettings from './settings/SecuritySettings';
import NotificationSettings from './settings/NotificationSettings';
import PurchaseSettingsComponent from './settings/PurchaseSettings';
import ExchangeCompaniesSettings from './settings/ExchangeCompaniesSettings';
import CurrencyManagement from './settings/CurrencyManagement';


const Settings: React.FC = () => {
    const { t } = useLocalization();
    const { hasPermission } = usePermissions();
    const [searchTerm, setSearchTerm] = useState('');

    const allTabs: { id: string, label: string, icon: React.ElementType, component: React.ReactNode, permission: Permission }[] = [
        { id: 'general', label: t('general'), icon: Cog, component: <GeneralSettings />, permission: 'manage_settings' },
        { id: 'company_profile', label: t('company_profile'), icon: Building, component: <CompanyProfileSettings />, permission: 'manage_settings' },
        { id: 'users', label: t('users_and_roles'), icon: Users, component: <UsersAndPermissions />, permission: 'manage_users' },
        { id: 'security', label: t('security_settings'), icon: Shield, component: <SecuritySettings />, permission: 'manage_settings' },
        { id: 'notifications_settings', label: t('notification_settings'), icon: Bell, component: <NotificationSettings />, permission: 'manage_settings' },
        { id: 'documents', label: t('document_settings'), icon: FileText, component: <DocumentSettings />, permission: 'manage_settings' },
        { id: 'financial', label: t('financial_settings'), icon: DollarSign, component: <AccountingSettingsComponent />, permission: 'manage_accounting' },
        { id: 'currencies', label: t('currencies_and_exchange_rates'), icon: Coins, component: <CurrencyManagement />, permission: 'manage_banks' },
        { id: 'exchange_companies', label: t('exchange_companies'), icon: Coins, component: <ExchangeCompaniesSettings />, permission: 'manage_banks' },
        { id: 'inventory', label: t('inventory_settings'), icon: Package, component: <WarehouseSettingsComponent />, permission: 'manage_inventory' },
        { id: 'customers_settings', label: t('customers_settings_global'), icon: Users, component: <CustomerSettingsComponent />, permission: 'manage_customers' },
        { id: 'purchases_settings', label: t('purchase_settings'), icon: Truck, component: <PurchaseSettingsComponent />, permission: 'manage_purchases' },
        { id: 'backup_restore', label: t('backup_restore'), icon: DatabaseBackup, component: <BackupRestore />, permission: 'manage_settings' },
    ];
    
    const availableTabs = allTabs.filter(tab => hasPermission(tab.permission));

    const filteredTabs = useMemo(() => {
        if (!searchTerm) {
            return availableTabs;
        }
        return availableTabs.filter(tab =>
            t(tab.label).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, availableTabs, t]);

    const [activeTab, setActiveTab] = useState(filteredTabs[0]?.id || 'general');
    
    useEffect(() => {
        if (filteredTabs.length > 0 && !filteredTabs.find(t => t.id === activeTab)) {
            setActiveTab(filteredTabs[0].id);
        } else if (filteredTabs.length === 0) {
            // Optional: handle no results found state if needed
        }
    }, [filteredTabs, activeTab]);
    
    const activeComponent = useMemo(() => {
        const tab = filteredTabs.find(tab => tab.id === activeTab);
        return tab ? tab.component : null;
    }, [activeTab, filteredTabs]);


    return (
        <div className="h-full flex flex-col gap-6">
            <h1 className="text-3xl font-bold">{t('settings')}</h1>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0">
                <aside className="md:col-span-1">
                     <Card className="p-2 space-y-2">
                        <div className="relative p-2">
                           <Search className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground" size={18} />
                           <input 
                             type="text"
                             placeholder={t('search_settings')}
                             value={searchTerm}
                             onChange={e => setSearchTerm(e.target.value)}
                             className="w-full ps-10 p-2 bg-input border-border rounded-md text-sm"
                           />
                        </div>
                        <nav className="flex flex-col gap-1">
                            {filteredTabs.map(tab => (
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
                                    <span>{tab.label.includes('.') ? tab.label : t(tab.label)}</span>
                                </button>
                            ))}
                        </nav>
                    </Card>
                </aside>
                <main className="md:col-span-3 overflow-y-auto min-w-0">
                    {activeComponent}
                </main>
            </div>
        </div>
    );
};

export default Settings;