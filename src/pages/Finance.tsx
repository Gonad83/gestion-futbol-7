import { useAuth } from '../hooks/useAuth';
import { useCaja } from './finance/useCaja';
import { EncabezadoCaja } from './finance/EncabezadoCaja';
import { TarjetasResumen } from './finance/TarjetasResumen';
import { IndicadoresCaja } from './finance/IndicadoresCaja';
import { PestanaCuotas } from './finance/PestanaCuotas';
import { PestanaMorosidad } from './finance/PestanaMorosidad';
import { PestanaIngresos } from './finance/PestanaIngresos';
import { PestanaGastos } from './finance/PestanaGastos';

/**
 * Caja. Aquí solo se arma la pantalla: los datos y acciones vienen de useCaja
 * y cada bloque se dibuja en su propio archivo en ./finance.
 */
export default function Finance() {
  const { isAdmin, teamId } = useAuth();
  const c = useCaja(teamId, isAdmin);

  return (
    <div className="fade-in pb-20 md:pb-0">
      <EncabezadoCaja isAdmin={isAdmin} exportToPDF={c.exportToPDF} exportToCSV={c.exportToCSV} />

      <TarjetasResumen
        payments={c.payments}
        quotaFilter={c.quotaFilter}
        setQuotaFilter={c.setQuotaFilter}
        selectedMonth={c.selectedMonth}
        totalExpenses={c.totalExpenses}
        balance={c.balance}
        monthlyIncome={c.monthlyIncome}
        allPaidAmount={c.allPaidAmount}
      />

      <IndicadoresCaja balance={c.balance} mesesRespaldo={c.mesesRespaldo} tasaMora={c.tasaMora} />

      <div className="glass-card overflow-hidden p-0">
        <div className="flex border-b border-glass-border">
          {(['cuotas', 'morosidad', 'ingresos', 'gastos'] as const).map(tab => (
            <button
              key={tab}
              className={`flex-1 md:flex-none px-6 py-4 font-semibold text-sm transition-all ${c.activeTab === tab ? (tab === 'morosidad' ? 'bg-red-500/10 text-red-400 border-b-2 border-red-400' : 'bg-soccer-green/10 text-soccer-green border-b-2 border-soccer-green') : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              onClick={() => c.setActiveTab(tab)}
            >
              {tab === 'cuotas' ? 'Control de Cuotas' : tab === 'morosidad' ? `⚠️ Morosidad (${c.morosos.length})` : tab === 'ingresos' ? 'Ingresos de Caja' : 'Registro de Gastos'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {c.loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green"></div>
            </div>
          ) : (
            <>
              {c.activeTab === 'cuotas' && (
                <PestanaCuotas
                  isAdmin={isAdmin}
                  payments={c.payments}
                  filteredPayments={c.filteredPayments}
                  quotaAmount={c.quotaAmount}
                  customAmounts={c.customAmounts}
                  setCustomAmounts={c.setCustomAmounts}
                  paymentMethods={c.paymentMethods}
                  setPaymentMethods={c.setPaymentMethods}
                  editingQuota={c.editingQuota}
                  setEditingQuota={c.setEditingQuota}
                  quotaInput={c.quotaInput}
                  setQuotaInput={c.setQuotaInput}
                  search={c.search}
                  setSearch={c.setSearch}
                  statusFilter={c.statusFilter}
                  setStatusFilter={c.setStatusFilter}
                  selectedMonth={c.selectedMonth}
                  selectedYear={c.selectedYear}
                  prevMonth={c.prevMonth}
                  nextMonth={c.nextMonth}
                  handleSaveQuota={c.handleSaveQuota}
                  handleSetExempt={c.handleSetExempt}
                  handleUnsetExempt={c.handleUnsetExempt}
                  handleCancelPayment={c.handleCancelPayment}
                  handlePaymentToggle={c.handlePaymentToggle}
                />
              )}

              {c.activeTab === 'morosidad' && (
                <PestanaMorosidad
                  morosos={c.morosos}
                  copiedAll={c.copiedAll}
                  setCopiedAll={c.setCopiedAll}
                  copiedPlayer={c.copiedPlayer}
                  setCopiedPlayer={c.setCopiedPlayer}
                  now={new Date()}
                />
              )}

              {c.activeTab === 'ingresos' && (
                <PestanaIngresos
                  isAdmin={isAdmin}
                  cashIncomes={c.cashIncomes}
                  totalCashIncomes={c.totalCashIncomes}
                  showIncomeForm={c.showIncomeForm}
                  setShowIncomeForm={c.setShowIncomeForm}
                  incomeData={c.incomeData}
                  setIncomeData={c.setIncomeData}
                  handleAddIncome={c.handleAddIncome}
                  handleDeleteIncome={c.handleDeleteIncome}
                />
              )}

              {c.activeTab === 'gastos' && (
                <PestanaGastos
                  isAdmin={isAdmin}
                  expenses={c.expenses}
                  showExpenseForm={c.showExpenseForm}
                  setShowExpenseForm={c.setShowExpenseForm}
                  expenseData={c.expenseData}
                  setExpenseData={c.setExpenseData}
                  handleAddExpense={c.handleAddExpense}
                  handleDeleteExpense={c.handleDeleteExpense}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
