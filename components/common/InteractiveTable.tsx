

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { XYCoord } from 'dnd-core';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown, ChevronUp, ChevronDown, Search, GripVertical, Menu, FileUp, FileText } from 'lucide-react';
import { useLocalization } from '../../hooks/useLocalization';
import Spinner from './Spinner';


const ItemType = 'ROW';

interface DragItem {
    id: any;
    index: number;
}

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    message: string;
    action?: React.ReactNode;
}

// FIX: Changed the component definition to a generic function expression compatible with React.memo to resolve a TypeScript error with generic components.
const DraggableRow = React.memo(function DraggableRow<T extends { id: any }>({ rowData, index, moveRow, children, onRowClick }: { rowData: T; index: number; moveRow: (dragIndex: number, hoverIndex: number) => void; children: React.ReactNode, onRowClick?: (row: T) => void; }) {
    const ref = useRef<HTMLDivElement>(null);
    const id = rowData.id;

    const [, drop] = useDrop<DragItem, void, unknown>({
        accept: ItemType,
        hover(item: DragItem, monitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) {
                return;
            }

            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset) {
                return;
            }
            const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            moveRow(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ItemType,
        item: (): DragItem => ({ id, index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const opacity = isDragging ? 0.4 : 1;
    drag(drop(ref));

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (onRowClick) {
            // Check if the click target is a button or link to avoid triggering row click on action clicks
            if (!(e.target instanceof HTMLElement && (e.target.closest('button') || e.target.closest('a') || e.target.closest('input[type="checkbox"]')))) {
                onRowClick(rowData);
            }
        }
    };

    return <div ref={ref} style={{ opacity, cursor: onRowClick ? 'pointer' : 'default' }} role="row" onClick={handleClick}>{children}</div>;
});

interface InteractiveTableProps<T extends { id: any }> {
    columns: any[];
    data: T[];
    setData: (updater: T[] | ((prevData: T[]) => T[])) => void;
    emptyState?: EmptyStateProps;
    onRowClick?: (row: T) => void;
    selection?: {
        selectedIds: Set<any>;
        onSelectionChange: (newIds: Set<any>) => void;
    }
}

const TableImplementation = <T extends { id: any }>({ columns, data, setData, emptyState, onRowClick, selection }: InteractiveTableProps<T>) => {
    const { t } = useLocalization();
    const initialWidths = columns.map(c => c.width || 150);
    const [columnWidths, setColumnWidths] = useState(initialWidths);
    const [activeCell, setActiveCell] = useState(null);
    const [isResizing, setIsResizing] = useState(null);
    const tableRef = useRef(null);
    const [isExporting, setIsExporting] = useState<null | 'excel' | 'pdf'>(null);


    // Sort state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    // Filter state
    const [filterTerm, setFilterTerm] = useState('');
    
    // Display options
    const [density, setDensity] = useState<'normal' | 'compact' | 'spacious'>('normal');

    const filteredData = useMemo(() => {
        if (!filterTerm) return data;
        const lowerCaseFilter = filterTerm.toLowerCase();
        return data.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(lowerCaseFilter)
            );
        });
    }, [data, filterTerm]);


    const sortedData = useMemo(() => {
        let sortableData = [...filteredData];
        if (sortConfig !== null) {
            sortableData.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof T];
                const bVal = b[sortConfig.key as keyof T];

                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortConfig.direction === 'ascending' ? aVal - bVal : bVal - aVal;
                }

                if (String(aVal).localeCompare(String(bVal)) < 0) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (String(aVal).localeCompare(String(bVal)) > 0) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [filteredData, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return sortedData.slice(startIndex, endIndex);
    }, [sortedData, currentPage, pageSize]);
    
     useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (sortedData.length > 0 && currentPage === 0) {
             setCurrentPage(1);
        } else if (sortedData.length > 0 && currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [sortedData, totalPages, currentPage]);


    const handleResizeMouseDown = (index: number, e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing({
            index,
            startX: e.clientX,
            startWidth: columnWidths[index],
        });
    };
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const { index, startX, startWidth } = isResizing as any;
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth >= 50) { // Min width
                setColumnWidths(prevWidths => {
                    const newWidths = [...prevWidths];
                    newWidths[index] = newWidth;
                    return newWidths;
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(null);
        };

        if (isResizing) {
            document.body.style.cursor = 'col-resize';
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);
    
    useEffect(() => {
        setColumnWidths(columns.map(c => c.width || 150));
    }, [columns]);


    const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
        setData(prevData => {
            const fullData = [...prevData];
            // Calculate absolute indices in the full data array
            const startIndex = (currentPage - 1) * pageSize;
            const absoluteDragIndex = startIndex + dragIndex;
            const absoluteHoverIndex = startIndex + hoverIndex;

            const [draggedRow] = fullData.splice(absoluteDragIndex, 1);
            fullData.splice(absoluteHoverIndex, 0, draggedRow);
            return fullData;
        });
    }, [setData, currentPage, pageSize]);

    useEffect(() => {
        if (!activeCell) return;
        const [row, col] = activeCell;
        const cell = (tableRef.current as any)?.querySelector(`[role="gridcell"][data-row-index='${row}'][data-col-index='${col}']`);
        cell?.focus();
    }, [activeCell]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!activeCell && (e.key.startsWith('Arrow') || e.key === 'Enter')) {
            setActiveCell([0, 0]);
            e.preventDefault();
            return;
        }
        if (!activeCell) return;
        
        const [row, col] = activeCell as any;
        const numRows = paginatedData.length;
        const numCols = columns.length + (selection ? 1 : 0);

        let newRow = row, newCol = col;

        switch (e.key) {
            case 'ArrowUp': newRow = Math.max(0, row - 1); break;
            case 'ArrowDown': newRow = Math.min(numRows - 1, row + 1); break;
            case 'ArrowLeft': newCol = Math.max(0, col - 1); break;
            case 'ArrowRight': newCol = Math.min(numCols - 1, col + 1); break;
            case 'Home': newCol = 0; break;
            case 'End': newCol = numCols - 1; break;
            default: return;
        }
        
        e.preventDefault();
        setActiveCell([newRow, newCol]);
    };
    
    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selection) return;
        const newSelectedIds = new Set(selection.selectedIds);
        const pageIds = paginatedData.map(d => d.id);
        if (e.target.checked) {
            pageIds.forEach(id => newSelectedIds.add(id));
        } else {
            pageIds.forEach(id => newSelectedIds.delete(id));
        }
        selection.onSelectionChange(newSelectedIds);
    };

    const handleSelectRow = (id: any, isChecked: boolean) => {
        if (!selection) return;
        const newSelectedIds = new Set(selection.selectedIds);
        if (isChecked) {
            newSelectedIds.add(id);
        } else {
            newSelectedIds.delete(id);
        }
        selection.onSelectionChange(newSelectedIds);
    };
    
    const isAllOnPageSelected = useMemo(() => {
        if (!selection || paginatedData.length === 0) return false;
        return paginatedData.every(d => selection.selectedIds.has(d.id));
    }, [selection, paginatedData]);
    
    const handleExportExcel = async () => {
        setIsExporting('excel');
        try {
            const XLSX = await import('xlsx');
            const header = columns.filter(c => c.accessor !== 'actions').map(c => c.Header);
            const body = sortedData.map(row => {
                return columns.filter(c => c.accessor !== 'actions').map(col => {
                    if (col.accessor) {
                         const value = row[col.accessor as keyof T];
                         // Attempt to resolve simple cell renderers
                         if (col.Cell) {
                            const rendered = col.Cell({ row });
                            if (typeof rendered === 'string' || typeof rendered === 'number') {
                                return rendered;
                            }
                         }
                         return value ?? '';
                    }
                    return '';
                });
            });
            const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, "Report.xlsx");
        } catch (error) {
            console.error("Excel export error:", error);
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
            
            const head = [columns.filter(c => c.accessor !== 'actions').map(c => c.Header)];
            const body = sortedData.map(row => {
                 return columns.filter(c => c.accessor !== 'actions').map(col => {
                    if (col.accessor) {
                        return String(row[col.accessor as keyof T] ?? '').replace(/<[^>]*>?/gm, ''); // Strip HTML for PDF
                    }
                    return '';
                });
            });

            autoTable(doc, { head, body });
            doc.save('report.pdf');
        } catch (error) {
            console.error("PDF export error:", error);
        } finally {
            setIsExporting(null);
        }
    };


    const gridTemplateColumns = (selection ? '50px ' : '') + columnWidths.map(w => `${w}px`).join(' ');
    
    const densityClasses = {
        compact: 'py-1',
        normal: 'py-2',
        spacious: 'py-4',
    };
    const cellPaddingClass = densityClasses[density];

    if (data.length === 0 && emptyState) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/50 rounded-lg">
                <div className="text-muted-foreground mb-4">{emptyState.icon}</div>
                <h3 className="text-xl font-bold text-foreground">{emptyState.title}</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">{emptyState.message}</p>
                {emptyState.action && <div className="mt-6">{emptyState.action}</div>}
            </div>
        );
    }
    
    if(data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/50 rounded-lg">
                <h3 className="text-xl font-bold text-muted-foreground">{t('no_records_found')}</h3>
            </div>
        );
    }


    return (
        <div className="bg-card text-card-foreground rounded-lg shadow-sm border border-border flex flex-col h-full">
            <div
                ref={tableRef}
                className="interactive-table-container focus:outline-none relative flex-grow overflow-auto"
                style={{ height: '100%' }}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                role="grid"
                aria-rowcount={data.length}
                aria-colcount={columns.length}
            >
                <div role="rowgroup" className="sticky top-0 z-10 bg-muted/50 shadow-sm">
                    <div role="row" style={{ display: 'grid', gridTemplateColumns }}>
                        {selection && (
                            <div role="columnheader" className="px-4 py-3 border-b border-r border-border flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={isAllOnPageSelected}
                                    onChange={handleSelectAllOnPage}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    aria-label="Select all on page"
                                />
                            </div>
                        )}
                        {columns.map((col, i) => (
                            <div 
                                key={col.accessor || i} 
                                role="columnheader" 
                                className={`px-6 py-3 font-bold text-xs text-muted-foreground uppercase border-b border-border flex items-center justify-between relative select-none border-r last:border-r-0 border-border ${!col.disableSort && col.accessor ? 'cursor-pointer hover:bg-accent' : ''}`}
                                onClick={() => !col.disableSort && col.accessor && handleSort(col.accessor)}
                            >
                                <div className="flex items-center gap-2">
                                    <span>{col.Header}</span>
                                    {!col.disableSort && col.accessor && (
                                        sortConfig?.key === col.accessor ? (
                                            sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        ) : <ChevronsUpDown size={14} className="text-muted-foreground/50" />
                                    )}
                                </div>
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(i, e)}
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-20"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div role="rowgroup">
                    {paginatedData.map((row, rowIndex) => (
                        <DraggableRow<T> key={row.id} index={rowIndex} rowData={row} moveRow={moveRow} onRowClick={onRowClick}>
                            <div className={`hover:bg-accent ${selection?.selectedIds.has(row.id) ? 'bg-primary/10' : ''}`} style={{ display: 'grid', gridTemplateColumns }}>
                                {selection && (
                                    <div role="gridcell" className={`px-4 ${cellPaddingClass} border-b border-r border-border flex items-center justify-center`}>
                                         <input
                                            type="checkbox"
                                            checked={selection.selectedIds.has(row.id)}
                                            onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            aria-label={`Select row ${rowIndex}`}
                                        />
                                    </div>
                                )}
                                {columns.map((col, colIndex) => (
                                    <div
                                        key={col.accessor || colIndex}
                                        role="gridcell"
                                        className={`px-6 ${cellPaddingClass} border-b border-border flex items-center text-sm focus:outline-none focus:ring-inset border-r last:border-r-0 border-border ${activeCell && activeCell[0] === rowIndex && activeCell[1] === colIndex + (selection ? 1 : 0) ? 'ring-2 ring-ring' : ''}`}
                                        data-row-index={rowIndex}
                                        data-col-index={colIndex + (selection ? 1 : 0)}
                                        tabIndex={-1}
                                        onFocus={() => setActiveCell([rowIndex, colIndex + (selection ? 1 : 0)])}
                                    >
                                        {col.Cell ? col.Cell({ row, rowIndex }) : row[col.accessor as keyof T]}
                                    </div>
                                ))}
                            </div>
                        </DraggableRow>
                    ))}
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-2 border-t border-border flex-shrink-0">
                 <div className="flex-1">
                     <div className="relative w-full max-w-xs">
                         <input
                            type="text"
                            value={filterTerm}
                            onChange={e => setFilterTerm(e.target.value)}
                            placeholder={t('filter_table')}
                            className="w-full p-1.5 ps-8 text-sm bg-background border border-input rounded-md"
                         />
                         <Search size={16} className="absolute top-1/2 start-2.5 transform -translate-y-1/2 text-muted-foreground" />
                     </div>
                </div>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1">
                        <button title={t('export_excel')} onClick={handleExportExcel} disabled={isExporting !== null} className={`p-1.5 rounded-md hover:bg-accent disabled:opacity-50`}>
                            {isExporting === 'excel' ? <Spinner className="w-4 h-4" /> : <FileUp size={16} />}
                        </button>
                        <button title={t('export_pdf')} onClick={handleExportPdf} disabled={isExporting !== null} className={`p-1.5 rounded-md hover:bg-accent disabled:opacity-50`}>
                            {isExporting === 'pdf' ? <Spinner className="w-4 h-4" /> : <FileText size={16} />}
                        </button>
                        <div className="w-px h-5 bg-border mx-1"></div>
                        <button title={t('compact_view')} onClick={() => setDensity('compact')} className={`p-1 rounded-md ${density === 'compact' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                            <ChevronsUpDown size={16} className="transform -rotate-90"/>
                        </button>
                        <button title={t('normal_view')} onClick={() => setDensity('normal')} className={`p-1 rounded-md ${density === 'normal' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                            <GripVertical size={16}/>
                        </button>
                        <button title={t('spacious_view')} onClick={() => setDensity('spacious')} className={`p-1 rounded-md ${density === 'spacious' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                            <Menu size={16}/>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{t('rows_per_page')}</span>
                        <select
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="p-1 border border-input rounded-md text-sm bg-background"
                        >
                            {[10, 20, 30, 40, 50].map(size => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span className="text-sm font-medium">
                       {t('page_x_of_y', { x: currentPage, y: totalPages })} ({t('total_records', { count: sortedData.length })})
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 rounded-md disabled:opacity-50 hover:bg-accent"><ChevronsLeft size={20} /></button>
                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-1 rounded-md disabled:opacity-50 hover:bg-accent"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-1 rounded-md disabled:opacity-50 hover:bg-accent"><ChevronRight size={20} /></button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 rounded-md disabled:opacity-50 hover:bg-accent"><ChevronsRight size={20} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// FIX: Changed to a function expression to resolve TypeScript error with generic components in TSX.
const InteractiveTable = function<T extends { id: any }>(props: InteractiveTableProps<T>) {
    return (
        <DndProvider backend={HTML5Backend}>
            <TableImplementation {...props} />
        </DndProvider>
    );
};

export default InteractiveTable;