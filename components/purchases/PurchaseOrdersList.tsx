

import React, { useMemo, useState } from 'react';
import { PurchaseOrder } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Trash2, CheckSquare } from 'lucide-react';
import InteractiveTable from '../common/InteractiveTable';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';
import Spinner from '../common/Spinner';

const PurchaseInvoicesList: React.FC<{
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: (updater: PurchaseOrder[] | ((prevData: PurchaseOrder[]) => PurchaseOrder[])) => void;
  setActiveTab: (tab: string) => void;
}> = ({ purchaseOrders, setPurchaseOrders, setActiveTab }) => {
  const { t } = useLocalization();
  const { currencies, receivePurchaseOrder } = useAppStore();
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [invoiceToReceive, setInvoiceToReceive] = useState<string | null>(null);
  const [isReceivingId, setIsReceivingId] = useState<string | null>(null);

  const handleBulkDelete = () => {
    setPurchaseOrders(prev => prev.filter(p => !selectedIds.has(p.id)));
    addToast(t('delete_items_confirm', { count: selectedIds.size }), 'success');
    setSelectedIds(new Set());
    setIsConfirmOpen(false);
  };

  const handleConfirmReceive = async () => {
    if (!invoiceToReceive) return;
    setIsReceivingId(invoiceToReceive);
    try {
        await receivePurchaseOrder(invoiceToReceive);
        addToast(t('po_received_success'), 'success');
    } catch(error) {
        addToast((error as Error).message, 'error');
    } finally {
        setIsReceivingId(null);
        setInvoiceToReceive(null);
    }
  };


  const columns = useMemo(() => [
    { Header: t('po_id'), accessor: 'id', width: 150 },
    { Header: t('date'), accessor: 'date', width: 150 },
    {
        Header: t('supplier_name'),
        accessor: 'supplierName',
        width: 300,
        Cell: ({ row }: { row: PurchaseOrder }) => <span className="font-medium text-foreground whitespace-nowrap">{row.supplierName}</span>
    },
    {
        Header: t('total'),
        accessor: 'total',
        width: 150,
        Cell: ({ row }: { row: PurchaseOrder }) => {
            const currency = currencies.find(c => c.id === row.currencyId);
            const currencySymbol = currency?.symbol || 'SAR';
            return `${row.total.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencySymbol}`
        }
    },
    {
        Header: t('status'),
        accessor: 'status',
        width: 150,
        Cell: ({ row }: { row: PurchaseOrder }) => (
            <div className="flex justify-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    row.status === 'Received'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                    : row.status === 'Confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                }`}>
                    {t(row.status.toLowerCase())}
                </span>
            </div>
        )
    },
    {
        Header: t('actions'),
        accessor: 'actions',
        width: 150,
        Cell: ({ row }: { row: PurchaseOrder }) => {
            if (row.status === 'Received') return null;
            return (
                 <div className="flex justify-center">
                    <button 
                        onClick={() => setInvoiceToReceive(row.id)} 
                        disabled={isReceivingId === row.id}
                        className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isReceivingId === row.id ? <Spinner className="w-4 h-4" /> : <CheckSquare size={14}/>}
                        <span>{t('receive')}</span>
                    </button>
                </div>
            )
        }
    }
  ], [t, currencies, isReceivingId]);

  return (
    <div className="h-full flex flex-col gap-4">
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={t('delete_selected')}
        message={t('delete_items_confirm', { count: selectedIds.size })}
      />
      <ConfirmationModal
        isOpen={!!invoiceToReceive}
        onClose={() => setInvoiceToReceive(null)}
        onConfirm={handleConfirmReceive}
        title={t('confirm_receive_po')}
        message={t('confirm_receive_po_message')}
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
              onClick={() => setActiveTab('create')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
          >
              <Plus size={20} />
              <span>{t('create_purchase_order')}</span>
          </button>
      </div>
      <div className="flex-grow">
         <InteractiveTable
            columns={columns}
            data={purchaseOrders}
            setData={setPurchaseOrders as any}
            selection={{ selectedIds, onSelectionChange: setSelectedIds }}
        />
    </div>
    </div>
  );
};

export default PurchaseInvoicesList;