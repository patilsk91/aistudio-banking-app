import React, { useState } from 'react';
import { Account, Transaction, Loan } from '../types';
import { 
  Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, CreditCard, 
  RefreshCw, CircleAlert, DollarSign, Send, Percent, Landmark 
} from 'lucide-react';

interface BankingPortalProps {
  accounts: Account[];
  selectedAccount: Account | null;
  onSelectAccount: (acc: Account) => void;
  onAction: (
    actionName: string, 
    endpoint: string, 
    method: 'GET' | 'POST', 
    body?: any
  ) => Promise<void>;
  isProcessing: boolean;
}

export default function BankingPortal({
  accounts,
  selectedAccount,
  onSelectAccount,
  onAction,
  isProcessing
}: BankingPortalProps) {
  const [activeTab, setActiveTab] = useState<'transfer' | 'deposit' | 'loan'>('transfer');
  
  // Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccDeposit, setNewAccDeposit] = useState('100');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('250');
  const [transferMemo, setTransferMemo] = useState('P2P Rent Reimbursement');

  const [depositAmount, setDepositAmount] = useState('500');
  const [depositMemo, setDepositMemo] = useState('OTC ATM Cash Credit');

  const [loanAmount, setLoanAmount] = useState('5000');
  const [loanTerm, setLoanTerm] = useState('12');
  const [loanPurpose, setLoanPurpose] = useState('Business Expansion Capital');

  // Error/Success state inside portal
  const [portalFeedback, setPortalFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const triggerFeedback = (type: 'success' | 'error', msg: string) => {
    setPortalFeedback({ type, msg });
    setTimeout(() => setPortalFeedback(null), 6000);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    
    try {
      await onAction('Create Bank Account', '/api/gateway/accounts', 'POST', {
        name: newAccName,
        initialDeposit: Number(newAccDeposit)
      });
      setNewAccName('');
      setNewAccDeposit('100');
      setShowCreateForm(false);
      triggerFeedback('success', 'Account provisioning request processed successfully.');
    } catch (err: any) {
      triggerFeedback('error', err?.message || 'Error occurred during account creation.');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !transferTo || !transferAmount) return;

    try {
      await onAction('Inter-Account Transfer', '/api/gateway/transactions/transfer', 'POST', {
        fromAccount: selectedAccount.accountNumber,
        toAccount: transferTo,
        amount: Number(transferAmount),
        notes: transferMemo
      });
      setTransferAmount('250');
      setTransferMemo('P2P Rent Reimbursement');
      triggerFeedback('success', `Transferred $${Number(transferAmount).toLocaleString()} successfully.`);
    } catch (err: any) {
      triggerFeedback('error', err?.message || 'Transaction could not be cleared.');
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !depositAmount) return;

    try {
      await onAction('Over-the-Counter Deposit', '/api/gateway/accounts/deposit', 'POST', {
        accountNumber: selectedAccount.accountNumber,
        amount: Number(depositAmount),
        notes: depositMemo
      });
      setDepositAmount('500');
      setDepositMemo('OTC ATM Cash Credit');
      triggerFeedback('success', `Deposited $${Number(depositAmount).toLocaleString()} successfully.`);
    } catch (err: any) {
      triggerFeedback('error', err?.message || 'Deposit gateway timed out.');
    }
  };

  const handleLoanApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !loanAmount) return;

    try {
      await onAction('Underwrite Consumer Loan', '/api/gateway/loans/apply', 'POST', {
        accountNumber: selectedAccount.accountNumber,
        amount: Number(loanAmount),
        termMonths: Number(loanTerm),
        purpose: loanPurpose
      });
      setLoanAmount('5000');
      triggerFeedback('success', 'Underwriting logic evaluated. Decision registered.');
    } catch (err: any) {
      triggerFeedback('error', err?.message || 'Underwriting rules could not be evaluated.');
    }
  };

  const handleToggleCard = async () => {
    if (!selectedAccount) return;
    try {
      await onAction('Toggle Card Lock', '/api/gateway/accounts/card/toggle', 'POST', {
        accountNumber: selectedAccount.accountNumber
      });
      triggerFeedback('success', `Card status modified to: ${selectedAccount.card.status === 'active' ? 'Frozen' : 'Active'}`);
    } catch (err: any) {
      triggerFeedback('error', err?.message || 'Card status modification failed.');
    }
  };

  return (
    <div id="banking-portal-container" className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-2xl flex flex-col h-full justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">Simulated Retail Bank Client Portal</h2>
          </div>
          <button 
            onClick={() => onAction('Fetch Current State', '/api/gateway/accounts', 'GET')}
            disabled={isProcessing}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-750 hover:text-white transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-slate-400' : 'text-slate-300'}`} />
          </button>
        </div>

        {/* Portal Alerts */}
        {portalFeedback && (
          <div className={`p-2.5 rounded-xl text-xs mb-4 flex items-start gap-2 border ${
            portalFeedback.type === 'success' 
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
              : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
          }`}>
            {portalFeedback.type === 'success' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <CircleAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{portalFeedback.type === 'success' ? 'Gateway Success' : 'Service Chain Error'}</p>
              <p className="text-[11px] opacity-90 mt-0.5">{portalFeedback.msg}</p>
            </div>
          </div>
        )}

        {/* Account Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400">Selected Ledger Account</label>
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-350 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Account
            </button>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateAccount} className="bg-slate-950 border border-slate-850 p-3 rounded-xl mb-3">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">HOLDER NAME</label>
                  <input 
                    type="text" 
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder="E.g. Courtney Henry"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">INITIAL DEPOSIT ($)</label>
                  <input 
                    type="number" 
                    value={newAccDeposit}
                    onChange={(e) => setNewAccDeposit(e.target.value)}
                    placeholder="100"
                    min="0"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-1.5">
                <button 
                  type="button" 
                  onClick={() => setShowCreateForm(false)}
                  className="px-2.5 py-1 bg-slate-800 text-[10px] font-bold text-slate-400 hover:bg-slate-750 rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-550 text-[10px] font-bold text-white rounded transition cursor-pointer"
                >
                  Provision Account
                </button>
              </div>
            </form>
          ) : (
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {accounts.map(acc => (
                <button
                  key={acc.accountNumber}
                  onClick={() => onSelectAccount(acc)}
                  className={`px-3 py-2 rounded-xl text-left shrink-0 border transition-all duration-200 min-w-[130px] cursor-pointer ${
                    selectedAccount?.accountNumber === acc.accountNumber
                      ? 'bg-slate-800 border-indigo-500 text-white ring-1 ring-indigo-500/20 shadow-md shadow-indigo-500/5'
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <p className="text-[10px] font-bold truncate max-w-[110px]">{acc.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{acc.accountNumber}</p>
                  <p className="text-xs font-bold text-indigo-400 mt-1">${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Credit Card Graphic */}
        {selectedAccount && (
          <div className="relative h-44 rounded-2xl mb-5 overflow-hidden border border-slate-800 shadow-2xl bg-gradient-to-br from-indigo-950/90 via-slate-950 to-indigo-950/80 flex flex-col justify-between p-4 transition-all duration-300">
            {/* Top Row */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] tracking-widest font-mono text-slate-400 font-bold uppercase">DIGITAL CREDIT DEBIT CARD</p>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">Secure Vault Node</p>
              </div>
              <div className="flex flex-col items-end">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-tight border ${
                  selectedAccount.card.status === 'active' 
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' 
                    : 'bg-rose-950 text-rose-400 border-rose-500/30 animate-pulse'
                }`}>
                  {selectedAccount.card.status === 'active' ? '● AUTHORIZED' : '● FROZEN'}
                </span>
              </div>
            </div>

            {/* Middle Row (Chip / NFC Symbol) */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <div className="w-6 h-4 border border-amber-500/20 rounded-sm grid grid-cols-2" />
              </div>
              <div className="text-slate-500 font-mono text-xs">🔒 Secure Chip</div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-mono tracking-widest text-slate-100 font-semibold">{selectedAccount.card.cardNumber}</p>
                <div className="flex gap-4 mt-2 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500 mr-1">EXP</span>
                    <span className="text-slate-300 font-bold">{selectedAccount.card.expiry}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-1">CVV</span>
                    <span className="text-slate-300 font-bold">{selectedAccount.card.cvv}</span>
                  </div>
                  <div className="truncate max-w-[120px]">
                    <span className="text-slate-300 font-bold tracking-wider uppercase">{selectedAccount.name}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleCard}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition shrink-0 cursor-pointer ${
                  selectedAccount.card.status === 'active'
                    ? 'bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-800'
                    : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                }`}
              >
                {selectedAccount.card.status === 'active' ? 'Freeze Card' : 'Unfreeze Card'}
              </button>
            </div>
          </div>
        )}

        {/* Action Tabs Headers */}
        <div className="flex border-b border-slate-850 gap-1 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-3 py-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'transfer' 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Transfer Funds
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-3 py-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'deposit' 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cash Deposit
          </button>
          <button
            onClick={() => setActiveTab('loan')}
            className={`px-3 py-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'loan' 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Apply for Loan
          </button>
        </div>

        {/* Action Forms */}
        {selectedAccount && (
          <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl shadow-inner">
            {activeTab === 'transfer' && (
              <form onSubmit={handleTransfer}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">RECIPIENT ACCOUNT</label>
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      required
                    >
                      <option value="">Select Recipient...</option>
                      {accounts
                        .filter(a => a.accountNumber !== selectedAccount.accountNumber)
                        .map(a => (
                          <option key={a.accountNumber} value={a.accountNumber}>
                            {a.name} ({a.accountNumber})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">AMOUNT ($)</label>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Amount"
                      min="1"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">MEMO / INSTRUCTION NOTES</label>
                  <input
                    type="text"
                    value={transferMemo}
                    onChange={(e) => setTransferMemo(e.target.value)}
                    placeholder="Payment Ref"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white py-2 rounded-lg transition-all shadow-md hover:shadow-indigo-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Clear Interbank Transfer
                </button>
              </form>
            )}

            {activeTab === 'deposit' && (
              <form onSubmit={handleDeposit}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">DESTINATION ACCOUNT</label>
                    <input
                      type="text"
                      value={`${selectedAccount.name} (${selectedAccount.accountNumber})`}
                      disabled
                      className="w-full bg-slate-900/50 border border-slate-800/80 rounded px-2.5 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">DEPOSIT AMOUNT ($)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Amount"
                      min="1"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">DEPOSIT MEMO / DETAILS</label>
                  <input
                    type="text"
                    value={depositMemo}
                    onChange={(e) => setDepositMemo(e.target.value)}
                    placeholder="Deposit Ref"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white py-2 rounded-lg transition-all shadow-md hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Process OTC Deposit
                </button>
              </form>
            )}

            {activeTab === 'loan' && (
              <form onSubmit={handleLoanApply}>
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">PRINCIPAL LOAN AMOUNT ($)</label>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      min="1"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">TERM (MONTHS)</label>
                    <select
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="6">6 mo</option>
                      <option value="12">12 mo</option>
                      <option value="24">24 mo</option>
                      <option value="36">36 mo</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">BUSINESS PURPOSE DESCRIPTION</label>
                  <input
                    type="text"
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    placeholder="e.g. Purchase of storage inventory"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white py-2 rounded-lg transition-all shadow-md hover:shadow-indigo-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Percent className="w-3.5 h-3.5" /> Submit to Algorithmic Underwriter
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Credit Loans Summary */}
      {selectedAccount && selectedAccount.loans.length > 0 && (
        <div className="mt-4 border-t border-slate-800/80 pt-3">
          <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Approved Loan Liabilities</label>
          <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
            {selectedAccount.loans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-850/60 text-[10px]">
                <div>
                  <span className="font-semibold text-slate-300">Loan {loan.id}</span>
                  <span className="text-slate-500 font-medium ml-2">(${loan.amount.toLocaleString()} for {loan.termMonths}mo)</span>
                  <p className="text-[9px] text-slate-400 italic mt-0.5">Purpose: {loan.purpose}</p>
                </div>
                <div className="text-right">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    loan.status === 'approved' 
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/30' 
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800/30'
                  }`}>
                    {loan.status.toUpperCase()}
                  </span>
                  <p className="text-[8px] text-slate-500 mt-1">Score: {loan.creditScore}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
