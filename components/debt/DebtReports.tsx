
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import InteractiveTable from '../common/InteractiveTable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { File as FileIcon, Download } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';

interface DebtReportsProps {
    setDebtFilter: (filter: { type: 'debt_aging'; value: string; label: string } | null) => void;
    setActiveTab: (tab: 'receivable' | 'payable') => void;
}

const DebtReports: React.FC<DebtReportsProps> = ({ setDebtFilter, setActiveTab }) => {
    const { t, lang } = useLocalization();
    const { customers, suppliers, currentUser } = useAppStore();
    const { addToast } = useToast();
    const [activeReport, setActiveReport] = useState<'receivable' | 'payable'>('receivable');
    const [isExporting, setIsExporting] = useState<null | 'pdf' | 'excel'>(null);

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const customerAgingData = useMemo(() => {
        return customers
        .filter(c => c.companyId === currentUser?.companyId && c.totalDebt > 0)
        .map(c => ({
            id: c.id,
            name: c.name,
            aging: {
                '0-30': c.debtAging?.['0-30'] || 0,
                '31-60': c.debtAging?.['31-60'] || 0,
                '61-90': c.debtAging?.['61-90'] || 0,
                '91+': c.debtAging?.['91+'] || 0,
                total: c.totalDebt,
            }
        }));
    }, [customers, currentUser]);

    const supplierAgingData = useMemo(() => {
        return suppliers
        .filter(s => s.companyId === currentUser?.companyId && s.totalDebt > 0)
        .map(s => ({
            id: s.id,
            name: s.name,
            aging: {
                '0-30': s.debtAging?.['0-30'] || 0,
                '31-60': s.debtAging?.['31-60'] || 0,
                '61-90': s.debtAging?.['61-90'] || 0,
                '91+': s.debtAging?.['91+'] || 0,
                total: s.totalDebt,
            }
        }));
    }, [suppliers, currentUser]);
    
    const chartData = useMemo(() => {
        const data = activeReport === 'receivable' ? customerAgingData : supplierAgingData;
        const totalAging = data.reduce((acc, curr) => {
            acc['0-30'] += curr.aging['0-30'];
            acc['31-60'] += curr.aging['31-60'];
            acc['61-90'] += curr.aging['61-90'];
            acc['91+'] += curr.aging['91+'];
            return acc;
        }, { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 });

        return [
            { name: t('less_than_30_days'), value: totalAging['0-30'], key: '0-30' },
            { name: t('30_60_days'), value: totalAging['31-60'], key: '31-60' },
            { name: t('61-90_days'), value: totalAging['61-90'], key: '61-90' },
            { name: t('more_than_90_days'), value: totalAging['91+'], key: '91+' },
        ];
    }, [activeReport, customerAgingData, supplierAgingData, t]);
    
    const chartColors = ['#3b82f6', '#10b981', '#f97316', '#ef4444'];

    const columns = useMemo(() => {
        const partyName = activeReport === 'receivable' ? t('customer_name') : t('supplier_name');
        return [
            { Header: partyName, accessor: 'name' as const, width: 250 },
            { Header: t('0-30_days'), accessor: '0-30' as const, width: 150 },
            { Header: t('31-60_days'), accessor: '31-60' as const, width: 150 },
            { Header: t('61-90_days'), accessor: '61-90' as const, width: 150 },
            { Header: t('91+_days'), accessor: '91+' as const, width: 150 },
            { Header: t('total'), accessor: 'total' as const, width: 180 },
        ];
    }, [t, activeReport]);

    const tableData = useMemo(() => {
        const sourceData = activeReport === 'receivable' ? customerAgingData : supplierAgingData;
        return sourceData.map(item => ({
            id: item.id,
            name: item.name,
            '0-30': formatCurrency(item.aging['0-30']),
            '31-60': formatCurrency(item.aging['31-60']),
            '61-90': formatCurrency(item.aging['61-90']),
            '91+': formatCurrency(item.aging['91+']),
            total: <span className="font-bold">{formatCurrency(item.aging.total)}</span>
        }));
    }, [activeReport, customerAgingData, supplierAgingData]);

    const handleExportExcel = async () => {
        setIsExporting('excel');
        try {
            const XLSX = await import('xlsx');
            const dataToExport = activeReport === 'receivable' ? customerAgingData : supplierAgingData;
            const header = columns.map(col => col.Header);
            const body = dataToExport.map(row => columns.map(col => {
                if (col.accessor === 'name') return row.name;
                return row.aging[col.accessor as keyof typeof row.aging];
            }));

            const wsData = [header, ...body];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, t('aging_report_for', { type: activeReport }));
            XLSX.writeFile(wb, `Debt_Aging_Report_${activeReport}.xlsx`);
        } catch (error) {
            console.error("Failed to export Excel:", error);
            addToast(t('export_failed'), 'error');
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportPdf = async () => {
        setIsExporting('pdf');
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            
            const doc = new jsPDF();
            const dataToExport = activeReport === 'receivable' ? customerAgingData : supplierAgingData;
            
            doc.text(t('aging_report_for', { type: activeReport }), 14, 15);
            
            const head = [columns.map(col => col.Header)];
            const body = dataToExport.map(row => columns.map(col => {
                if (col.accessor === 'name') return row.name;
                return formatCurrency(row.aging[col.accessor as keyof typeof row.aging]);
            }));

            autoTable(doc, {
                head: head,
                body: body,
                startY: 20,
                styles: { font: 'helvetica' }, 
                headStyles: { fillColor: [41, 128, 185] }
            });
            
            doc.save(`Debt_Aging_Report_${activeReport}.pdf`);
        } catch (error) {
            console.error("Failed to export PDF:", error);
            addToast(t('export_failed'), 'error');
        } finally {
            setIsExporting(null);
        }
    };

    const handleBarClick = (data: any) => {
        if (data && data.payload && data.payload.key) {
            setDebtFilter({ type: 'debt_aging', value: data.payload.key, label: data.payload.name });
            setActiveTab(activeReport);
        }
    };

    return (
        <Card className="h-full flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 rounded-lg bg-muted p-1 self-start">
                    <button onClick={() => setActiveReport('receivable')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeReport === 'receivable' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('accounts_receivable_aging')}</button>
                    <button onClick={() => setActiveReport('payable')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeReport === 'payable' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background/50'}`}>{t('accounts_payable_aging')}</button>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={handleExportPdf} disabled={isExporting !== null} className="flex items-center justify-center gap-2 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-red-700 disabled:opacity-50 w-32">
                        {isExporting === 'pdf' ? <Spinner className="w-4 h-4" /> : <><FileIcon size={16}/> {t('export_pdf')}</>}
                    </button>
                    <button onClick={handleExportExcel} disabled={isExporting !== null} className="flex items-center justify-center gap-2 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-700 disabled:opacity-50 w-32">
                        {isExporting === 'excel' ? <Spinner className="w-4 h-4" /> : <><Download size={16}/> {t('export_excel')}</>}
                    </button>
                </div>
            </div>

            <Card>
                <h3 className="text-lg font-semibold mb-4">{t('aging_report_for', {type: activeReport})}</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis tickFormatter={(val) => new Intl.NumberFormat('en-US', {notation: 'compact'}).format(val as number)} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip cursor={{fill: 'hsl(var(--accent))'}} contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="value" name={t('debt')} radius={[4, 4, 0, 0]} onClick={handleBarClick} cursor="pointer">
                            {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <div className="flex-grow min-h-0">
                <InteractiveTable 
                    columns={columns.map(c => ({...c, Cell: ({row}: any) => row[c.accessor]}))} 
                    data={tableData} 
                    setData={() => {}} 
                />
            </div>

        </Card>
    );
};

export default DebtReports;
