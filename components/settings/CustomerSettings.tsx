
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Save, Star, MessageSquare, Plus, X, CreditCard, Gift } from 'lucide-react';
import { CustomerSettings } from '../../types';
import ToggleSwitch from '../common/ToggleSwitch';
import { useToast } from '../../contexts/ToastContext';

const SettingBlock: React.FC<{ title: string; description: string; icon: React.ReactNode; children: React.ReactNode; }> = ({ title, description, icon, children }) => (
    <div className="p-6 border border-border rounded-lg bg-muted/30">
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
            <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-prose">{description}</p>
            </div>
        </div>
        <div className="pt-4 mt-4 border-t border-border/50">{children}</div>
    </div>
);

const CustomerSettingsComponent: React.FC = () => {
    const { t } = useLocalization();
    const { customerSettings, setCustomerSettings } = useAppStore();
    const { addToast } = useToast();
    const [localSettings, setLocalSettings] = useState<CustomerSettings>(customerSettings);
    const [newTier, setNewTier] = useState('');

    useEffect(() => { setLocalSettings(customerSettings); }, [customerSettings]);

    const handleSettingChange = (key: keyof CustomerSettings, value: any) => { setLocalSettings(prev => ({ ...prev, [key]: value })); }
    const handleTierChange = (tiers: string[]) => { setLocalSettings(prev => ({ ...prev, customerTiers: tiers })); };
    
    const handleAddTier = () => {
        if (newTier.trim() && !(localSettings.customerTiers || []).includes(newTier.trim())) {
            handleTierChange([...(localSettings.customerTiers || []), newTier.trim()]);
            setNewTier('');
        }
    };
    const handleRemoveTier = (tierToRemove: string) => { handleTierChange((localSettings.customerTiers || []).filter(t => t !== tierToRemove)); };

    const handleSave = () => { setCustomerSettings(localSettings); addToast(t('settings_saved_success'), 'success'); }

    return (
        <Card>
            <div className="p-4 md:p-6">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">{t('customer_settings_global')}</h2>
                        <p className="text-muted-foreground mt-1">{t('customer_settings_desc')}</p>
                    </div>
                    <button onClick={handleSave} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors text-base font-semibold"><Save size={18} /><span>{t('save_settings')}</span></button>
                </div>
                <div className="space-y-8">
                    <SettingBlock title={t('loyalty_program')} description={t('loyalty_program_desc')} icon={<Gift size={20} />}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-md font-medium">{t('enable_loyalty_program')}</h4>
                                    <p className="text-sm text-muted-foreground">{t('enable_loyalty_program_desc')}</p>
                                </div>
                                <ToggleSwitch enabled={localSettings.loyaltyProgramEnabled} onChange={v => handleSettingChange('loyaltyProgramEnabled', v)} aria-label={t('enable_loyalty_program')} />
                            </div>
                            {localSettings.loyaltyProgramEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/20">
                                    <div>
                                        <label className="text-md font-semibold text-foreground">{t('points_per_riyal')}</label>
                                        <p className="text-sm text-muted-foreground mb-2">{t('points_per_riyal_desc')}</p>
                                        <input
                                            type="number"
                                            value={localSettings.pointsPerRiyal}
                                            onChange={e => handleSettingChange('pointsPerRiyal', Number(e.target.value))}
                                            className="mt-1 block w-full max-w-xs bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                        />
                                    </div>
                                     <div>
                                        <label className="text-md font-semibold text-foreground">{t('riyal_value_per_point')}</label>
                                        <p className="text-sm text-muted-foreground mb-2">{t('riyal_value_per_point_desc')}</p>
                                        <input
                                            type="number"
                                            value={localSettings.riyalValuePerPoint}
                                            onChange={e => handleSettingChange('riyalValuePerPoint', Number(e.target.value))}
                                            className="mt-1 block w-full max-w-xs bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </SettingBlock>

                    <SettingBlock title={t('customer_tiers_management')} description={t('customer_tiers_desc')} icon={<Star size={20} />}>
                        <div>
                            <label className="text-md font-medium text-foreground">{t('customer_tiers')}</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {(localSettings.customerTiers || []).map(tier => (
                                    <span key={tier} className="flex items-center gap-1 bg-secondary text-secondary-foreground font-semibold px-3 py-1 rounded-full text-sm">{tier}<button onClick={() => handleRemoveTier(tier)} className="text-muted-foreground hover:text-foreground"><X size={14}/></button></span>
                                ))}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <input type="text" value={newTier} onChange={e => setNewTier(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTier()} placeholder={t('add_new_tier')} className="block w-full max-w-sm bg-background border border-input rounded-md py-2 px-3"/>
                                <button onClick={handleAddTier} className="flex-shrink-0 flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">{t('add_tier')}</button>
                            </div>
                        </div>
                    </SettingBlock>

                    <SettingBlock title={t('credit_invoicing')} description={t('credit_invoicing_desc')} icon={<CreditCard size={20} />}>
                        <div>
                            <label htmlFor="default-payment-terms" className="text-md font-semibold text-foreground">{t('default_payment_terms')}</label>
                            <p className="text-sm text-muted-foreground mb-2">{t('default_payment_terms_desc')}</p>
                            <input
                                id="default-payment-terms" type="number"
                                value={localSettings.defaultPaymentTermsDays}
                                onChange={e => handleSettingChange('defaultPaymentTermsDays', Number(e.target.value))}
                                className="mt-1 block w-full max-w-xs bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                            />
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-border/20 mt-4">
                            <div>
                                <h4 className="text-md font-medium">{t('enforce_credit_limit')}</h4>
                                <p className="text-sm text-muted-foreground">{t('enforce_credit_limit_desc')}</p>
                            </div>
                            <ToggleSwitch enabled={localSettings.enforceCreditLimit} onChange={v => handleSettingChange('enforceCreditLimit', v)} aria-label={t('enforce_credit_limit')} />
                        </div>
                    </SettingBlock>
                </div>
            </div>
        </Card>
    );
};
export default CustomerSettingsComponent;