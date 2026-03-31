'use client';

import { useState } from 'react';
import { Shield, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';
import type { WalletState } from '@/types';

interface AdminPanelProps {
  wallet: WalletState;
  onPollCreated: () => void;
}

const DEFAULT_QUESTION = 'Which Stellar builder track is most exciting?';
const DEFAULT_OPTIONS = ['DeFi', 'NFTs', 'Payments', 'Open Source'];

export default function AdminPanel({ wallet, onPollCreated }: AdminPanelProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [options, setOptions] = useState<string[]>(DEFAULT_OPTIONS);

  const { txState, adminError, handleInitPoll } = useAdmin(
    wallet.address,
    wallet.kit
  );

  const addOption = () => {
    if (options.length < 4) setOptions([...options, '']);
  };

  const removeOption = (i: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  const handleSubmit = async () => {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) return;
    await handleInitPoll(question.trim(), cleanOptions);
    if (txState.status === 'success') onPollCreated();
  };

  const isLoading = txState.status === 'pending';

  if (!wallet.connected) return null;

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 overflow-hidden animate-slide-up delay-500">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-violet-500/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-violet-400" />
          <span className="text-sm font-semibold text-violet-300">Create New Poll</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
            Permissionless
          </span>
        </div>
        {open ? (
          <ChevronUp size={15} className="text-[#8b949e]" />
        ) : (
          <ChevronDown size={15} className="text-[#8b949e]" />
        )}
      </button>

      {/* Form */}
      {open && (
        <div className="px-5 pb-5 border-t border-violet-500/15 pt-4 space-y-4">
          <p className="text-xs text-[#8b949e]">
            Any connected wallet can create a new on-chain poll round. Creating a new round resets visible results for the current poll.
          </p>

          {/* Question input */}
          <div>
            <label className="block text-xs text-[#8b949e] mb-1.5">Poll Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
              className={cn(
                'w-full px-3 py-2.5 rounded-xl text-sm bg-[#050810]',
                'border border-[#1c2333] focus:border-violet-500/50 focus:outline-none',
                'text-[#e6edf3] placeholder-[#8b949e] transition-colors'
              )}
              placeholder="What would you like to ask?"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs text-[#8b949e] mb-1.5">
              Options ({options.length}/4)
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[#8b949e] w-4 text-right">{i + 1}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    disabled={isLoading}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm bg-[#050810]',
                      'border border-[#1c2333] focus:border-violet-500/50 focus:outline-none',
                      'text-[#e6edf3] placeholder-[#8b949e] transition-colors'
                    )}
                    placeholder={`Option ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      disabled={isLoading}
                      className="text-[#8b949e] hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 4 && (
              <button
                onClick={addOption}
                disabled={isLoading}
                className="mt-2 flex items-center gap-1 text-xs text-[#8b949e] hover:text-violet-400 transition-colors"
              >
                <Plus size={13} />
                Add option
              </button>
            )}
          </div>

          {/* Error */}
          {adminError && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              {adminError.message}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !question.trim() || options.filter(Boolean).length < 2}
            className={cn(
              'w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              'bg-violet-600 hover:bg-violet-500 text-white',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Creating on-chain poll…
              </>
            ) : (
              <>
                <Shield size={14} />
                Create Poll On-Chain
              </>
            )}
          </button>

          {txState.status === 'success' && (
            <p className="text-xs text-emerald-400 text-center">
              ✅ Poll created! Reload the page to see it live.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
