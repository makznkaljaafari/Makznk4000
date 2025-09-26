
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import { useToast } from '../../contexts/ToastContext';
import Card from '../common/Card';
import ToggleSwitch from '../common/ToggleSwitch';
import { Save, FileText, Percent } from 'lucide-react';
import { Company, InvoiceSettings, TaxSettings } from '../../types';

const SettingBlock: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-6 border border-border rounded-lg bg-muted/30">
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
            <div><h3 className="text-lg font-semibold text-foreground">{title}</h3></div>
        </div>
        <div className="pt-4 mt-4 border-t border-border/50">{children}</div>
    </div>
);

const DocumentSettings: React.FC = () => {
    const { t } = useLocalization();
    const { currentUser, companies, setCompanies } = useAppStore();
    const { addToast } = useToast();
    
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
    const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);

    useEffect(() => {
        const currentCompany = companies.find(c => c.id === currentUser?.companyId);
        if (currentCompany) {
            setInvoiceSettings(currentCompany.invoiceSettings);
            setTaxSettings(currentCompany.taxSettings);
        }
    }, [currentUser, companies]);

    const handleSave = () => {
        if (currentUser && invoiceSettings && taxSettings) {
            setCompanies(prev => prev.map(c => 
                c.id === currentUser.companyId 
                ? { ...c, invoiceSettings, taxSettings } as Company
                : c
            ));
            addToast(t('invoice_settings_saved'), 'success');
        }
    };

    if (!invoiceSettings || !taxSettings) {
        return <Card><p>Loading...</p></Card>;
    }

    return (
        <Card>
            <div className="p-6">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">{t('document_settings')}</h2>
                    </div>
                    <button onClick={handleSave} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors text-base font-semibold">
                        <Save size={18} />
                        <span>{t('save_settings')}</span>
                    </button>
                </div>

                <div className="space-y-8">
                    <SettingBlock title={t('invoice_numbering')} icon={<FileText size={20} />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('invoice_prefix')}</label>
                                <input 
                                    type="text" 
                                    value={invoiceSettings.prefix} 
                                    onChange={e => setInvoiceSettings({...invoiceSettings, prefix: e.target.value})}
                                    className="mt-1 block w-full bg-background border border-input rounded-md p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('next_invoice_number')}</label>
                                <input 
                                    type="number"
                                    value={invoiceSettings.nextNumber}
                                    onChange={e => setInvoiceSettings({...invoiceSettings, nextNumber: parseInt(e.target.value, 10) || 1})}
                                    className="mt-1 block w-full bg-background border border-input rounded-md p-2"
                                />
                            </div>
                        </div>
                    </SettingBlock>

                     <SettingBlock title={t('tax_settings')} icon={<Percent size={20} />}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="font-medium text-foreground">{t('vat_enabled')}</label>
                                <ToggleSwitch enabled={taxSettings.isEnabled} onChange={v => setTaxSettings({...taxSettings, isEnabled: v})} />
                            </div>
                            {taxSettings.isEnabled && (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground">{t('vat_rate')}</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={taxSettings.rate}
                                        onChange={e => setTaxSettings({...taxSettings, rate: parseFloat(e.target.value) || 0})}
                                        className="mt-1 block w-full max-w-xs bg-background border border-input rounded-md p-2"
                                    />
                                </div>
                            )}
                        </div>
                    </SettingBlock>
                </div>
            </div>
        </Card>
    );
};

export default DocumentSettings;