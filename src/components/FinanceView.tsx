import React, { useState, useEffect, useMemo } from 'react';
import { Coins, CirclePercent, ArrowUpRight, ArrowDownRight, Plus, FileText, CheckCircle2, AlertCircle, ShoppingBag, Landmark, Eye, X, Trash2, Edit } from 'lucide-react';
import { Booking, Expense, ExpenseCategory } from '../types';
import { SEED_EXPENSES } from '../utils/seed';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
import DateRangeFilter from './DateRangeFilter';
import { DateRange, makeRange, inRange } from '../utils/dateFilter';
import { createPortal } from 'react-dom';

const EXPENSES_STORAGE_KEY = 'sole_expenses';

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Guide', 'Ticket', 'Radio', 'Staff Salary', 'Other'];

interface FinanceViewProps {
  bookings: Booking[];
  onUpdateBookingPaymentStatus?: (ref: string, paymentStatus: Booking['paymentStatus']) => void;
}

export default function FinanceView({ bookings, onUpdateBookingPaymentStatus }: FinanceViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Log/Edit Expense Modal State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Guide');
  const [customCategory, setCustomCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState('');

  // Date-range filter (Today / Week / Month / Year), defaults to Month.
  const [range, setRange] = useState<DateRange>(() => makeRange('month', new Date()));

  // Lightbox modal for receipts
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);
  
  // Custom dialogs state
  const [deleteExpenseConfirmId, setDeleteExpenseConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (stored) {
      try {
        setExpenses(JSON.parse(stored));
      } catch (e) {
        setExpenses(SEED_EXPENSES);
      }
    } else {
      setExpenses(SEED_EXPENSES);
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(SEED_EXPENSES));
    }
  }, []);

  // Sync edit states
  useEffect(() => {
    if (editingExpense) {
      setNewCategory(editingExpense.category);
      setCustomCategory(editingExpense.customCategory || '');
      setNewAmount(editingExpense.amount.toString());
      setNewDesc(editingExpense.description);
      setNewDate(editingExpense.date);
      setReceiptUrl(editingExpense.receiptUrl || '');
    } else {
      setNewCategory('Guide');
      setCustomCategory('');
      setNewAmount('');
      setNewDesc('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setReceiptUrl('');
    }
  }, [editingExpense]);

  const saveExpenses = (list: Expense[]) => {
    setExpenses(list);
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(list));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || !newDesc) return;

    if (newCategory === 'Other' && !customCategory.trim()) {
      alert("Please specify the custom category detail.");
      return;
    }

    if (editingExpense) {
      // Edit mode
      const updated = expenses.map(ex => {
        if (ex.id === editingExpense.id) {
          return {
            ...ex,
            category: newCategory,
            customCategory: newCategory === 'Other' ? customCategory.trim() : undefined,
            amount: parseFloat(newAmount) || 0,
            date: newDate,
            description: newDesc,
            receiptUrl: receiptUrl.trim() || undefined
          };
        }
        return ex;
      });
      saveExpenses(updated);
      setEditingExpense(null);
    } else {
      // Add mode
      const newExp: Expense = {
        id: `EXP-${500 + expenses.length + 1}`,
        category: newCategory,
        customCategory: newCategory === 'Other' ? customCategory.trim() : undefined,
        amount: parseFloat(newAmount) || 0,
        date: newDate,
        description: newDesc,
        status: 'Approved',
        receiptUrl: receiptUrl.trim() || undefined
      };
      const updated = [newExp, ...expenses];
      saveExpenses(updated);
    }

    // Reset Form
    setNewAmount('');
    setNewDesc('');
    setCustomCategory('');
    setReceiptUrl('');
    setShowAddForm(false);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(ex => ex.id !== id);
    saveExpenses(updated);
    setDeleteExpenseConfirmId(null);
  };

  // Filtered lists
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => inRange(b.travelDate, range));
  }, [bookings, range]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => inRange(e.date, range));
  }, [expenses, range]);

  // Financial calculations based on filtered lists - All expenses are considered active/approved costs
  const totalRevenue = useMemo(() => {
    return filteredBookings
      .filter(b => b.status === 'Confirmed')
      .reduce((sum, b) => sum + b.amount, 0);
  }, [filteredBookings]);

  const totalExpensesApproved = useMemo(() => {
    return filteredExpenses
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const netIncome = totalRevenue - totalExpensesApproved;
  const marginPercentage = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => {
      const catName = curr.category === 'Other' && curr.customCategory
        ? `Other (${curr.customCategory})`
        : curr.category;
      acc[catName] = (acc[catName] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredExpenses]);

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Sole Finance & Corporate Ledger</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Audit tour receipts, track operational expenses, process guide fees, and assess business margins.</p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowAddForm(true);
          }}
          className="w-full sm:w-auto justify-center bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center gap-2 transition duration-200 shadow-lg shadow-orange-600/15 cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Log Expense</span>
        </button>
      </div>

      {/* Date Filtering Bar */}
      <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
        <DateRangeFilter onChange={setRange} />
      </div>

      {/* Finance Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-sans">Gross Revenue</span>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-2xl font-black text-slate-900">€{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold">Sum of active confirmed tours</span>
        </div>

        <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-sans">Total Operational Costs</span>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-2xl font-black text-slate-900">€{totalExpensesApproved.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <ArrowDownRight className="w-5 h-5 text-rose-500" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold">Approved fuel, catering, repairs</span>
        </div>

        <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-sans">Operating Net Income</span>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-2xl font-black text-emerald-600">€{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <Landmark className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold">Revenue minus approved expenses</span>
        </div>

        <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-sans">Net Profit Margin</span>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-2xl font-black text-orange-600">{marginPercentage.toFixed(1)}%</h3>
            <CirclePercent className="w-5 h-5 text-orange-600" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold">High yield luxury service model</span>
        </div>
      </div>

      {/* Allocation breakdown and audit ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost allocation breakdown */}
        <div className="lg:col-span-1 bg-white/40 border border-slate-200/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800 mb-4 font-sans">Expense Category Allocation</h3>
          <div className="space-y-4">
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center font-semibold">No approved expenses logged in this window.</p>
            ) : (
              Object.entries(expensesByCategory).map(([cat, amount]) => {
                const amountNum = amount as number;
                const pct = totalExpensesApproved > 0 ? (amountNum / totalExpensesApproved) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 truncate mr-2" title={cat}>{cat}</span>
                      <span className="font-extrabold text-slate-800 shrink-0">€{amountNum.toFixed(2)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#0b1220] to-orange-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expense audit list */}
        <div className="lg:col-span-2 bg-white/40 border border-slate-200/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800 font-sans">Expense Audit ledger</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-center">Receipt</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-semibold">No expenses logged.</td>
                  </tr>
                ) : (
                  filteredExpenses.map(ex => {
                    return (
                      <tr key={ex.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 font-mono font-bold text-orange-600">{ex.id}</td>
                        <td className="py-3 font-bold text-slate-800">
                          {ex.category === 'Other' && ex.customCategory
                            ? `Other: ${ex.customCategory}`
                            : ex.category}
                        </td>
                        <td className="py-3 text-slate-500 font-semibold">{ex.date}</td>
                        <td className="py-3 text-slate-600 font-semibold max-w-xs truncate" title={ex.description}>{ex.description}</td>
                        <td className="py-3 text-right font-black text-slate-900">€{ex.amount.toFixed(2)}</td>
                        <td className="py-3 text-center">
                          {ex.receiptUrl ? (
                            <button
                              onClick={() => setActiveReceiptUrl(ex.receiptUrl || null)}
                              className="p-1.5 rounded bg-orange-50 border border-orange-100 text-orange-600 hover:bg-orange-100 transition cursor-pointer"
                              title="View Attached Invoice/Receipt"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-350 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setEditingExpense(ex);
                                setShowAddForm(true);
                              }}
                              title="Edit Expense"
                              className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-orange-650 hover:bg-orange-50 hover:border-orange-100 transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteExpenseConfirmId(ex.id)}
                              title="Delete Expense"
                              className="p-1.5 rounded bg-slate-50 border border-slate-205 text-slate-500 hover:text-rose-650 hover:bg-rose-50 hover:border-rose-100 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice management segment */}
      <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800 mb-4 font-sans">Active Booking Receipts & Payment Auditing</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="pb-3">Receipt Code</th>
                <th className="pb-3">Client</th>
                <th className="pb-3">Tour Name</th>
                <th className="pb-3">Travel Date</th>
                <th className="pb-3 text-right">Invoice Amount</th>
                <th className="pb-3 text-center">Receipt Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.filter(b => b.status !== 'Cancelled').map(b => (
                <tr key={b.bookingRef} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 font-mono font-bold text-orange-600">{b.bookingRef}</td>
                  <td className="py-3.5 font-extrabold text-slate-800">{b.leadTraveler}</td>
                  <td className="py-3.5 text-slate-600 font-semibold truncate max-w-xs">{b.tourName}</td>
                  <td className="py-3.5 text-slate-500 font-semibold">{b.travelDate}</td>
                  <td className="py-3.5 text-right font-black text-slate-900">€{b.amount.toFixed(2)}</td>
                  <td className="py-3.5 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                      b.paymentStatus === 'Paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                      b.paymentStatus === 'Partially Paid' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                      'bg-rose-50 border-rose-200 text-rose-600'
                    }`}>
                      {b.paymentStatus || 'Unpaid'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

       {/* ─── Log/Edit Expense Modal (Overlay click-to-close & full background blur) ─── */}
      {createPortal(
        <AnimatePresence>
          {showAddForm && (
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
              onClick={() => {
                setShowAddForm(false);
                setEditingExpense(null);
              }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-md w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingExpense(null);
                  }}
                  className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                  <Coins className="w-5 h-5 text-emerald-600" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 font-sans mb-1">
                  {editingExpense ? 'Edit Operational Expense' : 'Record Operational Expense'}
                </h3>
                <p className="text-slate-455 text-xs font-semibold mb-5">
                  {editingExpense ? 'Modify logged ledger entry for corporate travel accounts.' : 'Record a new cash flow expenditure in Sole Ledger.'}
                </p>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as ExpenseCategory)}
                      className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {newCategory === 'Other' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-1.5"
                    >
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Specify Custom Category *</label>
                      <input
                        type="text"
                        required
                        placeholder="Specify expense type detail..."
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        placeholder="250.00"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
                      <CustomDatePicker value={newDate} onChange={setNewDate} type="date" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description *</label>
                    <input
                      type="text"
                      required
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="e.g. Mercedes V-Class fuel refill"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice Attachment Image URL</label>
                    <input
                      type="text"
                      value={receiptUrl}
                      onChange={e => setReceiptUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or upload"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingExpense(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-655 hover:bg-slate-50 border border-slate-200/80 cursor-pointer active:scale-95 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-700 shadow-md cursor-pointer active:scale-95 transition"
                    >
                      {editingExpense ? 'Save Changes' : 'Log Expense'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Custom Confirm Delete Expense Modal ─── */}
      {createPortal(
        <AnimatePresence>
          {deleteExpenseConfirmId && (
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
              onClick={() => setDeleteExpenseConfirmId(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl max-w-sm w-full relative border border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Ledger Expense</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to delete this expense record? This action will permanently remove it from the Sole Finance accounts.
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteExpenseConfirmId(null)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(deleteExpenseConfirmId)}
                    className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer transition active:scale-95"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Receipt Attachment Lightbox Overlay (Overlay click-to-close) ─── */}
      {createPortal(
        <AnimatePresence>
          {activeReceiptUrl && (
            <div 
              className="fixed inset-0 bg-slate-955/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 cursor-zoom-out"
              onClick={() => setActiveReceiptUrl(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => setActiveReceiptUrl(null)}
                  className="absolute -top-10 right-0 p-2 rounded bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <img 
                  src={activeReceiptUrl} 
                  alt="Receipt Attachment" 
                  className="w-full rounded-2xl border border-white/20 shadow-2xl max-h-[75vh] object-contain bg-slate-900"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
