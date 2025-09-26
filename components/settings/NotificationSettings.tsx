
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import ToggleSwitch from '../common/ToggleSwitch';
import { Save, Bell, Clock } from 'lucide-react';
import { NotificationSettings } from '../../types';
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


const NotificationSettingsComponent: React.FC = () => {
    const { t } = useLocalization();
    const { notificationSettings, setNotificationSettings } = useAppStore();
    const { addToast } = useToast();
    const [localSettings, setLocalSettings] = useState<NotificationSettings>(notificationSettings);

    useEffect(() => {
        setLocalSettings(notificationSettings);
    }, [notificationSettings]);

    const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        setNotificationSettings(localSettings);
        addToast(t('settings_saved_success'), 'success');
    };

    return (
        <Card>
            <div className="p-6">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">{t('notification_settings')}</h2>
                        <p className="text-muted-foreground mt-1">{t('notification_settings_desc')}</p>
                    </div>
                    <button onClick={handleSave} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors text-base font-semibold">
                        <Save size={18} />
                        <span>{t('save_settings')}</span>
                    </button>
                </div>
                <div className="space-y-8">
                    <SettingBlock title={t('debt_alerts')} description={t('debt_alerts_desc')} icon={<Clock size={20}/>}>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-md font-semibold">{t('enable_due_soon_alerts')}</h4>
                                    <p className="text-sm text-muted-foreground">{t('enable_due_soon_alerts_desc')}</p>
                                </div>
                                <ToggleSwitch enabled={localSettings.enableDueSoonAlerts} onChange={v => handleSettingChange('enableDueSoonAlerts', v)} aria-label={t('enable_due_soon_alerts')}/>
                            </div>
                            {localSettings.enableDueSoonAlerts && (
                                <div className="ps-6">
                                    <label htmlFor="due-soon-days" className="block text-sm font-medium text-muted-foreground">{t('alert_before_days')}</label>
                                    <input
                                        id="due-soon-days"
                                        type="number"
                                        value={localSettings.dueSoonDays}
                                        onChange={e => handleSettingChange('dueSoonDays', parseInt(e.target.value, 10) || 0)}
                                        className="mt-1 block w-full max-w-xs bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                        min="1"
                                    />
                                </div>
                            )}
                             <div className="flex items-center justify-between pt-4 border-t border-border/20">
                                <div>
                                    <h4 className="text-md font-semibold">{t('enable_overdue_alerts')}</h4>
                                    <p className="text-sm text-muted-foreground">{t('enable_overdue_alerts_desc')}</p>
                                </div>
                                <ToggleSwitch enabled={localSettings.enableOverdueAlerts} onChange={v => handleSettingChange('enableOverdueAlerts', v)} aria-label={t('enable_overdue_alerts')}/>
                            </div>
                        </div>
                    </SettingBlock>
                </div>
            </div>
        </Card>
    );
};

export default NotificationSettingsComponent;