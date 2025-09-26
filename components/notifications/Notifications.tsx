

import React from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Notification, NotificationType } from '../../types';
import Card from '../common/Card';
import { AlertTriangle, UserCheck, Cog, Bell, Trash2, Clock, PackagePlus, CreditCard, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ActionCenterProps {
    setActiveView: (view: string) => void;
}

const Notifications: React.FC<ActionCenterProps> = ({ setActiveView }) => {
    const { t, lang } = useLocalization();
    const { 
        notifications, 
        setNotifications,
        setFormPrefill,
        openRecordPaymentModal
    } = useAppStore();

    const handleClearAll = () => setNotifications([]);

    const handleActionClick = (e: React.MouseEvent, notification: Notification, action: Notification['actions'][0]) => {
        e.stopPropagation(); // Prevent card click
        switch (action.actionType) {
            case 'create_po':
                setFormPrefill({ form: 'po', data: { partId: action.relatedId } });
                setActiveView('purchases');
                break;
            case 'record_payment_customer':
                openRecordPaymentModal(action.relatedId, 'receivable');
                setActiveView('debt-management');
                break;
            case 'navigate_to_sale':
                // For now, just go to the sales tab. A more advanced version could focus the item.
                setActiveView('sales');
                break;
        }
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    };
    
    const handleNotificationClick = (notification: Notification) => {
        if(notification.type === 'online_payment_received' && notification.actions?.[0]){
            handleActionClick(new MouseEvent('click') as any, notification, notification.actions[0]);
        }
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    };

    const getIcon = (type: NotificationType) => {
        const iconProps = { size: 24, className: "flex-shrink-0" };
        switch (type) {
            case 'low_stock': return <AlertTriangle {...iconProps} className="text-yellow-500" />;
            case 'credit_alert': return <UserCheck {...iconProps} className="text-orange-500" />;
            case 'payment_due_soon': return <Clock {...iconProps} className="text-blue-500" />;
            case 'payment_overdue': return <Clock {...iconProps} className="text-red-500" />;
            case 'online_payment_received': return <CreditCard {...iconProps} className="text-green-500" />;
            case 'system': return <Cog {...iconProps} className="text-gray-500" />;
            default: return <Bell {...iconProps} />;
        }
    };
    
    const locale = lang === 'ar' ? ar : enUS;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t('notifications')}</h1>
                <button
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                    className="flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-secondary/80 disabled:opacity-50"
                >
                    <Trash2 size={16} />
                    <span>{t('clear_all')}</span>
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-4 p-1">
                {notifications.length > 0 ? (
                    notifications.map(n => (
                        <Card 
                            key={n.id}
                            className={`p-4 transition-all duration-200 hover:shadow-lg ${!n.isRead ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
                            onClick={() => handleNotificationClick(n)}
                            role="button" tabIndex={0}
                        >
                            <div className="flex items-start gap-4">
                                {getIcon(n.type)}
                                <div className="flex-grow">
                                    <p className="font-medium text-foreground">{n.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.date), 'Pp', { locale })}</p>
                                </div>
                                {!n.isRead && (
                                    <div className="flex-shrink-0">
                                        <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse"></span>
                                    </div>
                                )}
                            </div>
                            {n.actions && n.actions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                                    {n.actions.map((action, index) => (
                                        <button 
                                            key={index}
                                            onClick={(e) => handleActionClick(e, n, action)}
                                            className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary/20"
                                        >
                                            {action.actionType === 'create_po' && <PackagePlus size={16}/>}
                                            {action.actionType === 'record_payment_customer' && <CreditCard size={16}/>}
                                            {action.actionType === 'navigate_to_sale' && <FileText size={16}/>}
                                            <span>{t(action.labelKey)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </Card>
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center text-center">
                        <div>
                            <Bell size={48} className="mx-auto text-muted-foreground/50"/>
                            <p className="mt-4 text-lg text-muted-foreground">{t('no_notifications')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
