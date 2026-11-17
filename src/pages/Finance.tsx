import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Capa } from '../components/Capa';
import { useCaja } from './finance/useCaja';
import { EncabezadoCaja } from './finance/EncabezadoCaja';
import { ResumenCaja } from './finance/ResumenCaja';
import { ResumenMes } from './finance/ResumenMes';
import { PestanaCuotas } from './finance/PestanaCuotas';
import { PestanaMorosidad } from './finance/PestanaMorosidad';
import { PestanaIngresos } from './finance/PestanaIngresos';
import { PestanaGastos } from './finance/PestanaGastos';

type Pestana = 'cuotas' | 'morosidad' | 'ingresos' | 'gastos';

/**
 * Caja. Aquí solo se arma la pantalla: los datos y acciones vienen de useCaja
 * y cada bloque se dibuja en su propio archivo en ./finance.
 * Diseño para celular basado en el concepto de Stitch (docs/diseno/caja-movil-stitch.png):
 * saldo arriba en una tarjeta compacta, avance del mes, pestañas fijas al bajar
 * y la lista de cuotas visible sin tener que bajar mucho.
 */
export default function Finance() {
  const { isAdmin, teamId } = useAuth();
  const c = useCaja(teamId, isAdmin);
  const [menuNuevo, setMenuNuevo] = useState(false);

  const pestanas: { id: Pestana; texto: string; cuenta?: number }[] = [
    { id: 'cuotas', texto: 'Cuotas' },
    { id: 'morosidad', texto: 'Morosos', cuenta: c.morosos.length },
    { id: 'ingresos', texto: 'Ingresos' },
    { id: 'gastos', texto: 'Gastos' },
  ];

  const registrar = (tipo: 'ingresos' | 'gastos') => {
    setMenuNuevo(false);
    c.setActiveTab(tipo);
    if (tipo === 'ingresos') c.setShowIncomeForm(true);
    else c.setShowExpenseForm(true);
  };

  return (
    <div className="fade-in pb-24 md:pb-0 max-w-3xl mx-auto">
      <EncabezadoCaja isAdmin={isAdmin} exportToPDF={c.exportToPDF} exportToCSV={c.exportToCSV} />

      <ResumenCaja
        quotaFilter={c.quotaFilter}
        setQuotaFilter={c.setQuotaFilter}
        selectedMonth={c.selectedMonth}
        totalExpenses={c.totalExpenses}
        balance={c.balance}
        monthlyIncome={c.monthlyIncome}
        allPaidAmount={c.allPaidAmount}
        mesesRespaldo={c.mesesRespaldo}
      />

      <ResumenMes
        isAdmin={isAdmin}
        payments={c.payments}
        quotaAmount={c.quotaAmount}
        selectedMonth={c.selectedMonth}
        selectedYear={c.selectedYear}
        prevMonth={c.prevMonth}
        nextMonth={c.nextMonth}
        editingQuota={c.editingQuota}
        setEditingQuota={c.setEditingQuota}
        quotaInput={c.quotaInput}
        setQuotaInput={c.setQuotaInput}
        handleSaveQuota={c.handleSaveQuota}
      />

      {/* Pestañas: quedan pegadas arriba al bajar por la lista. */}
      <div className="sticky -top-4 md:-top-8 z-20 -mx-4 px-4 pt-4 md:pt-8 pb-3 mb-1 bg-dark-bg/95 backdrop-blur-xl">
        <div role="tablist" aria-label="Secciones de la caja" className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
          style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }}>
          {pestanas.map(t => {
            const activa = c.activeTab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={activa} onClick={() => c.setActiveTab(t.id)}
                className="flex-1 shrink-0 h-11 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                style={activa ? { background: '#44f3a9', color: '#003822' } : { color: 'rgba(255,255,255,0.7)' }}>
                {t.texto}
                {!!t.cuenta && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center tabular-nums"
                    style={activa ? { background: 'rgba(0,56,34,0.2)' } : { background: 'rgba(248,113,113,0.2)', color: '#fca5a5' }}>
                    {t.cuenta}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {c.loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green" />
        </div>
      ) : c.activeTab === 'cuotas' ? (
        <PestanaCuotas
          isAdmin={isAdmin}
          payments={c.payments}
          filteredPayments={c.filteredPayments}
          quotaAmount={c.quotaAmount}
          customAmounts={c.customAmounts}
          setCustomAmounts={c.setCustomAmounts}
          paymentMethods={c.paymentMethods}
          setPaymentMethods={c.setPaymentMethods}
          search={c.search}
          setSearch={c.setSearch}
          statusFilter={c.statusFilter}
          setStatusFilter={c.setStatusFilter}
          selectedMonth={c.selectedMonth}
          selectedYear={c.selectedYear}
          handleSetExempt={c.handleSetExempt}
          handleUnsetExempt={c.handleUnsetExempt}
          handleCancelPayment={c.handleCancelPayment}
          handlePaymentToggle={c.handlePaymentToggle}
        />
      ) : (
        <div className="rounded-2xl p-4 sm:p-6" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
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
        </div>
      )}

      {/* Botón flotante para anotar un ingreso o un gasto (solo capitán). */}
      {isAdmin && (
        <Capa>
          <div className="fixed right-4 z-30 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-8 md:right-8 flex flex-col items-end gap-2">
            {menuNuevo && (
              <div className="flex flex-col gap-2 scale-in" role="menu">
                <button type="button" role="menuitem" onClick={() => registrar('ingresos')}
                  className="h-11 px-4 rounded-full flex items-center gap-2 text-sm font-bold text-white cursor-pointer shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)]"
                  style={{ background: '#262a31', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <TrendingUp size={16} className="text-soccer-green" /> Registrar ingreso
                </button>
                <button type="button" role="menuitem" onClick={() => registrar('gastos')}
                  className="h-11 px-4 rounded-full flex items-center gap-2 text-sm font-bold text-white cursor-pointer shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)]"
                  style={{ background: '#262a31', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <TrendingDown size={16} className="text-red-400" /> Registrar gasto
                </button>
              </div>
            )}
            <button type="button" onClick={() => setMenuNuevo(v => !v)} aria-expanded={menuNuevo} aria-haspopup="menu"
              className="h-14 pl-4 pr-5 rounded-full flex items-center gap-2 font-headline font-bold text-[#003822] cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', boxShadow: '0 10px 30px -6px rgba(68,243,169,0.5)' }}>
              <Plus size={22} className={`transition-transform ${menuNuevo ? 'rotate-45' : ''}`} /> Registrar
            </button>
          </div>
        </Capa>
      )}
    </div>
  );
}
