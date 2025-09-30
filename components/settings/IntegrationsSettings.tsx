
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Save, Bot, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { IntegrationSettings } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import ToggleSwitch from '../common/ToggleSwitch';

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

const IntegrationsSettings: React.FC = () => {
    const { t } = useLocalization();
    const { activeCompany, setCompanies } = useAppStore();
    const { addToast } = useToast();

    const [localSettings, setLocalSettings] = useState<IntegrationSettings>(
        activeCompany?.integrationSettings || {
            whatsappApiKey: '',
            whatsappStatus: 'disconnected',
            telegramBotToken: '',
            telegramStatus: 'disconnected',
        }
    );

    useEffect(() => {
        if (activeCompany?.integrationSettings) {
            setLocalSettings(activeCompany.integrationSettings);
        }
    }, [activeCompany]);

    const handleSettingChange = (key: keyof IntegrationSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        if (!activeCompany) return;
        setCompanies(prev => prev.map(c =>
            c.id === activeCompany.id
                ? { ...c, integrationSettings: localSettings }
                : c
        ));
        addToast(t('settings_saved_success'), 'success');
    };

    const handleConnect = (service: 'whatsapp' | 'telegram') => {
        // This is a simulation. In a real app, this would make an API call.
        if (service === 'whatsapp') {
            const newStatus = localSettings.whatsappStatus === 'connected' ? 'disconnected' : 'connected';
            handleSettingChange('whatsappStatus', newStatus);
        } else {
            const newStatus = localSettings.telegramStatus === 'connected' ? 'disconnected' : 'connected';
            handleSettingChange('telegramStatus', newStatus);
        }
    }

    return (
        <Card>
            <div className="p-6">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">{t('connect_messaging_platforms')}</h2>
                        <p className="text-muted-foreground mt-1">{t('connect_messaging_platforms_desc')}</p>
                    </div>
                    <button onClick={handleSave} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors text-base font-semibold">
                        <Save size={18} />
                        <span>{t('save_settings')}</span>
                    </button>
                </div>
                <div className="space-y-8">
                    <SettingBlock title={t('whatsapp_business_api')} description={t('whatsapp_business_api_desc')} icon={<MessageSquare size={20} />}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('whatsapp_api_key')}</label>
                                <input
                                    type="password"
                                    value={localSettings.whatsappApiKey}
                                    onChange={e => handleSettingChange('whatsappApiKey', e.target.value)}
                                    className="mt-1 block w-full bg-background border border-input rounded-md p-2"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{t('status')}:</span>
                                    <span className={`flex items-center gap-1.5 text-sm font-bold ${localSettings.whatsappStatus === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                                        {localSettings.whatsappStatus === 'connected' ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                                        {t(localSettings.whatsappStatus)}
                                    </span>
                                </div>
                                <button onClick={() => handleConnect('whatsapp')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${localSettings.whatsappStatus === 'connected' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                                    {t(localSettings.whatsappStatus === 'connected' ? 'disconnect' : 'connect')}
                                </button>
                            </div>
                        </div>
                    </SettingBlock>

                    <SettingBlock title={t('telegram_bot')} description={t('telegram_bot_desc')} icon={<Bot size={20} />}>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">{t('telegram_bot_token')}</label>
                                <input
                                    type="password"
                                    value={localSettings.telegramBotToken}
                                    onChange={e => handleSettingChange('telegramBotToken', e.target.value)}
                                    className="mt-1 block w-full bg-background border border-input rounded-md p-2"
                                />
                                <p className="text-xs text-muted-foreground mt-1">{t('get_token_from_botfather')}</p>
                            </div>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{t('status')}:</span>
                                    <span className={`flex items-center gap-1.5 text-sm font-bold ${localSettings.telegramStatus === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                                        {localSettings.telegramStatus === 'connected' ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                                        {t(localSettings.telegramStatus)}
                                    </span>
                                </div>
                                <button onClick={() => handleConnect('telegram')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${localSettings.telegramStatus === 'connected' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                                    {t(localSettings.telegramStatus === 'connected' ? 'disconnect' : 'connect')}
                                </button>
                            </div>
                             {localSettings.telegramStatus === 'connected' && (
                                 <div className="p-3 bg-green-500/10 text-green-700 dark:text-green-300 rounded-md text-sm font-medium">
                                     {t('bot_is_active')}
                                 </div>
                             )}
                        </div>
                    </SettingBlock>
                </div>
            </div>
        </Card>
    );
};

export default IntegrationsSettings;