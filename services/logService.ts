import { useAppStore } from '../stores/useAppStore';
import { ActivityLog } from '../types';

export const logService = {
    logActivity: (action: string, details?: { [key: string]: any }) => {
        const { currentUser, setActivityLogs } = useAppStore.getState();

        if (!currentUser) {
            console.warn('Cannot log activity: No current user.');
            return;
        }

        const newLog: ActivityLog = {
            id: `log-${Date.now()}`,
            companyId: currentUser.companyId,
            userId: currentUser.id,
            userFullName: currentUser.fullName,
            action: action,
            timestamp: new Date().toISOString(),
            details: details,
        };

        setActivityLogs(prevLogs => [newLog, ...prevLogs]);
    }
};
