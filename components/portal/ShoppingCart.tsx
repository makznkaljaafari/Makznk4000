

import React from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { X, Trash2, ShoppingCart as ShoppingCartIcon } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Sale, Notification } from '../../types';

interface ShoppingCartProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
    const { t, lang } = useLocalization();
    const { addToast } = useToast();
    const {
        cart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        loggedInCustomer,
        setSales,
        setNotifications,
        companies
    } = useAppStore();
    const currentCompany = companies.find(c => c.id === loggedInCustomer?.companyId);

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxRate = currentCompany?.taxSettings.isEnabled ? currentCompany.taxSettings.rate : 0;
    const vat = subtotal * taxRate;
    const grandTotal = subtotal + vat;

    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${lang === 'ar' ? 'р.с' : 'SAR'}`;
    };

    const handleSubmitOrder = () => {
        if (!loggedInCustomer || !currentCompany) return;

        const newSale: Sale = {
            id: `${currentCompany.invoiceSettings.prefix}${currentCompany.invoiceSettings.nextNumber + 1}`,
            companyId: loggedInCustomer.companyId,
            customerName: loggedInCustomer.name,
            items: cart.map(item => ({ partId: item.partId, quantity: item.quantity, price: item.price })),
            total: grandTotal,
            date: new Date().toISOString().split('T')[0],
            type: 'credit',
            paidAmount: 0,
            currencyId: 'curr-sar', // Assuming base currency for portal orders
            exchangeRate: 1,
            isPosted: false,
            status: 'Pending Review'
        };

        setSales(prev => [newSale, ...prev]);

        const newNotification: Notification = {
            id: `notif-${Date.now()}`,
            companyId: loggedInCustomer.companyId,
            type: 'new_customer_order',
            message: `طلب جديد من بوابة العميل: ${loggedInCustomer.name} (رقم ${newSale.id})`,
            date: new Date().toISOString(),
            isRead: false,
            relatedId: newSale.id,
        };
        setNotifications(prev => [newNotification, ...prev]);

        clearCart();
        addToast(t('order_placed_successfully'), 'success');
        onClose();
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-[55] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            <div
                className={`fixed top-0 bottom-0 shadow-2xl z-[60] w-full max-w-md bg-card border-border transition-transform duration-300 ease-in-out
                ${lang === 'ar' ? 'left-0 border-l' : 'right-0 border-r'}
                ${isOpen ? 'transform-none' : (lang === 'ar' ? '-translate-x-full' : 'translate-x-full')}
                `}
            >
                <div className="flex flex-col h-full">
                    <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ShoppingCartIcon size={24} />
                            {t('shopping_cart')}
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-full text-muted-foreground hover:bg-accent">
                            <X size={24} />
                        </button>
                    </header>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                                <ShoppingCartIcon size={48} className="mb-4" />
                                <p>{t('empty_cart')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cart.map(item => (
                                    <div key={item.partId} className="flex items-center gap-4">
                                        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-sm">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateCartQuantity(item.partId, parseInt(e.target.value) || 0)}
                                                min="1"
                                                max={item.stock}
                                                className="w-16 p-1 text-center bg-input rounded-md"
                                            />
                                            <button onClick={() => removeFromCart(item.partId)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <footer className="p-4 border-t border-border flex-shrink-0 space-y-4">
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">{t('subtotal')}</span><span>{formatCurrency(subtotal)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">{t('vat_rate')} ({taxRate * 100}%)</span><span>{formatCurrency(vat)}</span></div>
                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border mt-2!"><span >{t('grand_total')}</span><span>{formatCurrency(grandTotal)}</span></div>
                            </div>
                            <button
                                onClick={handleSubmitOrder}
                                className="w-full p-3 bg-primary text-primary-foreground font-bold rounded-lg text-lg hover:bg-primary/90 transition-colors"
                            >
                                {t('submit_order')}
                            </button>
                        </footer>
                    )}
                </div>
            </div>
        </>
    );
};

export default ShoppingCart;
