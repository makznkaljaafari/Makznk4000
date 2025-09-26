
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Save, AlertTriangle, Briefcase, Calendar, Percent, Coins, BookOpen, HelpCircle } from 'lucide-react';
import { AccountingSettings, AccountType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import ToggleSwitch from '../common/ToggleSwitch';
import Tooltip from '../common/Tooltip';


const AccountSelector: React.FC<{
    label: string;
    tooltipText?: string;
    value: string;
    onChange: (value: string) => void;
    accountType?: AccountType;
    accounts: {id: string, name: string}[];
}> = ({ label, tooltipText, value, onChange, accounts }) => {
    const { t } = useLocalization();

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-1">
                <label className="block text-sm font-medium text-muted-foreground">{t(label)}</label>
                {tooltipText && (
                    <Tooltip text={t(tooltipText)}>
                         <HelpCircle size={14} className="text-muted-foreground cursor-help" />
                    </Tooltip>
                )}
            </div>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
            >
                <option value="" disabled>{t('select_account')}</option>
                {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                        {acc.id} - {acc.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

const SettingBlock: React.FC<{ title: string; description: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, description, icon, children }) => (
    <div className="p-6 border border-border rounded-lg bg-muted/30">
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-prose">{description}</p>
            </div>
        </div>
        <div className="pt-4 mt-4 border-t border-border/50">{children}</div>
    </div>
);

const AccountingSettingsComponent: React.FC = () => {
    const { t } = useLocalization();
    const { 
        accountingSettings, 
        setAccountingSettings,
        chartOfAccounts,
        currencies
    } = useAppStore();
    const { addToast } = useToast();

    const [localSettings, setLocalSettings] = useState<AccountingSettings>(accountingSettings);

    useEffect(() => {
        setLocalSettings(accountingSettings);
    }, [accountingSettings]);

    const handleSettingChange = (key: keyof AccountingSettings, value: any) => {
        setLocalSettings(prev => ({...prev, [key]: value}));
    }

    const handleSave = () => {
        setAccountingSettings(localSettings);
        addToast(t('settings_saved_success'), 'success');
    }

    const months = Array.from({length: 12}, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
    const days = Array.from({length: 31}, (_, i) => i + 1);
    
    const accounts = useMemo(() => ({
        Asset: chartOfAccounts.filter(a => a.type === 'Asset' && a.isActive),
        Liability: chartOfAccounts.filter(a => a.type === 'Liability' && a.isActive),
        Equity: chartOfAccounts.filter(a => a.type === 'Equity' && a.isActive),
        Revenue: chartOfAccounts.filter(a => a.type === 'Revenue' && a.isActive),
        Expense: chartOfAccounts.filter(a => a.type === 'Expense' && a.isActive),
    }), [chartOfAccounts]);

    return (
        <Card>
            <div className="p-6">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">{t('accounting_settings')}</h2>
                    </div>
                    <button onClick={handleSave} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors text-base font-semibold">
                        <Save size={18} />
                        <span>{t('save_settings')}</span>
                    </button>
                </div>
                <div className="space-y-8">
                     <SettingBlock title={t('fiscal_year_and_currency')} description={t('fiscal_year_desc')} icon={<Calendar size={20}/>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">{t('fiscal_year_start')}</label>
                                <div className="flex gap-2">
                                    <select value={localSettings.fiscalYearStartMonth} onChange={e => handleSettingChange('fiscalYearStartMonth', Number(e.target.value))} className="w-full bg-background border-input border rounded-md p-2">
                                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                    <select value={localSettings.fiscalYearStartDay} onChange={e => handleSettingChange('fiscalYearStartDay', Number(e.target.value))} className="w-full bg-background border-input border rounded-md p-2">
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <AccountSelector label="base_currency" value={localSettings.baseCurrencyId} onChange={v => handleSettingChange('baseCurrencyId', v)} accounts={currencies} />
                        </div>
                     </SettingBlock>
                    
                     <SettingBlock title={t('tax_settings')} description={t('tax_settings_desc')} icon={<Percent size={20}/>}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="font-medium text-foreground">{t('enable_vat_calculation')}</label>
                                <ToggleSwitch enabled={localSettings.isVatEnabled} onChange={v => handleSettingChange('isVatEnabled', v)} />
                            </div>
                            {localSettings.isVatEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground">{t('default_vat_rate_percent')}</label>
                                        <input type="number" value={localSettings.defaultVatRate * 100} onChange={e => handleSettingChange('defaultVatRate', Number(e.target.value)/100)} className="mt-1 w-full max-w-xs bg-background border border-input rounded-md p-2" />
                                    </div>
                                </div>
                            )}
                        </div>
                     </SettingBlock>
                    
                    <SettingBlock title={t('default_posting_accounts')} description={t('default_posting_accounts_desc')} icon={<Briefcase size={20}/>}>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AccountSelector label="default_ar_account" tooltipText="tooltip_default_ar_account" value={localSettings.defaultArAccountId || ''} onChange={v => handleSettingChange('defaultArAccountId', v)} accounts={accounts.Asset} />
                            <AccountSelector label="default_ap_account" tooltipText="tooltip_default_ap_account" value={localSettings.defaultApAccountId || ''} onChange={v => handleSettingChange('defaultApAccountId', v)} accounts={accounts.Liability} />
                            <AccountSelector label="default_sales_account" tooltipText="tooltip_default_sales_account" value={localSettings.defaultSalesAccountId || ''} onChange={v => handleSettingChange('defaultSalesAccountId', v)} accounts={accounts.Revenue} />
                            <AccountSelector label="default_sales_return_account" value={localSettings.defaultSalesReturnAccountId || ''} onChange={v => handleSettingChange('defaultSalesReturnAccountId', v)} accounts={accounts.Revenue} />
                            <AccountSelector label="default_cogs_account" tooltipText="tooltip_default_cogs_account" value={localSettings.defaultCogsAccountId || ''} onChange={v => handleSettingChange('defaultCogsAccountId', v)} accounts={accounts.Expense} />
                            <AccountSelector label="default_inventory_account" tooltipText="tooltip_default_inventory_account" value={localSettings.defaultInventoryAccountId || ''} onChange={v => handleSettingChange('defaultInventoryAccountId', v)} accounts={accounts.Asset} />
                            <AccountSelector label="default_vat_receivable_account" value={localSettings.defaultVatReceivableAccountId || ''} onChange={v => handleSettingChange('defaultVatReceivableAccountId', v)} accounts={accounts.Asset} />
                            <AccountSelector label="default_vat_payable_account" value={localSettings.defaultVatPayableAccountId || ''} onChange={v => handleSettingChange('defaultVatPayableAccountId', v)} accounts={accounts.Liability} />
                        </div>
                    </SettingBlock>

                    <SettingBlock title={t('advanced_settings')} description={t('advanced_settings_desc')} icon={<BookOpen size={20}/>}>
                        <div className="space-y-6">
                             <AccountSelector label="retained_earnings_account" value={localSettings.retainedEarningsAccountId} onChange={v => handleSettingChange('retainedEarningsAccountId', v)} accounts={accounts.Equity} />
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-medium text-foreground">{t('allow_editing_posted_entries')}</label>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle size={12} className="text-amber-500"/> {t('allow_editing_posted_entries_warning')}</p>
                                </div>
                                <ToggleSwitch enabled={localSettings.allowEditingPostedEntries} onChange={v => handleSettingChange('allowEditingPostedEntries', v)} />
                            </div>
                        </div>
                    </SettingBlock>
                </div>
            </div>
        </Card>
    );
};

export default AccountingSettingsComponent;