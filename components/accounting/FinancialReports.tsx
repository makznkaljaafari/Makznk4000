



import React, { useState, useMemo, FC } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Printer, Warehouse } from 'lucide-react';
import { Account, AccountType } from '../../types';

type Balance = { debit: number; credit: number };

const FinancialReports: React.FC = () => {
    const { t, lang } = useLocalization();
    const { chartOfAccounts, journalEntries, companies, currentUser, accountingSettings } = useAppStore();
    
    const companyProfile = useMemo(() => companies.find(c => c.id === currentUser?.companyId), [companies, currentUser]);

    const [reportType, setReportType] = useState<'income_statement' | 'balance_sheet' | 'trial_balance' | 'cash_flow_statement'>('income_statement');
    
    const defaultStartDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const defaultEndDate = new Date().toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStartDate);
    const [endDate, setEndDate] = useState(defaultEndDate);

    const accountsMap = useMemo(() => new Map<string, Account>(chartOfAccounts.map(acc => [acc.id, acc])), [chartOfAccounts]);
    const accountChildrenMap = useMemo(() => {
        const map = new Map<string, string[]>();
        chartOfAccounts.forEach(acc => {
            if (acc.parentAccountId) {
                if (!map.has(acc.parentAccountId)) map.set(acc.parentAccountId, []);
                map.get(acc.parentAccountId)!.push(acc.id);
            }
        });
        return map;
    }, [chartOfAccounts]);

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const reportData = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        
        const periodMovements = new Map<string, Balance>();
        journalEntries.filter(je => je.isPosted && new Date(je.date) >= start && new Date(je.date) <= end)
        .forEach(je => {
            je.items.forEach(item => {
                const current = periodMovements.get(item.accountId) || { debit: 0, credit: 0 };
                current.debit += item.debit;
                current.credit += item.credit;
                periodMovements.set(item.accountId, current);
            });
        });
        
        const startBalances = new Map<string, number>();
        journalEntries.filter(je => je.isPosted && new Date(je.date) < start)
        .forEach(je => {
            je.items.forEach(item => {
                const acc = accountsMap.get(item.accountId);
                if (acc) {
                    const currentBalance = startBalances.get(item.accountId) || 0;
                    let change = (['Asset', 'Expense'].includes(acc.type)) ? (item.debit - item.credit) : (item.credit - item.debit);
                    startBalances.set(item.accountId, currentBalance + change);
                }
            });
        });

        const endBalances = new Map<string, number>(startBalances);
        periodMovements.forEach((movement, accountId) => {
             const acc = accountsMap.get(accountId);
             if(acc) {
                const currentBalance = endBalances.get(accountId) || 0;
                let change = (['Asset', 'Expense'].includes(acc.type)) ? (movement.debit - movement.credit) : (movement.credit - movement.debit);
                endBalances.set(accountId, currentBalance + change);
             }
        });

        const getRecursiveTotal = (accountId: string, balanceMap: Map<string, number>): number => {
            const children = accountChildrenMap.get(accountId) || [];
            let total = balanceMap.get(accountId) || 0;
            return total + children.reduce((sum, childId) => sum + getRecursiveTotal(childId, balanceMap), 0);
        };
        
        const getRecursiveTotalForPeriod = (accountId: string): number => {
             const children = accountChildrenMap.get(accountId) || [];
             let total = 0;
             const movement = periodMovements.get(accountId);
             if (movement) {
                const acc = accountsMap.get(accountId);
                 if(acc) {
                    if(['Revenue', 'Equity', 'Liability'].includes(acc.type)) total = movement.credit - movement.debit;
                    else total = movement.debit - movement.credit;
                 }
             }
             return total + children.reduce((sum, childId) => sum + getRecursiveTotalForPeriod(childId), 0);
        };

        const revenueAccounts = chartOfAccounts.filter(a => a.type === 'Revenue' && !a.parentAccountId);
        const expenseAccounts = chartOfAccounts.filter(a => a.type === 'Expense' && !a.parentAccountId);
        const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + getRecursiveTotalForPeriod(acc.id), 0);
        const totalExpense = expenseAccounts.reduce((sum, acc) => sum + getRecursiveTotalForPeriod(acc.id), 0);
        const netProfit = totalRevenue - totalExpense;
        
        // --- Cash Flow Calculations ---
        const { defaultArAccountId, defaultApAccountId, defaultInventoryAccountId } = accountingSettings;
        const arStart = defaultArAccountId ? getRecursiveTotal(defaultArAccountId, startBalances) : 0;
        const arEnd = defaultArAccountId ? getRecursiveTotal(defaultArAccountId, endBalances) : 0;
        const changeInAR = arEnd - arStart;

        const inventoryStart = defaultInventoryAccountId ? getRecursiveTotal(defaultInventoryAccountId, startBalances) : 0;
        const inventoryEnd = defaultInventoryAccountId ? getRecursiveTotal(defaultInventoryAccountId, endBalances) : 0;
        const changeInInventory = inventoryEnd - inventoryStart;

        const apStart = defaultApAccountId ? getRecursiveTotal(defaultApAccountId, startBalances) : 0;
        const apEnd = defaultApAccountId ? getRecursiveTotal(defaultApAccountId, endBalances) : 0;
        const changeInAP = apEnd - apStart;
        
        const cfo = netProfit - changeInAR - changeInInventory + changeInAP;
        const cfi = 0; 
        const cff = 0;

        const cashAccountIds = chartOfAccounts.filter(a => a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank') || a.name.includes('الصندوق') || a.name.includes('البنك')).map(a => a.id);
            
        const cashAtStart = cashAccountIds.reduce((sum, id) => sum + (startBalances.get(id) || 0), 0);
        const cashAtEnd = cashAccountIds.reduce((sum, id) => sum + (endBalances.get(id) || 0), 0);
        const netChangeInCash = cfo + cfi + cff;

        const cashFlowReport = { netProfit, adjustments: { changeInAR, changeInInventory, changeInAP }, cfo, cfi, cff, netChangeInCash, cashAtStart, cashAtEnd: cashAtStart + netChangeInCash };
        
        const openingMovements = new Map<string, Balance>();
        journalEntries.filter(je => je.isPosted && new Date(je.date) < start)
        .forEach(je => {
            je.items.forEach(item => {
                const current = openingMovements.get(item.accountId) || { debit: 0, credit: 0 };
                current.debit += item.debit;
                current.credit += item.credit;
                openingMovements.set(item.accountId, current);
            });
        });

        return { netProfit, endBalances, periodMovements, openingMovements, getRecursiveTotalForPeriod, getRecursiveTotalAsOfEnd: getRecursiveTotal, cashFlowReport };

    }, [startDate, endDate, journalEntries, chartOfAccounts, accountsMap, accountChildrenMap, accountingSettings]);
    
     const handlePrint = () => window.print();

    if (!reportData || !companyProfile) {
        return <Card className="flex items-center justify-center h-full"><p>{t('no_data_for_report')}</p></Card>
    }
    
    const ReportRow: FC<{account?: Account, label?: string, balance: number, level: number, isTotal?: boolean, isSubtotal?: boolean, isHeader?: boolean, isNote?: boolean}> = 
    ({account, label, balance, level, isTotal = false, isSubtotal = false, isHeader = false, isNote = false}) => {
        let className = "py-2 px-4";
        if (isTotal) className += " font-bold border-t-2 border-foreground";
        if (isSubtotal) className += " font-semibold border-t";
        if (isHeader) className += " font-bold text-lg bg-muted rounded-t-lg";
        if (isNote) className += " text-xs text-muted-foreground";

        const labelText = label || (account ? (t(account.name.toLowerCase().replace(/ /g, '_')) || account.name) : '');
        
        return (
            <tr className={className}>
                <td style={{paddingInlineStart: `${level * 1.5}rem`}}>{labelText}</td>
                <td className="text-end font-mono">{balance ? formatCurrency(balance) : isHeader ? '' : '-'}</td>
            </tr>
        );
    }
    
    const IncomeStatementView = () => {
        const revenueAccounts = chartOfAccounts.filter(a => a.type === 'Revenue' && !a.parentAccountId);
        const {elements: revenueElements, total: totalRevenue} = renderAccountHierarchy(revenueAccounts, reportData.getRecursiveTotalForPeriod, 1);
        const expenseAccounts = chartOfAccounts.filter(a => a.type === 'Expense' && !a.parentAccountId);
        const {elements: expenseElements, total: totalExpense} = renderAccountHierarchy(expenseAccounts, reportData.getRecursiveTotalForPeriod, 1);
        
        return (
            <table className="w-full text-sm">
                <tbody>
                    <ReportRow label={t('total_revenues')} balance={totalRevenue} level={0} isSubtotal/>
                    {revenueElements}
                    <tr className="h-4"></tr>
                    <ReportRow label={t('operating_expenses')} balance={totalExpense} level={0} isSubtotal/>
                    {expenseElements}
                    <tr className="h-4"></tr>
                    <ReportRow label={t('net_profit')} balance={reportData.netProfit} level={0} isTotal/>
                </tbody>
            </table>
        );
    }
    
    const BalanceSheetView = () => {
        const assetAccounts = chartOfAccounts.filter(a => a.type === 'Asset' && !a.parentAccountId);
        const {elements: assetElements, total: totalAssets} = renderAccountHierarchy(assetAccounts, (id) => reportData.getRecursiveTotalAsOfEnd(id, reportData.endBalances), 1, true);

        const liabilityAccounts = chartOfAccounts.filter(a => a.type === 'Liability' && !a.parentAccountId);
        const {elements: liabilityElements, total: totalLiabilities} = renderAccountHierarchy(liabilityAccounts, (id) => reportData.getRecursiveTotalAsOfEnd(id, reportData.endBalances), 1, true);

        const equityAccounts = chartOfAccounts.filter(a => a.type === 'Equity' && !a.parentAccountId);
        const {elements: equityElements, total: totalEquityFromAccounts} = renderAccountHierarchy(equityAccounts, (id) => reportData.getRecursiveTotalAsOfEnd(id, reportData.endBalances), 1, true);
        const totalEquity = totalEquityFromAccounts + reportData.netProfit;

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-bold p-2 bg-muted rounded-t-lg">{t('assets')}</h3>
                    <table className="w-full text-sm"><tbody>{assetElements}<ReportRow label={t('total_assets')} balance={totalAssets} level={0} isTotal /></tbody></table>
                </div>
                <div>
                    <h3 className="text-lg font-bold p-2 bg-muted rounded-t-lg">{t('liabilities')}</h3>
                    <table className="w-full text-sm mb-4"><tbody>{liabilityElements}<ReportRow label={t('total_liabilities')} balance={totalLiabilities} level={0} isTotal /></tbody></table>

                    <h3 className="text-lg font-bold p-2 bg-muted rounded-t-lg">{t('equity')}</h3>
                     <table className="w-full text-sm"><tbody>
                        {equityElements}
                        <tr><td style={{paddingInlineStart: `1.5rem`}} className="py-2 px-4">{t('net_profit')}</td><td className="py-2 px-4 text-end font-mono">{formatCurrency(reportData.netProfit)}</td></tr>
                        <ReportRow label={t('total_equity')} balance={totalEquity} level={0} isTotal/>
                     </tbody></table>
                     <table className="w-full text-sm mt-4"><tbody><ReportRow label={t('total_liabilities_and_equity')} balance={totalLiabilities + totalEquity} level={0} isTotal/></tbody></table>
                </div>
            </div>
        )
    }

    const CashFlowView = () => {
        const { netProfit, adjustments, cfo, cfi, cff, netChangeInCash, cashAtStart, cashAtEnd } = reportData.cashFlowReport;
        return (
            <table className="w-full text-sm">
                <tbody>
                    <ReportRow label={t('cash_flow_from_operating_activities')} balance={0} level={0} isHeader />
                    <ReportRow label={t('net_income')} balance={netProfit} level={1} />
                    <ReportRow label={t('adjustments_to_reconcile_net_income')} balance={0} level={1} isNote isSubtotal/>
                    {adjustments.changeInAR !== 0 && <ReportRow label={adjustments.changeInAR > 0 ? t('increase_in_ar') : t('decrease_in_ar')} balance={-adjustments.changeInAR} level={2} />}
                    {adjustments.changeInInventory !== 0 && <ReportRow label={adjustments.changeInInventory > 0 ? t('increase_in_inventory') : t('decrease_in_inventory')} balance={-adjustments.changeInInventory} level={2} />}
                    {adjustments.changeInAP !== 0 && <ReportRow label={adjustments.changeInAP > 0 ? t('increase_in_ap') : t('decrease_in_ap')} balance={adjustments.changeInAP} level={2} />}
                    <ReportRow label={t('net_cash_from_operating')} balance={cfo} level={1} isSubtotal />
                    <tr className="h-4"></tr>
                    <ReportRow label={t('cash_flow_from_investing')} balance={cfi} level={0} isHeader />
                    <tr className="h-4"></tr>
                    <ReportRow label={t('cash_flow_from_financing')} balance={cff} level={0} isHeader />
                    <tr className="h-4"></tr>
                    <ReportRow label={t('net_change_in_cash')} balance={netChangeInCash} level={0} isTotal />
                    <ReportRow label={t('cash_at_beginning')} balance={cashAtStart} level={0} />
                    <ReportRow label={t('cash_at_end')} balance={cashAtStart + netChangeInCash} level={0} />
                </tbody>
            </table>
        )
    }
    
    const TrialBalanceView = () => {
        let totalOBDebit = 0, totalOBCredit = 0, totalPDebit = 0, totalPCredit = 0, totalCBDebit = 0, totalCBCredit = 0;
        return (
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[1000px]">
                <thead><tr className="bg-muted/50"><th rowSpan={2} className="p-2 border border-border text-start">{t('account')}</th><th colSpan={2} className="p-2 border border-border">{t('opening_balance')}</th><th colSpan={2} className="p-2 border border-border">{t('period_movement')}</th><th colSpan={2} className="p-2 border border-border">{t('closing_balance')}</th></tr><tr className="bg-muted/50 text-xs"><th className="p-2 border border-border">{t('debit')}</th><th className="p-2 border border-border">{t('accounting_credit')}</th><th className="p-2 border border-border">{t('debit')}</th><th className="p-2 border border-border">{t('accounting_credit')}</th><th className="p-2 border border-border">{t('debit')}</th><th className="p-2 border border-border">{t('accounting_credit')}</th></tr></thead>
                <tbody className="divide-y divide-border">{chartOfAccounts.map(acc => {
                    const ob = reportData.openingMovements.get(acc.id) || {debit:0, credit:0};
                    const pb = reportData.periodMovements.get(acc.id) || {debit:0, credit:0};
                    const ob_bal = (['Asset', 'Expense'].includes(acc.type)) ? ob.debit - ob.credit : ob.credit - ob.debit;
                    const obDebit = ob_bal > 0 && ['Asset', 'Expense'].includes(acc.type) ? ob_bal : 0;
                    const obCredit = ob_bal > 0 && !['Asset', 'Expense'].includes(acc.type) ? ob_bal : 0;
                    const cb_bal = (['Asset', 'Expense'].includes(acc.type)) ? obDebit + pb.debit - obCredit - pb.credit : obCredit + pb.credit - obDebit - pb.debit;
                    const cbDebit = cb_bal > 0 && ['Asset', 'Expense'].includes(acc.type) ? cb_bal : 0;
                    const cbCredit = cb_bal > 0 && !['Asset', 'Expense'].includes(acc.type) ? cb_bal : 0;
                    totalOBDebit += obDebit; totalOBCredit += obCredit; totalPDebit += pb.debit; totalPCredit += pb.credit; totalCBDebit += cbDebit; totalCBCredit += cbCredit;
                    return (<tr key={acc.id} className="hover:bg-accent font-mono"><td className="p-2 text-start font-sans">{acc.id} - {acc.name}</td><td className="p-2 text-end">{obDebit > 0 ? formatCurrency(obDebit) : '-'}</td><td className="p-2 text-end">{obCredit > 0 ? formatCurrency(obCredit) : '-'}</td><td className="p-2 text-end">{pb.debit > 0 ? formatCurrency(pb.debit) : '-'}</td><td className="p-2 text-end">{pb.credit > 0 ? formatCurrency(pb.credit) : '-'}</td><td className="p-2 text-end">{cbDebit > 0 ? formatCurrency(cbDebit) : '-'}</td><td className="p-2 text-end">{cbCredit > 0 ? formatCurrency(cbCredit) : '-'}</td></tr>)})}
                </tbody>
                <tfoot className="bg-muted font-bold"><tr><td className="p-2 text-start">{t('totals')}</td><td className="p-2 text-end">{formatCurrency(totalOBDebit)}</td><td className="p-2 text-end">{formatCurrency(totalOBCredit)}</td><td className="p-2 text-end">{formatCurrency(totalPDebit)}</td><td className="p-2 text-end">{formatCurrency(totalPCredit)}</td><td className="p-2 text-end">{formatCurrency(totalCBDebit)}</td><td className="p-2 text-end">{formatCurrency(totalCBCredit)}</td></tr></tfoot>
            </table></div>
        );
    }

    // FIX: Changed JSX.Element[] to React.ReactElement[] to resolve the "Cannot find namespace 'JSX'" error.
    const renderAccountHierarchy = (rootAccounts: Account[], balanceFn: (accountId: string) => number, level = 0, isSubtotal=false): {elements: React.ReactElement[], total: number} => {
        let total = 0;
        const elements = rootAccounts.flatMap(acc => {
            if (!acc) return [];
            const children = chartOfAccounts.filter(c => c.parentAccountId === acc.id);
            const childrenResult = renderAccountHierarchy(children, balanceFn, level + 1);
            const selfBalance = balanceFn(acc.id);
            const accountTotal = selfBalance + childrenResult.total;
            total += accountTotal;
            return [<ReportRow key={acc.id} account={acc} balance={accountTotal} level={level} isSubtotal={isSubtotal}/>, ...childrenResult.elements];
        });
        return {elements, total};
    };

    const reportTitle = t(reportType);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <Card className="p-4 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('report_type')}</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value as any)} className="mt-1 block w-full bg-background border border-input rounded-md p-2">
                            <option value="income_statement">{t('income_statement')}</option>
                            <option value="balance_sheet">{t('balance_sheet')}</option>
                            <option value="trial_balance">{t('trial_balance')}</option>
                            <option value="cash_flow_statement">{t('cash_flow_statement')}</option>
                        </select>
                    </div>
                     {reportType !== 'balance_sheet' && (
                        <>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('from')}</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2"/>
                            </div>
                             <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('to')}</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2"/>
                            </div>
                        </>
                    )}
                    {reportType === 'balance_sheet' && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('as_of')}</label>
                            <input type="date" value={endDate} onChange={e => {setEndDate(e.target.value); setStartDate(defaultStartDate);}} className="mt-1 block w-full bg-background border border-input rounded-md p-2"/>
                        </div>
                    )}
                    <div className="flex justify-end">
                         <button onClick={handlePrint} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-secondary/80">
                            <Printer size={18} />
                            <span>{t('print_report')}</span>
                        </button>
                    </div>
                </div>
            </Card>

            <div className="flex-grow overflow-auto p-1 print-parent">
                <div className="print-area bg-card p-6 border rounded-lg">
                     <header className="flex justify-between items-start pb-4 border-b-2 border-primary mb-6">
                        <div>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse text-2xl font-bold text-primary">
                                <Warehouse size={32} />
                                <span className="text-foreground">{companyProfile.name}</span>
                            </div>
                        </div>
                        <div className="text-end">
                            <h1 className="text-3xl font-bold uppercase">{reportTitle}</h1>
                             <p className="text-muted-foreground">{reportType === 'balance_sheet' ? endDate : `${startDate} - ${endDate}`}</p>
                        </div>
                    </header>
                    {reportType === 'income_statement' && <IncomeStatementView />}
                    {reportType === 'balance_sheet' && <BalanceSheetView />}
                    {reportType === 'trial_balance' && <TrialBalanceView />}
                    {reportType === 'cash_flow_statement' && <CashFlowView />}
                </div>
            </div>
        </div>
    );
};

export default FinancialReports;