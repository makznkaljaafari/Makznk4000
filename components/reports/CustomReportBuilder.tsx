import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { DataSource, CustomReportDefinition, ReportColumn, ReportFilter, FilterOperator, AiReportAnalysis } from '../../types';
import Card from '../common/Card';
import InteractiveTable from '../common/InteractiveTable';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GripVertical, Database, Columns, Filter, Save, FileDown, Bot, Trash2, X } from 'lucide-react';
import { analyzeReportData } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';

const ItemTypes = { FIELD: 'field' };

const DraggableField: React.FC<{ field: { key: string; label: string; } }> = ({ field }) => {
    const { t } = useLocalization();
    const ref = useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.FIELD,
        item: field,
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }));
    drag(ref);
    return (
        <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }} className="flex items-center gap-2 p-2 bg-background rounded-md cursor-grab active:cursor-grabbing border border-border">
            <GripVertical size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">{t(field.label)}</span>
        </div>
    );
};

const DropZone: React.FC<{ title: string; onDrop: (item: any) => void; children: React.ReactNode; }> = ({ title, onDrop, children }) => {
    const { t } = useLocalization();
    const ref = useRef<HTMLDivElement>(null);
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.FIELD,
        drop: (item) => onDrop(item),
        collect: (monitor) => ({ isOver: monitor.isOver() }),
    }));
    drop(ref);
    return (
        <div ref={ref} className={`p-4 border-2 border-dashed rounded-lg transition-colors h-full ${isOver ? 'border-primary bg-primary/10' : 'border-border'}`}>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            {children || <p className="text-sm text-center text-muted-foreground py-8">{t('drag_fields_here')}</p>}
        </div>
    );
};

const CustomReportBuilder: React.FC = () => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { sales, parts, customers, customReports, setCustomReports } = useAppStore();

    const [dataSource, setDataSource] = useState<DataSource>('sales');
    const [columns, setColumns] = useState<ReportColumn[]>([]);
    const [filters, setFilters] = useState<ReportFilter[]>([]);
    
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [reportName, setReportName] = useState('');
    const [isLoadMenuOpen, setIsLoadMenuOpen] = useState(false);
    
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AiReportAnalysis | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const dataSchemas: Record<DataSource, ReportColumn[]> = {
        sales: [
            { key: 'id', label: 'sale_id' }, { key: 'date', label: 'date' }, { key: 'customerName', label: 'customer_name' },
            { key: 'total', label: 'total' }, { key: 'type', label: 'sale_type' }
        ],
        inventory: [
            { key: 'name', label: 'part_name' }, { key: 'partNumber', label: 'part_number' }, { key: 'brand', label: 'brand' },
            { key: 'stock', label: 'stock' }, { key: 'sellingPrice', label: 'selling_price' }, { key: 'purchasePrice', label: 'purchase_price' }
        ],
        customers: [
            { key: 'name', label: 'customer_name' }, { key: 'phone', label: 'phone' }, { key: 'email', label: 'email' },
            { key: 'totalDebt', label: 'total_debt' }, { key: 'creditLimit', label: 'credit_limit' }, { key: 'tier', label: 'customer_tier' }
        ]
    };

    const sourceData = useMemo(() => ({ sales, inventory: parts, customers })[dataSource], [dataSource, sales, parts, customers]);
    const availableFields = dataSchemas[dataSource];

    const handleDataSourceChange = (source: DataSource) => {
        setDataSource(source);
        setColumns([]);
        setFilters([]);
    };

    const handleDropInColumns = (field: ReportColumn) => {
        if (!columns.some(c => c.key === field.key)) {
            setColumns(prev => [...prev, field]);
        }
    };
    
    const handleDropInFilters = (field: ReportColumn) => {
        if (!filters.some(f => f.key === field.key)) {
            const newFilter: ReportFilter = { id: `filter-${Date.now()}`, key: field.key, label: field.label, operator: 'contains', value: '' };
            setFilters(prev => [...prev, newFilter]);
        }
    };

    const updateFilter = (id: string, newValues: Partial<ReportFilter>) => {
        setFilters(prev => prev.map(f => f.id === id ? { ...f, ...newValues } : f));
    };

    const reportData = useMemo(() => {
        let data = [...sourceData];
        filters.forEach(filter => {
            if (filter.value === '' || filter.value === null) return;
            data = data.filter(item => {
                const itemValue = item[filter.key as keyof typeof item];
                const filterValue = filter.value;
                if (itemValue === undefined || itemValue === null) return false;

                switch (filter.operator) {
                    case 'equals': return String(itemValue).toLowerCase() === String(filterValue).toLowerCase();
                    case 'not_equals': return String(itemValue).toLowerCase() !== String(filterValue).toLowerCase();
                    case 'contains': return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
                    case 'greater_than': return Number(itemValue) > Number(filterValue);
                    case 'less_than': return Number(itemValue) < Number(filterValue);
                    default: return true;
                }
            });
        });
        return data;
    }, [sourceData, filters]);

    const tableColumns = useMemo(() => columns.map(col => ({ Header: t(col.label), accessor: col.key, width: 180 })), [columns, t]);

    const handleSaveReport = () => {
        if (!reportName.trim()) return;
        const newReport: CustomReportDefinition = {
            id: `report-${Date.now()}`, name: reportName, dataSource, columns, filters,
        };
        setCustomReports(prev => [...prev, newReport]);
        addToast(t('report_saved_successfully'), 'success');
        setIsSaveModalOpen(false);
        setReportName('');
    };

    const handleLoadReport = (report: CustomReportDefinition) => {
        setDataSource(report.dataSource);
        setColumns(report.columns);
        setFilters(report.filters);
        setIsLoadMenuOpen(false);
    };
    
    const handleAnalyze = async () => {
        if (reportData.length === 0) {
            addToast('No data to analyze', 'warning');
            return;
        }
        setIsAiLoading(true);
        setAiAnalysis(null);
        setIsAiModalOpen(true);
        try {
            const currentReportName = reportName || `${t(dataSource)} Report`;
            const result = await analyzeReportData(reportData, currentReportName);
            setAiAnalysis(result);
        } catch (error) {
            addToast(t((error as Error).message), 'error');
            setIsAiModalOpen(false);
        } finally {
            setIsAiLoading(false);
        }
    };

    const renderContent = () => (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            <div className="lg:col-span-1 flex flex-col gap-4">
                <Card className="p-4 space-y-4">
                    <div className="flex items-center gap-2"><Database size={20} className="text-primary"/><h3 className="font-bold">{t('data_source')}</h3></div>
                    <select value={dataSource} onChange={e => handleDataSourceChange(e.target.value as DataSource)} className="w-full p-2 bg-background border border-input rounded-md">
                        <option value="sales">{t('sales')}</option><option value="inventory">{t('inventory')}</option><option value="customers">{t('customers')}</option>
                    </select>
                </Card>
                <Card className="p-4 flex-grow flex flex-col">
                    <h3 className="font-bold mb-2">{t('available_fields')}</h3>
                    <div className="space-y-2 overflow-y-auto"><DndProvider backend={HTML5Backend}>{availableFields.map(f => <DraggableField key={f.key} field={f}/>)}</DndProvider></div>
                </Card>
            </div>
            <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-1/3">
                    <DropZone title={t('columns')} onDrop={handleDropInColumns}><div className="flex flex-wrap gap-2">{columns.map((c, i) => <span key={i} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">{t(c.label)}</span>)}</div></DropZone>
                    <DropZone title={t('filters')} onDrop={handleDropInFilters}>
                        <div className="space-y-2 overflow-y-auto">{filters.map(f => (
                            <div key={f.id} className="p-2 bg-background border border-border rounded grid grid-cols-3 gap-2 items-center">
                                <span className="font-medium text-sm truncate">{t(f.label)}</span>
                                <select value={f.operator} onChange={e => updateFilter(f.id, { operator: e.target.value as FilterOperator })} className="p-1 bg-input border-border rounded text-xs">
                                    <option value="contains">{t('contains')}</option><option value="equals">{t('equals')}</option><option value="not_equals">{t('not_equals')}</option><option value="greater_than">{t('greater_than')}</option><option value="less_than">{t('less_than')}</option>
                                </select>
                                <input type="text" placeholder={t('value')} value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} className="p-1 bg-input border-border rounded text-xs"/>
                            </div>
                        ))}</div>
                    </DropZone>
                </div>
                <div className="h-2/3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">{t('report_output')}</h2>
                        <div className="flex gap-2">
                            <div className="relative"><button onClick={() => setIsLoadMenuOpen(p => !p)} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm"><FileDown size={16}/>{t('load_report')}</button>
                                {isLoadMenuOpen && <Card className="absolute top-full end-0 mt-1 w-64 p-2 z-10">{customReports.length > 0 ? customReports.map(r => <button key={r.id} onClick={() => handleLoadReport(r)} className="w-full text-start p-2 hover:bg-muted rounded text-sm">{r.name}</button>) : <p className="text-xs text-center text-muted-foreground">{t('no_reports_saved_yet')}</p>}</Card>}
                            </div>
                            <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm"><Save size={16}/>{t('save_report')}</button>
                            <button onClick={handleAnalyze} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm"><Bot size={16}/>{t('analyze_by_ai')}</button>
                        </div>
                    </div>
                    {columns.length > 0 ? <InteractiveTable columns={tableColumns} data={reportData} setData={() => {}}/> : <Card className="flex-grow flex items-center justify-center text-muted-foreground"><p>{t('select_columns_to_view_report')}</p></Card>}
                </div>
            </div>
        </div>
    );

    return (
      <DndProvider backend={HTML5Backend}>
            {isSaveModalOpen && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Card className="p-6 space-y-4"><h3 className="font-bold">{t('save_report')}</h3><input value={reportName} onChange={e => setReportName(e.target.value)} placeholder={t('report_name')} className="w-full p-2 bg-input rounded-md"/><div className="flex justify-end gap-2"><button onClick={() => setIsSaveModalOpen(false)} className="px-3 py-1.5 bg-secondary rounded-md text-sm">{t('cancel')}</button><button onClick={handleSaveReport} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm">{t('save')}</button></div></Card></div>}
            {isAiModalOpen && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Card className="p-6 space-y-4 w-full max-w-lg"><div className="flex justify-between items-center"><h3 className="font-bold text-lg">{t('ai_analysis_of_report')}</h3><button onClick={() => setIsAiModalOpen(false)}><X/></button></div>{isAiLoading ? <div className="flex justify-center p-8"><Spinner/></div> : aiAnalysis ? <div><h4 className="font-semibold">{t('summary')}</h4><p className="text-muted-foreground text-sm mb-4">{aiAnalysis.summary}</p><h4 className="font-semibold">{t('key_insights')}</h4><ul className="list-disc ps-5 text-sm space-y-1">{aiAnalysis.insights.map((ins, i) => <li key={i}>{ins}</li>)}</ul></div> : <p>{t('no_insights_found')}</p>}</Card></div>}
            <div className="h-full flex flex-col p-4 bg-muted/30 rounded-lg">{renderContent()}</div>
      </DndProvider>
    );
};

export default CustomReportBuilder;
