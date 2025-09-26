import React, { useMemo, useState } from 'react';
import { Sale } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Trash2 } from 'lucide-react';
import InteractiveTable from '../common/InteractiveTable';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';

const SalesInvoicesList: React.FC<{
  sales: Sale[];
  setSales: (updater: Sale[] | ((prev: Sale[]) => Sale[])) => void;
  setActiveTab: (tab: string) => void;
}> = ({ sales, setSales, setActiveTab }) => {
  const { t } = useLocalization();
  const { currencies } = useAppStore();
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleBulkDelete = () => {
    setSales(prev => prev.filter(s => !selectedIds.has(s.id)));
    addToast(t('delete_items_confirm', { count: selectedIds.size }), 'success');
    setSelectedIds(new Set());
    setIsConfirmOpen(false);
  };
  
  const columns = useMemo(() => [
    { Header: t('sale_id'), accessor: 'id', width: 150 },
    { Header: t('date'), accessor: 'date', width: 150 },
    {
        Header: t('customer_name'),
        accessor: 'customerName',
        width: 250,
        Cell: ({ row }: { row: Sale }) => <span className="font-medium text-foreground whitespace-nowrap">{row.customerName}</span>
    },
    {
        Header: t('items'),
        accessor: 'items',
        width: 150,
        Cell: ({ row }: { row: Sale }) => <><span lang="en">{row.items.length}</span> {row.items.length === 1 ? t('item_singular') : t('item_plural')}</>
    },
    {
        Header: t('total'),
        accessor: 'total',
        width: 150,
        Cell: ({ row }: { row: Sale }) => {
            const currency = currencies.find(c => c.id === row.currencyId);
            const currencySymbol = currency?.symbol || 'SAR';
            return `${row.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currencySymbol}`
        }
    },
    {
        Header: t('sale_type'),
        accessor: 'type',
        width: 150,
        Cell: ({ row }: { row: Sale }) => {
          return (
            <div className="flex justify-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    row.type === 'cash' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                }`}>
                    {t(row.type)}
                </span>
            </div>
          );
        }
    }
  ], [t, currencies]);

  return (
    <div className="h-full flex flex-col gap-4">
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
              onClick={() => setActiveTab('create')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
          >
              <Plus size={20} />
              <span>{t('create_invoice')}</span>
          </button>
      </div>
      <div className="flex-grow">
         <InteractiveTable
            columns={columns}
            data={sales}
            setData={setSales as any}
            selection={{ selectedIds, onSelectionChange: setSelectedIds }}
        />
    </div>
    </div>
  );
};

export default SalesInvoicesList;