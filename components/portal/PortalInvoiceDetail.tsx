
import React, { useMemo, useState } from 'react';
import { Sale, Part } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Printer, ArrowLeft, Warehouse, CreditCard } from 'lucide-react';
import PaymentGatewayModal from './PaymentGatewayModal';

interface PortalInvoiceDetailProps {
    invoice: Sale;
    onBack: () => void;
}

const PortalInvoiceDetail: React.FC<PortalInvoiceDetailProps> = ({ invoice, onBack }) => {
    const { t, lang } = useLocalization();
    const { companies, loggedInCustomer, parts, currencies } = useAppStore();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const companyProfile = useMemo(() => {
        if (!loggedInCustomer) return null;
        return companies.find(c => c.id === loggedInCustomer.companyId);
    }, [loggedInCustomer, companies]);

    const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);
    const currency = useMemo(() => currencies.find(c => c.id === invoice.currencyId), [currencies, invoice.currencyId]);

    const handlePrint = () => window.print();

    const taxRate = companyProfile?.taxSettings.isEnabled ? companyProfile.taxSettings.rate : 0;
    const subtotal = invoice.total / (1 + taxRate); // Calculate subtotal from total
    const vat = invoice.total - subtotal;
    const grandTotal = invoice.total;
    const balanceDue = grandTotal - invoice.paidAmount;
    const isPaid = balanceDue <= 0.01;

    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency?.symbol || ''}`;
    };
    
    if (!companyProfile || !loggedInCustomer) return null;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4">
            <PaymentGatewayModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} invoice={invoice} />
            <header className="flex justify-between items-center bg-card p-4 rounded-lg shadow-md border border-border print:hidden">
                <button onClick={onBack} className="flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg hover:bg-muted">
                    <ArrowLeft size={16}/>
                    <span>{t('back_to_dashboard')}</span>
                </button>
                <h2 className="text-xl font-bold">{t('invoice_detail')}</h2>
                <div className="flex items-center gap-2">
                     {!isPaid && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex items-center gap-2 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700"
                        >
                            <CreditCard size={16}/>
                            <span>{t('pay_now')}</span>
                        </button>
                    )}
                    <button onClick={handlePrint} className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow hover:bg-primary/90">
                        <Printer size={16}/>
                        <span>{t('print_invoice')}</span>
                    </button>
                </div>
            </header>

            <div className="print-area bg-card text-card-foreground p-6 border rounded-lg">
                <section className="flex justify-between items-start pb-6 border-b-2 border-primary">
                     <div>
                        {companyProfile.logoUrl ? (
                            <img src={companyProfile.logoUrl} alt={`${companyProfile.name} Logo`} className="h-20 w-auto object-contain mb-2" />
                        ) : (
                            <div className="flex items-center space-x-2 rtl:space-x-reverse text-2xl font-bold text-primary mb-2">
                                <Warehouse size={32} />
                                <span className="text-foreground">{companyProfile.name}</span>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">{companyProfile.address}</p>
                        <p className="text-xs text-muted-foreground">{t('phone')}: {companyProfile.phone} | {t('email')}: {companyProfile.email}</p>
                        <p className="text-xs text-muted-foreground">{t('tax_number')}: {companyProfile.taxNumber}</p>
                    </div>
                    <div className="text-end">
                        <h1 className="text-3xl font-bold uppercase">{t('invoice')}</h1>
                        <p className="text-muted-foreground font-mono">{invoice.id}</p>
                    </div>
                </section>
                
                <section className="grid grid-cols-2 gap-6 my-6">
                    <div>
                        <h3 className="font-semibold text-muted-foreground">{t('invoice_to')}</h3>
                        <p className="text-lg font-bold">{loggedInCustomer?.name}</p>
                        <p className="text-sm text-muted-foreground">{loggedInCustomer?.address}</p>
                        <p className="text-sm text-muted-foreground">{loggedInCustomer?.phone}</p>
                    </div>
                    <div className="text-end">
                        <h3 className="font-semibold text-muted-foreground">{t('date')}</h3>
                        <p>{invoice.date}</p>
                         {invoice.dueDate && <>
                            <h3 className="font-semibold text-muted-foreground mt-2">{t('due_date')}</h3>
                            <p>{invoice.dueDate}</p>
                         </>}
                    </div>
                </section>
                
                <table className="w-full text-sm mt-6">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="p-3 text-start font-semibold">#</th>
                            <th className="p-3 text-start font-semibold">{t('item_description')}</th>
                            <th className="p-3 text-center font-semibold">{t('quantity')}</th>
                            <th className="p-3 text-end font-semibold">{t('price')}</th>
                            <th className="p-3 text-end font-semibold">{t('total')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {invoice.items.map((item, index) => {
                            const part = partsMap.get(item.partId);
                            const itemTotal = item.quantity * item.price;
                            return (
                                <tr key={index}>
                                    <td className="p-3">{index + 1}</td>
                                    <td className="p-3 font-medium">
                                        <div>{part?.name || t('unknown_item')}</div>
                                        <div className="text-xs text-muted-foreground">{part?.partNumber}</div>
                                    </td>
                                    <td className="p-3 text-center">{item.quantity}</td>
                                    <td className="p-3 text-end font-mono">{formatCurrency(item.price)}</td>
                                    <td className="p-3 text-end font-mono">{formatCurrency(itemTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                
                <div className="flex justify-end mt-6">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('subtotal')}</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('vat_rate')} ({taxRate * 100}%)</span><span className="font-semibold">{formatCurrency(vat)}</span></div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-foreground"><span className="">{t('grand_total')}</span><span className="">{formatCurrency(grandTotal)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('amount_paid')}</span><span className="font-semibold">{formatCurrency(invoice.paidAmount)}</span></div>
                        <div className="flex justify-between text-lg font-bold text-red-500 pt-2 border-t border-foreground"><span className="">{t('balance_due')}</span><span className="">{formatCurrency(balanceDue)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortalInvoiceDetail;
