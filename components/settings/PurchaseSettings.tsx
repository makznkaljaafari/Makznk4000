

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Save, FileText, Truck } from 'lucide-react';
import { PurchaseSettings } from '../../types';
import ToggleSwitch from '../common/ToggleSwitch';
import { useToast } from '../../contexts/ToastContext';

// Reusable Setting Block Component
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

const PurchaseSettingsComponent: React.FC = () => {
    const { t } = useLocalization();
    const { purchaseSettings, setPurchaseSettings } = useAppStore();
    const { addToast } = useToast();
    const [localSettings, setLocalSettings] = useState<PurchaseSettings>(purchaseSettings);

    useEffect(() => { setLocalSettings(purchaseSettings); }, [purchaseSettings]);

    const handleSettingChange = (key: keyof PurchaseSettings, value: any) => { setLocalSettings(prev => ({ ...prev, [key]: value })); }

    const handleSave = () => { setPurchaseSettings(localSettings); addToast(t('settings_saved_success'), 'success'); }

    return (
        <Card>
            <div className="p-6">
                <div className="flex justify-between items-start mb-8">
                    <div><h2 className="text-2xl font-bold">{t('purchase_settings')}</h2></div>
                    <button onClick={handleSave} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 text-base font-semibold"><Save size={18} /><span>{t('save_settings')}</span></button>
                </div>
                <div className="space-y-8">
                    <SettingBlock title={t('purchase_order_numbering')} description="" icon={<FileText size={20} />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('po_prefix')}</label>
                                <input type="text" value={localSettings.defaultPoPrefix} onChange={e => handleSettingChange('defaultPoPrefix', e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('next_po_number')}</label>
                                <input type="number" value={localSettings.nextPoNumber} onChange={e => handleSettingChange('nextPoNumber', parseInt(e.target.value, 10) || 1)} className="mt-1 block w-full bg-background border border-input rounded-md p-2" />
                            </div>
                        </div>
                    </SettingBlock>

                    <SettingBlock title={t('supplier_payment_terms')} description="" icon={<Truck size={20} />}>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">{t('default_supplier_payment_terms_days')}</label>
                            <input type="number" value={localSettings.defaultPaymentTermsDays} onChange={e => handleSettingChange('defaultPaymentTermsDays', Number(e.target.value))} className="mt-1 block w-full max-w-xs bg-background border border-input rounded-md p-2" />
                        </div>
                         <div className="flex items-center justify-between pt-4 border-t border-border/20 mt-4">
                            <div>
                                <h4 className="text-md font-medium">{t('auto_post_po_on_receipt')}</h4>
                                <p className="text-sm text-muted-foreground">{t('auto_post_po_on_receipt_desc')}</p>
                            </div>
                            <ToggleSwitch enabled={localSettings.autoPostOnReceipt} onChange={v => handleSettingChange('autoPostOnReceipt', v)} aria-label={t('auto_post_po_on_receipt')} />
                        </div>
                    </SettingBlock>
                </div>
            </div>
        </Card>
    );
};
export default PurchaseSettingsComponent;