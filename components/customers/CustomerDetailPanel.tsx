

import React, { useState } from 'react';
import { Customer, CommunicationLog, Task } from '../../types';
import SidePanel from '../common/SidePanel';
import { useLocalization } from '../../hooks/useLocalization';
import { Mail, Phone, MapPin, User, FileText, DollarSign, AlertCircle, Star, Gift, MessageSquare, Plus, UserCheck, Calendar, CheckSquare, Trash2, Sparkles } from 'lucide-react';
import Card from '../common/Card';
import { useAppStore } from '../../stores/useAppStore';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import LogCommunicationModal from './LogCommunicationModal';


interface CustomerDetailPanelProps {
    customer: Customer | null;
    onClose: () => void;
}

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value?: string | number, valueClass?: string, children?: React.ReactNode }> = ({ icon: Icon, label, value, valueClass = '', children }) => (
    <div className="flex items-start justify-between text-sm py-2">
        <div className="flex items-center gap-3 text-muted-foreground">
            <Icon size={16} />
            <span>{label}</span>
        </div>
        {children ? children : <span className={`font-semibold text-foreground text-end ${valueClass}`}>{value}</span>}
    </div>
);

const TasksSection: React.FC<{ customer: Customer }> = ({ customer }) => {
    const { t } = useLocalization();
    const { addTask, updateTask, deleteTask } = useAppStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newDueDate, setNewDueDate] = useState('');

    const handleAddTask = () => {
        if (newTaskDesc.trim() && newDueDate) {
            addTask(customer.id, { description: newTaskDesc.trim(), dueDate: newDueDate, isCompleted: false });
            setNewTaskDesc('');
            setNewDueDate('');
            setIsAdding(false);
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-primary">{t('tasks_and_reminders')}</h4>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md hover:bg-muted">
                        <Plus size={14}/> {t('add_task')}
                    </button>
                )}
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                {(customer.tasks || []).sort((a,b) => (a.isCompleted ? 1 : -1) || (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())).map(task => (
                    <div key={task.id} className="flex items-center gap-3 text-sm">
                        <button onClick={() => updateTask(customer.id, task.id, { isCompleted: !task.isCompleted })} className={`flex-shrink-0 w-5 h-5 rounded border-2 ${task.isCompleted ? 'bg-primary border-primary' : 'border-border'} flex items-center justify-center`}>
                            {task.isCompleted && <CheckSquare size={14} className="text-primary-foreground"/>}
                        </button>
                        <div className="flex-grow">
                            <p className={`text-foreground ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>{task.description}</p>
                            <p className={`text-xs ${task.isCompleted ? 'text-muted-foreground' : 'text-primary'}`}>{t('due_date')}: {task.dueDate}</p>
                        </div>
                        <button onClick={() => deleteTask(customer.id, task.id)} className="text-muted-foreground hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                ))}
                {(customer.tasks || []).length === 0 && !isAdding && (
                    <p className="text-sm text-center text-muted-foreground py-4">{t('no_tasks_yet')}</p>
                )}
                 {isAdding && (
                    <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
                        <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder={t('task_description')} className="w-full text-sm p-1 bg-input rounded"/>
                        <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full text-sm p-1 bg-input rounded"/>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setIsAdding(false)} className="text-xs p-1">{t('cancel')}</button>
                            <button onClick={handleAddTask} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">{t('save_task')}</button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};


const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({ customer, onClose }) => {
    const { t, lang } = useLocalization();
    const { users, customerSettings, logCommunication, openAiAssistant } = useAppStore();
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    if (!customer) return null;
    
    const salesperson = users.find(u => u.id === customer.assignedSalespersonId);
    
    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`;
    };

    const locale = lang === 'ar' ? ar : enUS;
    
    const handleSaveLog = (type: CommunicationLog['type'], content: string) => {
        logCommunication(customer.id, type, content);
        setIsLogModalOpen(false);
    };

    const CommunicationIcon = ({ type }: { type: CommunicationLog['type'] }) => {
        const props = { size: 16, className: "text-muted-foreground flex-shrink-0 mt-0.5" };
        switch (type) {
            case 'email': return <Mail {...props} />;
            case 'whatsapp': return <MessageSquare {...props} />;
            case 'call': return <Phone {...props} />;
            case 'visit': return <UserCheck {...props} />;
            default: return <Calendar {...props} />;
        }
    };

    return (
        <>
            <LogCommunicationModal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                onSave={handleSaveLog}
            />
            <SidePanel isOpen={!!customer} onClose={onClose} title={t('customer_details')}>
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="w-24 h-24 bg-primary/10 text-primary rounded-full mx-auto flex items-center justify-center">
                            <User size={48} />
                        </div>
                        <h3 className="text-2xl font-bold mt-4">{customer.name}</h3>
                        {customer.tier && (
                            <span className="mt-2 inline-block bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full">{customer.tier}</span>
                        )}
                    </div>

                    <Card>
                        <h4 className="font-bold mb-2 text-primary">{t('actions')}</h4>
                        <button 
                            onClick={() => openAiAssistant(null, { type: 'suggest_collection_message', data: customer })}
                            className="w-full flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-3 py-2 rounded-lg hover:bg-muted"
                        >
                            <Sparkles size={16}/>
                            <span>{t('suggest_action')}</span>
                        </button>
                    </Card>

                    <Card>
                        <h4 className="font-bold mb-2 text-primary">{t('contact_information')}</h4>
                        <DetailRow icon={Phone} label={t('phone')} value={customer.phone} valueClass="font-mono" />
                        <DetailRow icon={Mail} label={t('email')} value={customer.email} />
                        <DetailRow icon={MessageSquare} label={t('whatsapp_number')} value={customer.whatsappNumber || '-'} />
                        <DetailRow icon={MapPin} label={t('address')} value={customer.address} />
                    </Card>

                    <Card>
                        <h4 className="font-bold mb-2 text-primary">{t('financial_details')}</h4>
                        <DetailRow icon={DollarSign} label={t('total_debt')} value={formatCurrency(customer.totalDebt)} valueClass={customer.totalDebt > 0 ? "text-red-500" : ""} />
                        <DetailRow icon={AlertCircle} label={t('credit_limit')} value={formatCurrency(customer.creditLimit)} />
                        <DetailRow icon={FileText} label={t('default_payment_type')} value={t(customer.defaultPaymentType)} />
                    </Card>
                    
                     <TasksSection customer={customer} />

                    <Card>
                         <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-primary">{t('communication_history')}</h4>
                             <button onClick={() => setIsLogModalOpen(true)} className="flex items-center gap-1.5 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md hover:bg-muted">
                                <Plus size={14}/> {t('add_new_log')}
                            </button>
                        </div>
                        <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                            {customer.communicationHistory && customer.communicationHistory.length > 0 ? (
                                [...customer.communicationHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                    <div key={log.id} className="flex items-start gap-3 text-sm">
                                        <CommunicationIcon type={log.type} />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-foreground">{t(log.type)} - <span className="text-xs text-muted-foreground font-normal">{format(new Date(log.date), 'Pp', { locale })}</span></p>
                                            <p className="text-muted-foreground text-xs">{log.content}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">{t('no_communication_history')}</p>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <h4 className="font-bold mb-2 text-primary">{t('additional_information')}</h4>
                        <DetailRow icon={UserCheck} label={t('assigned_salesperson')} value={salesperson?.fullName || '-'} />
                         {customerSettings.loyaltyProgramEnabled && (
                            <DetailRow icon={Gift} label={t('loyalty_points')} value={customer.loyaltyPoints || 0} />
                         )}
                    </Card>
                </div>
            </SidePanel>
        </>
    );
};

export default CustomerDetailPanel;