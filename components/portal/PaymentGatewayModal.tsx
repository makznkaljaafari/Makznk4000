
import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Sale } from '../../types';
import { X, Lock, CreditCard, Calendar, CheckCircle } from 'lucide-react';
import Spinner from '../common/Spinner';
import { useToast } from '../../contexts/ToastContext';

interface PaymentGatewayModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Sale;
}

const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({ isOpen, onClose, invoice }) => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { recordOnlinePayment } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isPaid, setIsPaid] = useState(false);

    const balanceDue = invoice.total - invoice.paidAmount;

    const handlePayment = () => {
        setIsLoading(true);
        // Simulate payment processing
        setTimeout(() => {
            recordOnlinePayment(invoice.id, balanceDue);
            setIsLoading(false);
            setIsPaid(true);
            addToast(t('payment_successful'), 'success');
            setTimeout(onClose, 2000);
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('secure_payment')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                {isPaid ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                        <CheckCircle size={64} className="text-green-500 mb-4" />
                        <h3 className="text-2xl font-bold">{t('payment_successful')}</h3>
                        <p className="text-muted-foreground mt-2">{t('thank_you_for_payment')}</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 space-y-4">
                            <div className="text-center">
                                <p className="text-muted-foreground">{t('you_are_paying')}</p>
                                <p className="text-4xl font-bold text-primary">{balanceDue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                                <p className="text-muted-foreground">SAR</p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">{t('card_number')}</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                        <input type="text" placeholder="**** **** **** 1234" className="w-full pl-10 p-2 bg-input rounded-md"/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium">{t('expiry_date')}</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                            <input type="text" placeholder="MM / YY" className="w-full pl-10 p-2 bg-input rounded-md"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">CVC</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                            <input type="text" placeholder="***" className="w-full pl-10 p-2 bg-input rounded-md"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <footer className="p-4 bg-muted/50 border-t border-border">
                            <button
                                onClick={handlePayment}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90 disabled:opacity-50"
                            >
                                {isLoading ? <Spinner className="w-6 h-6 border-primary-foreground" /> : <span>{t('pay_now')} {balanceDue.toLocaleString()} SAR</span>}
                            </button>
                        </footer>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentGatewayModal;
