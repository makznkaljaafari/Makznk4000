
import React, { useMemo, useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { LogOut, Warehouse, Briefcase, DollarSign, Edit } from 'lucide-react';
import Card from '../common/Card';
import { PurchaseOrder } from '../../types';
import InteractiveTable from '../common/InteractiveTable';
import PortalLogin from './PortalLogin';
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal';
import UpdatePurchaseInvoiceModal from './UpdatePOModal';


interface SupplierPortalProps {
  setActiveView: (view: string) => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-center gap-4 p-4">
        <div className="p-3 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <div>
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
    </Card>
);

const SupplierPortal: React.FC<SupplierPortalProps> = ({ setActiveView }) => {
    const { t, lang } = useLocalization();
    const { loggedInSupplier, purchaseOrders, setLoggedInSupplier, companies, setPurchaseOrders } = useAppStore();
    const [selectedInvoice, setSelectedInvoice] = useState<PurchaseOrder | null>(null);
    const [invoiceToUpdate, setInvoiceToUpdate] = useState<PurchaseOrder | null>(null);

    const supplierPOs = useMemo(() => {
        if (!loggedInSupplier) return [];
        return purchaseOrders
            .filter(po => po.supplierName === loggedInSupplier.name)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [loggedInSupplier, purchaseOrders]);
    
    const companyProfile = useMemo(() => {
        if (!loggedInSupplier) return null;
        return companies.find(c => c.id === loggedInSupplier.companyId);
    }, [loggedInSupplier, companies]);

    const dashboardData = useMemo(() => {
        const openPOs = supplierPOs.filter(po => po.status === 'Pending' || po.status === 'Confirmed');
        const openPOValue = openPOs.reduce((sum, po) => sum + po.total, 0);
        return {
            openPOCount: openPOs.length,
            openPOValue,
        };
    }, [supplierPOs]);

    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${lang === 'ar' ? 'р.с' : 'SAR'}`;
    };

    const getStatusChip = (status: PurchaseOrder['status']) => {
        const styles = {
            Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            Confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            Shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
            Received: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{t(status.toLowerCase())}</span>;
    };

    const columns = useMemo(() => [
        { Header: t('po_id'), accessor: 'id', width: 150 },
        { Header: t('date'), accessor: 'date', width: 150 },
        { Header: t('items'), accessor: 'items', width: 100, Cell: ({row}: { row: PurchaseOrder }) => row.items.length },
        { Header: t('total'), accessor: 'total', width: 150, Cell: ({row}: { row: PurchaseOrder }) => formatCurrency(row.total) },
        { Header: t('status'), accessor: 'status', width: 150, Cell: ({row}: { row: PurchaseOrder }) => getStatusChip(row.status) },
        {
            Header: t('actions'),
            accessor: 'actions',
            width: 120,
            Cell: ({ row }: { row: PurchaseOrder }) => (
                <div className="flex justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setInvoiceToUpdate(row);
                        }}
                        className="flex items-center gap-1.5 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-muted"
                        disabled={row.status === 'Received'}
                    >
                        <Edit size={14} />
                        <span>{t('update')}</span>
                    </button>
                </div>
            )
        }
    ], [t, lang]);

    if (!loggedInSupplier) {
        return (
             <div className="bg-muted/40 min-h-screen flex items-center justify-center p-4">
                <PortalLogin setActiveView={setActiveView} />
            </div>
        )
    }

    if (!companyProfile) return null;

    const handleLogout = () => {
        setLoggedInSupplier(null);
        setActiveView('dashboard');
    };
    
    return (
        <div className="bg-muted/40 min-h-screen p-4 md:p-8">
            <PurchaseOrderDetailModal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} po={selectedInvoice!} />
            <UpdatePurchaseInvoiceModal isOpen={!!invoiceToUpdate} onClose={() => setInvoiceToUpdate(null)} po={invoiceToUpdate!} />
            <div className="w-full max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center bg-card p-4 rounded-lg shadow-md border border-border">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-xl font-bold text-primary">
                        <Warehouse size={28} />
                        <span>{companyProfile.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-muted-foreground text-sm hidden sm:block">{t('welcome_supplier', {name: loggedInSupplier.name})}</span>
                        <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg hover:bg-muted">
                            <LogOut size={16}/>
                            <span>{t('log_out')}</span>
                        </button>
                    </div>
                </header>

                <main className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <KpiCard title={t('open_purchase_orders')} value={dashboardData.openPOCount} icon={<Briefcase size={24}/>} />
                        <KpiCard title={t('total_value_of_open_pos')} value={formatCurrency(dashboardData.openPOValue)} icon={<DollarSign size={24}/>} />
                    </div>
                    
                    <Card className="flex flex-col h-[60vh]">
                        <h3 className="text-xl font-bold mb-4">{t('all_purchase_orders')}</h3>
                        <div className="flex-grow">
                             <InteractiveTable columns={columns} data={supplierPOs} setData={setPurchaseOrders as any} onRowClick={(po) => setSelectedInvoice(po as PurchaseOrder)} />
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
};

export default SupplierPortal;
