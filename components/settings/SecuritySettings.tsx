
import React, { useState, useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import Card from '../common/Card';
import ToggleSwitch from '../common/ToggleSwitch';
import { Shield, Lock, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { ActivityLog } from '../../types';
import TwoFactorSetupModal from './TwoFactorSetupModal';
import InteractiveTable from '../common/InteractiveTable';

const SettingBlock: React.FC<{ title: string; description: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, description, icon, children }) => (
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

const SecuritySettings: React.FC = () => {
    const { t, lang } = useLocalization();
    const { currentUser, setUsers, activityLogs } = useAppStore();
    const { addToast } = useToast();
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

    const handle2FAToggle = (enabled: boolean) => {
        if (!currentUser) return;

        if (enabled) {
            // User wants to enable 2FA, show the setup modal
            setIsSetupModalOpen(true);
        } else {
            // User wants to disable 2FA
            setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, isTwoFactorEnabled: false } : u));
            addToast(t('2fa_disabled_success'), 'success');
        }
    };

    const handleModalClose = (success: boolean) => {
        setIsSetupModalOpen(false);
        if (success && currentUser) {
            // If setup was successful, update user state
            setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, isTwoFactorEnabled: true } : u));
        }
    };
    
    const logsForCompany = useMemo(() => {
        return [...activityLogs]
            .filter(log => log.companyId === currentUser?.companyId)
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [activityLogs, currentUser]);

    const actionTranslations: { [key: string]: string } = {
        user_login: t('user_login'),
        user_login_2fa_success: t('user_login_2fa_success'),
        create_invoice: t('create_invoice'),
        update_settings: t('update_settings'),
    };
    
    const logColumns = useMemo(() => [
        {
            Header: t('date_time'),
            accessor: 'timestamp',
            width: 200,
            Cell: ({ row }: { row: ActivityLog }) => {
                const locale = lang === 'ar' ? ar : enUS;
                return format(new Date(row.timestamp), 'Pp', { locale });
            }
        },
        { Header: t('user'), accessor: 'userFullName', width: 200 },
        {
            Header: t('action'),
            accessor: 'action',
            width: 200,
            Cell: ({ row }: { row: ActivityLog }) => actionTranslations[row.action] || row.action
        },
        {
            Header: t('details'),
            accessor: 'details',
            width: 400,
            Cell: ({ row }: { row: ActivityLog }) => (
                row.details ? <pre className="text-xs font-mono bg-muted/50 p-1 rounded whitespace-pre-wrap break-all">{JSON.stringify(row.details, null, 2)}</pre> : '-'
            )
        },
    ], [t, lang, actionTranslations]);
    
    const is2FAEnabled = currentUser?.isTwoFactorEnabled || false;

    return (
        <>
            {currentUser && <TwoFactorSetupModal isOpen={isSetupModalOpen} onClose={handleModalClose} user={currentUser} />}
            <Card>
                <div className="p-6">
                    <h2 className="text-2xl font-bold">{t('security_settings')}</h2>
                    <div className="space-y-8 mt-8">
                        <SettingBlock title={t('two_factor_auth')} description={t('2fa_description')} icon={<Lock size={20}/>}>
                            <div className="flex items-center justify-between">
                                <label className="font-medium text-foreground">{t('enable_2fa')}</label>
                                <ToggleSwitch enabled={is2FAEnabled} onChange={handle2FAToggle} />
                            </div>
                        </SettingBlock>

                        <SettingBlock title={t('activity_log')} description={t('activity_log_desc')} icon={<Clock size={20}/>}>
                             <div className="h-[60vh]">
                                <InteractiveTable
                                    columns={logColumns}
                                    data={logsForCompany}
                                    setData={() => {}} // Read-only
                                />
                            </div>
                        </SettingBlock>
                    </div>
                </div>
            </Card>
        </>
    );
};

export default SecuritySettings;