

import React from 'react';
import { Part } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface BarcodePrintPreviewProps {
    parts: Part[];
    onClose: () => void;
}

const BarcodePrintPreview: React.FC<BarcodePrintPreviewProps> = ({ parts, onClose }) => {
    const { t, lang } = useLocalization();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex flex-col items-center p-4 print:p-0 print:bg-white" onClick={onClose}>
            <div className="w-full max-w-4xl bg-card rounded-lg shadow-xl flex flex-col h-[95vh] print:h-auto print:shadow-none print:border-none" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-border flex-shrink-0 print:hidden">
                    <h2 className="text-xl font-bold">{t('barcode_preview')}</h2>
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90">
                            <Printer size={18} />
                            <span>{t('print_selected_barcodes')}</span>
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                    </div>
                </header>

                <main className="flex-grow overflow-auto p-6 print:p-0 print-parent">
                    <div className="print-area grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                        {parts.map(part => (
                            <div key={part.id} className="p-3 border border-dashed border-border rounded-lg flex flex-col items-center text-center break-words">
                                <h4 className="font-bold text-sm leading-tight">{part.name}</h4>
                                <p className="text-xs text-muted-foreground font-mono my-1">{part.partNumber}</p>
                                <div className="my-2">
                                    <QRCodeCanvas value={part.partNumber} size={80} />
                                </div>
                                <p className="font-bold text-lg text-primary">{part.sellingPrice.toLocaleString('en-US')} <span className="text-sm">{lang === 'ar' ? 'р.с' : 'SAR'}</span></p>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default BarcodePrintPreview;
