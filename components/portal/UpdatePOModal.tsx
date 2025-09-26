
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { PurchaseOrder, Notification } from '../../types';
import { X, Save, Upload } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface UpdatePurchaseInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    po: PurchaseOrder;
}

const UpdatePurchaseInvoiceModal: React.FC<UpdatePurchaseInvoiceModalProps> = ({ isOpen, onClose, po: invoice }) => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { setPurchaseOrders, setNotifications, loggedInSupplier } = useAppStore();

    const [status, setStatus] = useState<PurchaseOrder['status']>(invoice?.status || 'Pending');
    const [shippingDate, setShippingDate] = useState(invoice?.expectedShippingDate || '');
    const [attachments, setAttachments] = useState(invoice?.attachments || []);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        if (invoice) {
            setStatus(invoice.status);
            setShippingDate(invoice.expectedShippingDate || '');
            setAttachments(invoice.attachments || []);
            setFileName('');
        }
    }, [invoice]);
    
    if (!isOpen || !invoice) return null;
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            // In a real app, you would upload the file and get a URL
            const dummyUrl = URL.createObjectURL(file); 
            setAttachments(prev => [...prev, { name: file.name, url: dummyUrl }]);
        }
    };

    const handleSave = () => {
        if (!loggedInSupplier) return;

        setPurchaseOrders(prevPOs => prevPOs.map(p => 
            p.id === invoice.id ? { ...p, status, expectedShippingDate: shippingDate, attachments } : p
        ));

        const newNotification: Notification = {
            id: `notif-po-${invoice.id}-${Date.now()}`,
            companyId: loggedInSupplier.companyId,
            type: 'po_status_update',
            message: `قام المورد ${loggedInSupplier.name} بتحديث حالة الطلب ${invoice.id} إلى ${t(status.toLowerCase())}.`,
            date: new Date().toISOString(),
            isRead: false,
            relatedId: invoice.id,
        };
        setNotifications(prev => [newNotification, ...prev]);

        addToast(t('status_updated_successfully'), 'success');
        onClose();
    };

    const statusOptions: { value: PurchaseOrder['status']; label: string }[] = [
        { value: 'Pending', label: t('pending') },
        { value: 'Confirmed', label: t('confirmed') },
        { value: 'Shipped', label: t('shipped') },
    ];
    
    // Logic to disable status options based on current status
    const isStatusDisabled = (optionValue: PurchaseOrder['status']) => {
        if (invoice.status === 'Pending') {
            return optionValue !== 'Pending' && optionValue !== 'Confirmed';
        }
        if (invoice.status === 'Confirmed') {
            return optionValue !== 'Confirmed' && optionValue !== 'Shipped';
        }
        if (invoice.status === 'Shipped') {
            return optionValue !== 'Shipped';
        }
        return true; // Received and others are final
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('update_po_status')} - {invoice.id}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('status')}</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as PurchaseOrder['status'])}
                            className="mt-1 block w-full bg-background border border-input rounded-md p-2"
                        >
                           {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value} disabled={isStatusDisabled(opt.value)}>
                                    {opt.label}
                                </option>
                           ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('expected_shipping_date')}</label>
                        <input
                            type="date"
                            value={shippingDate}
                            onChange={e => setShippingDate(e.target.value)}
                            className="mt-1 block w-full bg-background border border-input rounded-md p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('attachments')}</label>
                        <div className="mt-1 flex items-center gap-2">
                             <label className="cursor-pointer flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm hover:bg-muted">
                                <Upload size={16}/>
                                <span>{t('upload_file')}</span>
                                <input type="file" className="hidden" onChange={handleFileChange} />
                             </label>
                             {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
                        </div>
                         <ul className="mt-2 text-sm space-y-1">
                            {attachments.map((file, index) => (
                                <li key={index}><a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{file.name}</a></li>
                            ))}
                        </ul>
                    </div>
                </div>
                 <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                        <Save size={18} />
                        {t('save')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default UpdatePurchaseInvoiceModal;
