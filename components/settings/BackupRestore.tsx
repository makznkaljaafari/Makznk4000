
import React, { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import { useToast } from '../../contexts/ToastContext';
import Card from '../common/Card';
import ConfirmationModal from '../common/ConfirmationModal';
import { HardDriveDownload, HardDriveUpload, Cloud, Power, RefreshCw, CloudUpload, CloudDownload } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import ToggleSwitch from '../common/ToggleSwitch';
import Spinner from '../common/Spinner';

const SettingBlock: React.FC<{ title: string; description: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, description, icon, children }) => (
    <div className="p-6">
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
            <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
        </div>
        <div className="mt-6 space-y-4">{children}</div>
    </div>
);


const BackupRestore: React.FC = () => {
    const { t, lang } = useLocalization();
    const { addToast } = useToast();
    const { backupSettings, setBackupSettings, restoreState } = useAppStore();
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);

    const locale = lang === 'ar' ? ar : enUS;

    const handleCreateBackup = () => {
        setIsSyncing('backup_local');
        setTimeout(() => {
            const state = useAppStore.getState();
            const stateToSave = Object.fromEntries(Object.entries(state).filter(([_, v]) => typeof v !== 'function'));
            const dataStr = JSON.stringify(stateToSave, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `makhzonak-plus-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            const newDate = new Date().toISOString();
            setBackupSettings({ lastBackupDate: newDate });
            setIsSyncing(null);
            addToast(t('backup_created_success'), 'success');
        }, 500);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/json') {
            setRestoreFile(file);
        } else {
            setRestoreFile(null);
            addToast(t('invalid_backup_file'), 'error');
        }
    };
    
    const handleRestore = () => {
        if (!restoreFile) return;
        setIsSyncing('restore_local');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('File content is not text');
                const restoredData = JSON.parse(text);
                if (!restoredData.parts || !restoredData.customers || !restoredData.appearance) throw new Error('Invalid structure');
                restoreState(restoredData);
                addToast(t('restore_successful'), 'success');
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                addToast(t('invalid_backup_file'), 'error');
                console.error("Restore error:", error);
            } finally {
                setIsConfirmOpen(false);
                setRestoreFile(null);
                setIsSyncing(null);
            }
        };
        reader.onerror = () => { addToast(t('file_read_error'), 'error'); setIsConfirmOpen(false); setIsSyncing(null); };
        reader.readAsText(restoreFile);
    };
    
    const handleConnectDrive = () => {
        setIsSyncing('connect');
        setTimeout(() => {
            setBackupSettings({ 
                isDriveConnected: true,
                driveUserEmail: 'user@example.com' 
            });
            setIsSyncing(null);
            addToast(t('connected_to_google_drive_simulated'), "success");
        }, 1500);
    };

    const handleDisconnectDrive = () => {
        setBackupSettings({ 
            isDriveConnected: false,
            driveUserEmail: null 
        });
        addToast(t('disconnected_from_google_drive'), "info");
    };

    const handleBackupToDrive = () => {
        setIsSyncing('backup_cloud');
        setTimeout(() => {
            const state = useAppStore.getState();
            const stateToSave = Object.fromEntries(Object.entries(state).filter(([_, v]) => typeof v !== 'function'));
            const dataStr = JSON.stringify(stateToSave);
            localStorage.setItem('makhzonak_cloud_backup', dataStr);
            setBackupSettings({ lastCloudSync: new Date().toISOString() });
            setIsSyncing(null);
            addToast(t('backup_created_success'), 'success');
        }, 2000);
    };

    const handleRestoreFromDrive = () => {
        if (window.confirm(t('restore_warning_message'))) {
            setIsSyncing('restore_cloud');
            setTimeout(() => {
                const backupData = localStorage.getItem('makhzonak_cloud_backup');
                if (backupData) {
                    try {
                        const restoredData = JSON.parse(backupData);
                        restoreState(restoredData);
                        addToast(t('restore_successful'), 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } catch (e) {
                         addToast(t('invalid_backup_file'), 'error');
                    }
                } else {
                    addToast(t('no_cloud_backup_found_simulated'), "error");
                }
                setIsSyncing(null);
            }, 2000);
        }
    };

    return (
        <>
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleRestore} title={t('restore_warning_title')} message={t('restore_warning_message')} />
            <div className="space-y-8">
                <Card className="p-0 overflow-hidden">
                    <SettingBlock title={t('local_backup_restore')} description={t('local_backup_desc')} icon={<HardDriveDownload size={24}/>}>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
                            <div>
                                <span className="text-sm font-medium">{t('last_backup')}: </span>
                                <span className="text-sm font-semibold text-foreground">{backupSettings.lastBackupDate ? format(new Date(backupSettings.lastBackupDate), 'Pp', { locale }) : t('no_backup_yet')}</span>
                            </div>
                            <button onClick={handleCreateBackup} disabled={isSyncing === 'backup_local'} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-50">
                                {isSyncing === 'backup_local' ? <Spinner className="w-4 h-4"/> : <RefreshCw size={16}/>}
                                <span>{t('download_backup_file')}</span>
                            </button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border-s-4 border-red-500/50">
                            <div className="relative">
                                <label htmlFor="restore-file-input" className="cursor-pointer flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-muted"><HardDriveUpload size={16}/><span>{restoreFile ? restoreFile.name : t('select_backup_file')}</span></label>
                                <input id="restore-file-input" type="file" accept=".json" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                            </div>
                            <button onClick={() => setIsConfirmOpen(true)} disabled={!restoreFile || isSyncing === 'restore_local'} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                 {isSyncing === 'restore_local' ? <Spinner className="w-4 h-4"/> : null}
                                 <span>{t('restore_now')}</span>
                            </button>
                        </div>
                    </SettingBlock>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <SettingBlock title={t('cloud_backup_google_drive')} description={t('cloud_backup_desc')} icon={<Cloud size={24}/>}>
                        <div className="p-4 bg-muted/30 rounded-lg min-h-[16rem] flex flex-col justify-center">
                            {!backupSettings.isDriveConnected ? (
                                <div className="text-center">
                                    <p className="text-muted-foreground mb-4">{t('connect_google_drive_to_enable')}</p>
                                    <button onClick={handleConnectDrive} disabled={isSyncing === 'connect'} className="flex items-center justify-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition-colors border disabled:opacity-50">
                                        {isSyncing === 'connect' ? <Spinner className="w-4 h-4"/> : <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" className="h-5" />}
                                        <span>{t('connect_to_google_drive')}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm"><span className="text-muted-foreground">{t('connected_as')}:</span> <span className="font-bold">{backupSettings.driveUserEmail}</span></div>
                                        <button onClick={handleDisconnectDrive} className="flex items-center gap-1 text-xs text-red-500 hover:underline"><Power size={12}/>{t('disconnect')}</button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">{t('auto_backup_daily')}</h4>
                                        <ToggleSwitch enabled={backupSettings.isAutoBackupEnabled} onChange={(v) => setBackupSettings({isAutoBackupEnabled: v})}/>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t('auto_backup_desc')}</p>
                                    <div className="text-sm"><span className="text-muted-foreground">{t('last_cloud_sync')}:</span> <span className="font-semibold">{backupSettings.lastCloudSync ? format(new Date(backupSettings.lastCloudSync), 'Pp', { locale }) : t('no_backup_yet')}</span></div>
                                    <div className="flex gap-4 pt-4 border-t border-border">
                                        <button onClick={handleBackupToDrive} disabled={!!isSyncing} className="flex-1 flex items-center justify-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-lg shadow transition-colors hover:bg-primary/30 disabled:opacity-50"><CloudUpload size={16}/><span>{t('backup_to_drive')}</span></button>
                                        <button onClick={handleRestoreFromDrive} disabled={!!isSyncing || !backupSettings.lastCloudSync} className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow transition-colors hover:bg-muted disabled:opacity-50"><CloudDownload size={16}/><span>{t('restore_from_drive')}</span></button>
                                    </div>
                                     {isSyncing && ['backup_cloud', 'restore_cloud'].includes(isSyncing) && <div className="flex items-center justify-center gap-2 text-sm text-primary animate-pulse"><Spinner className="w-4 h-4"/><span>{t('syncing')}</span></div>}
                                </div>
                            )}
                        </div>
                    </SettingBlock>
                </Card>
            </div>
        </>
    );
};

export default BackupRestore;