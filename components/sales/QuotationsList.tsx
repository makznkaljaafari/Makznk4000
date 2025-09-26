


import React, { useMemo, useState } from 'react';
import { Quotation } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Trash2, Check, Send, X, FileText, TrendingUp } from 'lucide-react';
import InteractiveTable from '../common/InteractiveTable';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';
import QuotationDetailModal from './QuotationDetailModal';
import { Part } from '../../types';

const QuotationsList: React.FC<{
  setActiveTab: (tab: string) => void;
}> = ({ setActiveTab }) => {
  const { t, lang } = useLocalization();
  const { addToast } = useToast();
  const { quotations, setQuotations, convertQuotationToSale, parts } = useAppStore();

  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [quotationToView, setQuotationToView] = useState<Quotation | null>(null);
  
  const partsMap = useMemo(() => new Map<string, Part>(parts.map(p => [p.id, p])), [parts]);


  const handleBulkDelete = () => {
    setQuotations(prev => prev.filter(q => !selectedIds.has(q.id)));
    addToast(t('delete_items_confirm', { count: selectedIds.size }), 'success');
    setSelectedIds(new Set());
    setIsConfirmOpen(false);
  };
  
  const handleStatusChange = (id: string, status: Quotation['status']) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status } : q));
  };

  const handleConvertToInvoice = (quotation: Quotation) => {
    // Stock check before converting
    for (const item of quotation.items) {
        const part = partsMap.get(item.partId);
        if (part) {
            if (item.quantity > part.stock) {
                addToast(t('error_insufficient_stock', { stock: part.stock }), 'error');
                return;
            }
        } else {
            addToast(t('part_not_found_in_inventory', { partName: `ID: ${item.partId}` }), 'error');
            return;
        }
    }

    const newSale = convertQuotationToSale(quotation.id);
    if(newSale) {
        addToast(t('quotation_converted_success'), 'success');
        setActiveTab('invoices');
    } else {
        addToast('Error converting quotation', 'error');
    }
  }

  const getStatusChip = (status: Quotation['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{t(status)}</span>;
  };

  const columns = useMemo(() => [
    { Header: t('quotation_id'), accessor: 'id', width: 150 },
    { Header: t('date'), accessor: 'date', width: 120 },
    { Header: t('expiry_date'), accessor: 'expiryDate', width: 120 },
    { Header: t('customer_name'), accessor: 'customerName', width: 250 },
    { Header: t('total'), accessor: 'total', width: 150, Cell: ({ row }: { row: Quotation }) => `${row.total.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`},
    { Header: t('status'), accessor: 'status', width: 120, Cell: ({ row }: { row: Quotation }) => getStatusChip(row.status)},
    { Header: t('actions'), accessor: 'actions', width: 250, Cell: ({ row }: { row: Quotation }) => (
        <div className="flex items-center justify-center gap-1">
            <button onClick={() => setQuotationToView(row)} className="p-2 text-muted-foreground hover:text-primary"><FileText size={16}/></button>
            {row.status === 'draft' && <button onClick={() => handleStatusChange(row.id, 'sent')} className="p-2 text-muted-foreground hover:text-primary"><Send size={16}/></button>}
            {(row.status === 'sent' || row.status === 'accepted') && <button onClick={() => handleConvertToInvoice(row)} className="p-2 text-muted-foreground hover:text-green-500"><TrendingUp size={16}/></button>}
            {row.status === 'sent' && <button onClick={() => handleStatusChange(row.id, 'rejected')} className="p-2 text-muted-foreground hover:text-red-500"><X size={16}/></button>}
        </div>
    )},
  ], [t, lang]);

  return (
    <div className="h-full flex flex-col gap-4">
      {quotationToView && <QuotationDetailModal quotation={quotationToView} onClose={() => setQuotationToView(null)} />}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={t('delete_selected')}
        message={t('delete_items_confirm', { count: selectedIds.size })}
      />
      <div className="flex justify-between items-center">
          {selectedIds.size > 0 ? (
              <div className="flex items-center gap-4">
                  <span className="font-bold">{t('items_selected', { count: selectedIds.size })}</span>
                   <button onClick={() => setIsConfirmOpen(true)} className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 text-sm rounded-lg shadow hover:bg-red-700">
                      <Trash2 size={16}/> {t('delete_selected')}
                  </button>
              </div>
          ) : (
              <div></div>
          )}
          <button
              onClick={() => setActiveTab('create_quotation')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
          >
              <Plus size={20} />
              <span>{t('create_quotation')}</span>
          </button>
      </div>
      <div className="flex-grow">
         <InteractiveTable
            columns={columns}
            data={quotations}
            setData={setQuotations as any}
            selection={{ selectedIds, onSelectionChange: setSelectedIds }}
            onRowClick={(row) => setQuotationToView(row as Quotation)}
        />
    </div>
    </div>
  );
};

export default QuotationsList;