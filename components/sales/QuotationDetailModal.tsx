import React, { useMemo, FC } from 'react';
import { Quotation, Part } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { X, Printer, Warehouse, Calendar } from 'lucide-react';
import Card from '../common/Card';

const QuotationDetailModal: FC<{ quotation: Quotation | null; onClose: () => void }> = ({ quotation, onClose }) => {
  const { t, lang } = useLocalization();
  const { companies, currentUser, parts, currencies, customers } = useAppStore();
  const companyProfile = useMemo(() => companies.find(c => c.id === currentUser?.companyId), [companies, currentUser]);
  const customer = useMemo(() => customers.find(c => c.name === quotation?.customerName), [customers, quotation]);
  const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);
  const currency = useMemo(() => currencies.find(c => c.id === quotation?.currencyId), [currencies, quotation]);

  if (!quotation || !companyProfile) return null;

  const handlePrint = () => {
    window.print();
  };

  const taxRate = companyProfile?.taxSettings?.isEnabled ? companyProfile.taxSettings.rate : 0;
  const subtotal = quotation.total; // Quotation total is pre-tax
  const vat = subtotal * taxRate;
  const grandTotal = subtotal + vat;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency?.symbol || ''}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 print:hidden" onClick={onClose}>
      <Card className="w-full max-w-4xl h-[95vh] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center pb-4 border-b border-border">
          <h2 className="text-2xl font-bold">{t('quotation_details')}</h2>
          <div className="flex items-center gap-4">
             <button onClick={handlePrint} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-secondary/80 transition-colors">
                <Printer size={18} />
                <span>{t('print')}</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
          </div>
        </header>
        
        <div className="flex-grow overflow-auto p-1 bg-muted/20 print-parent">
            <div className="print-area bg-card text-card-foreground p-6">
                <section className="flex justify-between items-start pb-6 border-b-2 border-primary">
                    <div>
                        {companyProfile.logoUrl ? <img src={companyProfile.logoUrl} alt={`${companyProfile.name} Logo`} className="h-20 w-auto object-contain mb-2" /> : (
                            <div className="flex items-center space-x-2 rtl:space-x-reverse text-2xl font-bold text-primary mb-2">
                                <Warehouse size={32} />
                                <span className="text-foreground">{companyProfile.name}</span>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">{companyProfile.address}</p>
                        <p className="text-xs text-muted-foreground">{t('phone')}: {companyProfile.phone} | {t('email')}: {companyProfile.email}</p>
                    </div>
                    <div className="text-end">
                        <h1 className="text-3xl font-bold uppercase">{t('quotation')}</h1>
                        <p className="text-muted-foreground font-mono">{quotation.id}</p>
                    </div>
                </section>
                
                <section className="grid grid-cols-3 gap-6 my-6">
                    <div>
                        <h3 className="font-semibold text-muted-foreground">{t('quote_to')}</h3>
                        <p className="text-lg font-bold">{customer?.name || quotation.customerName}</p>
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-muted-foreground">{t('date')}</h3>
                        <p>{quotation.date}</p>
                    </div>
                    <div className="text-end">
                        <h3 className="font-semibold text-muted-foreground">{t('expiry_date')}</h3>
                        <p className="font-bold">{quotation.expiryDate}</p>
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
                        {quotation.items.map((item, index) => {
                            const part = partsMap.get(item.partId);
                            const itemTotal = item.quantity * item.price;
                            return (
                                <tr key={index}>
                                    <td className="p-3">{index + 1}</td>
                                    <td className="p-3 font-medium">
                                        <div>{part?.name || 'Unknown Item'}</div>
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
                        <div className="flex justify-between text-xl font-bold pt-2 border-t border-foreground"><span className="">{t('grand_total')}</span><span className="">{formatCurrency(grandTotal)}</span></div>
                    </div>
                </div>

                {quotation.notes && (
                    <div className="mt-8 pt-4 border-t border-dashed">
                        <h4 className="font-semibold">{t('notes')}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quotation.notes}</p>
                    </div>
                )}
            </div>
        </div>
      </Card>
    </div>
  );
};

export default QuotationDetailModal;