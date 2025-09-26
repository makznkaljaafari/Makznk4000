

import React, { useState, useMemo, useEffect } from 'react';
import { Customer } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { Plus, Eye, Edit, Trash2, Search, Users, X, UserSquare2, Link as LinkIcon, CreditCard } from 'lucide-react';
import InteractiveTable from '../common/InteractiveTable';
import { useAppStore } from '../../stores/useAppStore';
import CustomerStatement from './CustomerStatement';
import CustomerModal from './CustomerModal';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../common/ConfirmationModal';
import CustomerDetailPanel from './CustomerDetailPanel';
import { usePermissions } from '../../hooks/usePermissions';
import { createCustomer, updateCustomer } from '../../services/databaseService';


const CustomerList: React.FC<{ setActiveView: (view: string) => void; }> = ({ setActiveView }) => {
    const { t, lang } = useLocalization();
    const { customers, setCustomers, customerListFilter, setCustomerListFilter, focusedItem, setFocusedItem, currentUser, setLoggedInCustomer, addCustomer, updateCustomer: updateCustomerInStore, sales, openRecordPaymentModal } = useAppStore();
    const { addToast } = useToast();
    const { hasPermission } = usePermissions();
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
    const [modalCustomer, setModalCustomer] = useState<Customer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
    
    const [selectedIds, setSelectedIds] = useState(new Set<string>());

    useEffect(() => {
        if (focusedItem?.type === 'customer') {
            const customerToFocus = customers.find(c => c.id === focusedItem.id);
            if (customerToFocus) {
                setDetailCustomer(customerToFocus);
                // Clear the focused item so it doesn't re-trigger
                setFocusedItem(null);
            }
        }
    }, [focusedItem, customers, setFocusedItem]);

    useEffect(() => {
        let newFilteredCustomers = customers.filter(c => c.companyId === currentUser?.companyId);

        if (customerListFilter?.type === 'debt_aging') {
            const category = customerListFilter.value as '0-30' | '31-60' | '61-90' | '91+';
            newFilteredCustomers = newFilteredCustomers.filter(c => c.debtAging && c.debtAging[category] > 0);
        }

        if (searchTerm) {
            newFilteredCustomers = newFilteredCustomers.filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone.includes(searchTerm) ||
                (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        setFilteredCustomers(newFilteredCustomers);
    }, [searchTerm, customers, customerListFilter, currentUser]);

    const handleAddNew = () => {
        setModalCustomer(null);
        setIsModalOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setModalCustomer(customer);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (customerId: string) => {
        setCustomerToDelete(customerId);
        setConfirmModalOpen(true);
    };
    
    const handleConfirmDelete = () => {
        if (customerToDelete) {
            // TODO: Call database service to delete
            setCustomers(prev => prev.filter(c => c.id !== customerToDelete));
            addToast(t('customer_deleted_success'), 'success');
        }
        setConfirmModalOpen(false);
        setCustomerToDelete(null);
    };

    const handleBulkDelete = () => {
        // TODO: Call database service to delete multiple
        setCustomers(prev => prev.filter(c => !selectedIds.has(c.id)));
        addToast(t('delete_items_confirm', { count: selectedIds.size }), 'success');
        setSelectedIds(new Set());
        setConfirmModalOpen(false);
    };

    const handleSave = async (customerData: Omit<Customer, 'id' | 'totalDebt' | 'paymentHistory' | 'companyId'> & { id?: string }) => {
        if (!currentUser) return;
        try {
            if (customerData.id) { // Editing
                const updated = await updateCustomer(customerData.id, customerData);
                updateCustomerInStore(updated);
                addToast(t('customer_updated_success'), 'success');
            } else { // Adding
                const customerToCreate = { 
                    ...customerData, 
                    companyId: currentUser.companyId,
                    assignedSalespersonId: customerData.assignedSalespersonId || undefined,
                };
                const newCustomer = await createCustomer(customerToCreate);
                addCustomer(newCustomer);
                addToast(t('customer_saved_success'), 'success');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving customer:", error);
            addToast(error instanceof Error ? error.message : t('failed_to_save_customer'), 'error');
        }
    };

    const handleViewPortal = (customer: Customer) => {
        setLoggedInCustomer(customer);
        setActiveView('portal');
    };

    const handleCopyLink = (customer: Customer) => {
        const url = `${window.location.origin}${window.location.pathname}?portal=customer&id=${customer.id}`;
        navigator.clipboard.writeText(url);
        addToast(t('link_copied_to_clipboard'), 'success');
    };
    
    const customerSalesStats = useMemo(() => {
        const stats = new Map<string, { invoiceCount: number }>();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        sales.forEach(sale => {
            if (new Date(sale.date) >= thirtyDaysAgo) {
                const customer = customers.find(c => c.name === sale.customerName);
                if(customer) {
                    const currentStats = stats.get(customer.id) || { invoiceCount: 0 };
                    currentStats.invoiceCount++;
                    stats.set(customer.id, currentStats);
                }
            }
        });
        return stats;
    }, [sales, customers]);

    const columns = useMemo(() => [
        { Header: t('customer_name'), accessor: 'name', width: 250, Cell: ({ row }: { row: Customer }) => <span className="font-medium text-foreground whitespace-nowrap">{row.name}</span> },
        { Header: t('phone'), accessor: 'phone', width: 150 },
        { Header: t('total_debt'), accessor: 'totalDebt', width: 150, Cell: ({ row }: { row: Customer }) => <span className={row.totalDebt > 0 ? 'text-red-500 font-semibold' : ''}>{row.totalDebt.toLocaleString('en-US')} {lang === 'ar' ? 'р.с' : 'SAR'}</span>},
        { Header: t('recent_invoices'), accessor: 'recent_invoices', width: 150, Cell: ({ row }: { row: Customer }) => customerSalesStats.get(row.id)?.invoiceCount || 0 },
        { Header: t('actions'), accessor: 'actions', width: 220, Cell: ({ row }: { row: Customer }) => (
            <div className="flex items-center justify-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); openRecordPaymentModal(row.id, 'receivable'); }} className="p-2 text-muted-foreground hover:text-green-500 transition-colors" title={t('record_payment')}><CreditCard size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); setStatementCustomer(row); }} className="p-2 text-muted-foreground hover:text-indigo-500 transition-colors" title={t('view_statement')}><Eye size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleViewPortal(row); }} className="p-2 text-muted-foreground hover:text-blue-500 transition-colors" title={t('view_customer_portal')}><UserSquare2 size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleCopyLink(row); }} className="p-2 text-muted-foreground hover:text-purple-500 transition-colors" title={t('copy_portal_link')}><LinkIcon size={18} /></button>
                {hasPermission('manage_customers') && (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="p-2 text-muted-foreground hover:text-primary transition-colors" title={t('edit_customer')}><Edit size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id); }} className="p-2 text-muted-foreground hover:text-red-500 transition-colors" title={t('delete_customer')}><Trash2 size={18} /></button>
                    </>
                )}
            </div>
        )}
    ], [t, lang, hasPermission, customerSalesStats, openRecordPaymentModal]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <CustomerDetailPanel customer={detailCustomer} onClose={() => setDetailCustomer(null)} />
            <CustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} customer={modalCustomer} />
            {statementCustomer && <CustomerStatement customer={statementCustomer} onClose={() => setStatementCustomer(null)} />}
            <ConfirmationModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={customerToDelete ? handleConfirmDelete : handleBulkDelete}
                title={customerToDelete ? t('delete_customer') : t('delete_selected')}
                message={customerToDelete ? t('delete_customer_confirm') : t('delete_items_confirm', {count: selectedIds.size})}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-grow w-full sm:w-auto">
                    <input 
                        type="text"
                        placeholder={`${t('search_customer')}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 ps-10 border border-input bg-background rounded-md focus:ring-2 focus:ring-ring"
                    />
                    <Search className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground" size={20} />
                </div>
                {hasPermission('manage_customers') && (
                    <button onClick={handleAddNew} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors">
                        <Plus size={20} />
                        <span>{t('add_new_customer')}</span>
                    </button>
                )}
            </div>

            {customerListFilter && (
                <div className="bg-primary/10 text-primary p-2 rounded-md flex justify-between items-center text-sm">
                    <span className="font-semibold">{t('filtering_by')} {customerListFilter.label}</span>
                    <button onClick={() => setCustomerListFilter(null)} className="flex items-center gap-1 font-bold hover:bg-primary/20 p-1 rounded-full">
                        <X size={16}/>
                    </button>
                </div>
            )}
            
            {selectedIds.size > 0 && (
                 <div className="bg-primary/10 text-primary p-2 rounded-md flex justify-between items-center text-sm animate-in fade-in">
                    <span className="font-bold">{t('items_selected', { count: selectedIds.size })}</span>
                    <button onClick={() => {setCustomerToDelete(null); setConfirmModalOpen(true)}} className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-red-700">
                      <Trash2 size={16}/> {t('delete_selected')}
                    </button>
                </div>
            )}

            <div className="flex-grow">
                <InteractiveTable
                    onRowClick={(row) => setDetailCustomer(row)}
                    columns={columns}
                    data={filteredCustomers}
                    setData={setCustomers as any}
                    selection={{ selectedIds, onSelectionChange: setSelectedIds }}
                    emptyState={{
                        icon: <Users size={48} />,
                        title: t('no_customers_found'),
                        message: t('no_customers_found_desc'),
                        action: (
                            hasPermission('manage_customers') && (
                                <button onClick={handleAddNew} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors">
                                    <Plus size={20} />
                                    <span>{t('add_new_customer')}</span>
                                </button>
                            )
                        )
                    }}
                />
            </div>
        </div>
    );
};

export default CustomerList;