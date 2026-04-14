import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Zap, Layout, Code } from 'lucide-react';
import { NFA, State, Symbol, regexToNFA } from '../lib/automata';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentNFA: NFA;
  onSave: (nfa: NFA) => void;
}

type Mode = 'regex' | 'table' | 'raw';

export function CustomNFAModal({ isOpen, onClose, currentNFA, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<Mode>('regex');
  const [error, setError] = useState<string | null>(null);
  const [newSymbolInput, setNewSymbolInput] = useState('');

  // Regex State
  const [regexInput, setRegexInput] = useState('');

  // Raw State (Existing)
  const [statesInput, setStatesInput] = useState('');
  const [alphabetInput, setAlphabetInput] = useState('');
  const [startInput, setStartInput] = useState('');
  const [acceptInput, setAcceptInput] = useState('');
  const [transitionsInput, setTransitionsInput] = useState('');

  // Tabular State
  const [tableStates, setTableStates] = useState<string[]>([]);
  const [tableAlphabet, setTableAlphabet] = useState<string[]>([]);
  const [tableStart, setTableStart] = useState('');
  const [tableAccept, setTableAccept] = useState<string[]>([]);
  const [tableTransitions, setTableTransitions] = useState<Record<string, Record<string, string[]>>>({});

  useEffect(() => {
    if (isOpen) {
      // Sync Raw
      setStatesInput(currentNFA.states.join(', '));
      setAlphabetInput(currentNFA.alphabet.join(', '));
      setStartInput(currentNFA.start);
      setAcceptInput(currentNFA.accept.join(', '));
      
      const lines: string[] = [];
      Object.entries(currentNFA.transitions).forEach(([from, trans]) => {
        Object.entries(trans).forEach(([symbol, tos]) => {
          lines.push(`${from}, ${symbol} -> ${tos.join(', ')}`);
        });
      });
      setTransitionsInput(lines.join('\n'));

      // Sync Table
      setTableStates(currentNFA.states);
      setTableAlphabet(currentNFA.alphabet);
      setTableStart(currentNFA.start);
      setTableAccept(currentNFA.accept);
      setTableTransitions(JSON.parse(JSON.stringify(currentNFA.transitions)));
      setNewSymbolInput('');

      setError(null);
    }
  }, [isOpen, currentNFA]);

  if (!isOpen) return null;

  const handleAddSymbol = () => {
    const normalized = newSymbolInput.trim();
    if (!normalized) {
      setError('Symbol cannot be empty.');
      return;
    }
    if (normalized === 'ε') {
      setError("'ε' is reserved for epsilon transitions and already available.");
      return;
    }
    if (normalized.includes(',')) {
      setError('Enter a single symbol at a time (no commas).');
      return;
    }
    if (tableAlphabet.includes(normalized)) {
      setError(`Symbol '${normalized}' already exists.`);
      return;
    }

    setTableAlphabet([...tableAlphabet, normalized]);
    setNewSymbolInput('');
    setError(null);
  };

  const handleRemoveSymbol = () => {
    const normalized = newSymbolInput.trim();
    if (!normalized) {
      setError('Enter a symbol to remove.');
      return;
    }
    if (normalized === 'ε') {
      setError("'ε' cannot be removed from table controls.");
      return;
    }
    if (!tableAlphabet.includes(normalized)) {
      setError(`Symbol '${normalized}' does not exist.`);
      return;
    }

    const nextAlphabet = tableAlphabet.filter((s) => s !== normalized);
    const nextTransitions: Record<string, Record<string, string[]>> = JSON.parse(JSON.stringify(tableTransitions));
    Object.keys(nextTransitions).forEach((state) => {
      if (nextTransitions[state]?.[normalized]) {
        delete nextTransitions[state][normalized];
      }
    });

    setTableAlphabet(nextAlphabet);
    setTableTransitions(nextTransitions);
    setNewSymbolInput('');
    setError(null);
  };

  const handleRegexApply = () => {
    try {
      if (!regexInput.trim()) throw new Error("Please enter a regular expression.");
      const generatedNFA = regexToNFA(regexInput.trim());
      onSave(generatedNFA);
      onClose();
    } catch (err: any) {
      setError(`Regex Error: ${err.message}`);
    }
  };

  const handleTableSave = () => {
    try {
      if (!tableStart) throw new Error("Start state must be defined.");
      if (!tableStates.includes(tableStart)) throw new Error(`Start state '${tableStart}' is not in states list.`);

      tableAccept.forEach((s) => {
        if (!tableStates.includes(s)) {
          throw new Error(`Accept state '${s}' is not in states list.`);
        }
      });

      const allowedSymbols = new Set(['ε', ...tableAlphabet]);
      const normalizedTransitions: Record<string, Record<string, string[]>> = {};

      tableStates.forEach((from) => {
        normalizedTransitions[from] = {};
      });

      Object.entries(tableTransitions as Record<string, Record<string, string[]>>).forEach(([from, bySymbol]) => {
        if (!tableStates.includes(from)) {
          throw new Error(`Unknown source state '${from}' in transition table.`);
        }

        Object.entries(bySymbol).forEach(([sym, tos]) => {
          if (!allowedSymbols.has(sym)) {
            throw new Error(`Unknown symbol '${sym}' in transition table.`);
          }

          const cleanedTargets = Array.from(
            new Set(
              tos
                .map((t) => t.trim())
                .filter((t) => t.length > 0 && t !== '-' && t !== '∅')
            )
          );

          cleanedTargets.forEach((target) => {
            if (!tableStates.includes(target)) {
              throw new Error(`Unknown target state '${target}' in transition '${from}, ${sym}'.`);
            }
          });

          if (cleanedTargets.length > 0) {
            normalizedTransitions[from][sym] = cleanedTargets;
          }
        });
      });

      onSave({
        states: tableStates,
        alphabet: tableAlphabet,
        transitions: normalizedTransitions,
        start: tableStart,
        accept: tableAccept
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRawSave = () => {
    try {
      const states = statesInput.split(',').map(s => s.trim()).filter(Boolean);
      const alphabet = alphabetInput.split(',').map(s => s.trim()).filter(Boolean);
      const start = startInput.trim();
      const accept = acceptInput.split(',').map(s => s.trim()).filter(Boolean);

      if (states.length === 0) throw new Error("States cannot be empty.");
      if (alphabet.length === 0) throw new Error("Alphabet cannot be empty.");
      if (!start) throw new Error("Start state cannot be empty.");

      const transitions: Record<State, Record<Symbol, State[]>> = {};
      states.forEach(s => transitions[s] = {});

      const transLines = transitionsInput.split('\n').map(l => l.trim()).filter(Boolean);
      transLines.forEach(line => {
        const parts = line.split('->').map(s => s.trim());
        if (parts.length !== 2) throw new Error(`Invalid transition format: ${line}`);
        
        const [left, right] = parts;
        const leftParts = left.split(',').map(s => s.trim());
        if (leftParts.length !== 2) throw new Error(`Invalid transition left side: ${left}`);
        
        const [from, symRaw] = leftParts;
        const symbol = (symRaw.toLowerCase() === 'e' || symRaw === 'ε') ? 'ε' : symRaw;
        const tos = right.split(',').map(s => s.trim()).filter(Boolean);

        if (!states.includes(from)) throw new Error(`Unknown state in transition: ${from}`);
        tos.forEach(t => {
          if (!states.includes(t)) throw new Error(`Unknown target state: ${t}`);
        });
        if (symbol !== 'ε' && !alphabet.includes(symbol)) throw new Error(`Unknown symbol: ${symbol}`);

        if (!transitions[from][symbol]) transitions[from][symbol] = [];
        transitions[from][symbol].push(...tos);
        transitions[from][symbol] = Array.from(new Set(transitions[from][symbol]));
      });

      if (!states.includes(start)) throw new Error(`Start state '${start}' is not in states list.`);
      accept.forEach(a => {
        if (!states.includes(a)) throw new Error(`Accept state '${a}' is not in states list.`);
      });

      onSave({ states, alphabet, transitions, start, accept });
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateTableTransition = (from: string, sym: string, val: string) => {
    const tos = val
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s !== '-' && s !== '∅');
    const newTrans = { ...tableTransitions };
    if (!newTrans[from]) newTrans[from] = {};
    if (tos.length === 0) {
      delete newTrans[from][sym];
    } else {
      newTrans[from][sym] = Array.from(new Set(tos));
    }
    setTableTransitions(newTrans);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 font-sans">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
              <Zap className="text-[var(--color-accent)]" size={20} />
              Construct Custom NFA
            </h2>
            <p className="text-[11px] text-[#555] mt-1 font-mono uppercase tracking-widest">Select construction architecture</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-2 bg-white/5 mx-6 mt-4 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('regex')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] uppercase tracking-wider transition-all ${activeTab === 'regex' ? 'bg-[#111] text-white shadow-xl' : 'text-[#888] hover:text-white hover:bg-white/5'}`}
          >
            <Zap size={14} className={activeTab === 'regex' ? 'text-[var(--color-accent)]' : ''} />
            Regular Expression
          </button>
          <button 
            onClick={() => setActiveTab('table')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] uppercase tracking-wider transition-all ${activeTab === 'table' ? 'bg-[#111] text-white shadow-xl' : 'text-[#888] hover:text-white hover:bg-white/5'}`}
          >
            <Layout size={14} className={activeTab === 'table' ? 'text-[var(--color-accent)]' : ''} />
            Transition Table
          </button>
          <button 
            onClick={() => setActiveTab('raw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] uppercase tracking-wider transition-all ${activeTab === 'raw' ? 'bg-[#111] text-white shadow-xl' : 'text-[#888] hover:text-white hover:bg-white/5'}`}
          >
            <Code size={14} className={activeTab === 'raw' ? 'text-[var(--color-accent)]' : ''} />
            Raw Definition
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] p-4 rounded-xl flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          {activeTab === 'regex' && (
            <div className="flex flex-col gap-8 h-full items-center justify-center max-w-lg mx-auto py-10">
              <div className="text-center">
                <h3 className="text-white font-bold text-lg mb-2">Thompson's Engine</h3>
                <p className="text-[#666] text-[13px] leading-relaxed">Enter a regular expression to synthesize a new NFA architecture automatically.</p>
              </div>
              <div className="w-full relative">
                <input 
                  autoFocus
                  value={regexInput}
                  onChange={e => { setRegexInput(e.target.value); setError(null); }}
                  className="w-full bg-[#050505] border-2 border-white/5 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] rounded-2xl px-6 py-5 text-xl font-mono text-white transition-all outline-none text-center shadow-2xl"
                  placeholder="(0|1)*1"
                />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black px-4 text-[9px] uppercase tracking-[3px] text-[#555] border border-white/10 rounded-full py-0.5">EXPRESSION STREAM</div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full opacity-60">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-[#444] block mb-1">ALTERNATION</span>
                  <code className="text-[var(--color-accent)]">a|b</code>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-[#444] block mb-1">KLEENE STAR</span>
                  <code className="text-[var(--color-accent)]">0*</code>
                </div>
              </div>
              <button 
                onClick={handleRegexApply}
                className="w-full mt-4 bg-[var(--color-accent)] text-black font-bold uppercase tracking-widest text-[12px] py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Synthesize NFA
              </button>
            </div>
          )}

          {activeTab === 'table' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-white font-medium text-[13px] uppercase tracking-wider">Matrix Configuration</h3>
                  <p className="text-[11px] text-[#444] mt-1">Directly curate the transition mapping matrix.</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const name = `q${tableStates.length}`;
                      setTableStates([...tableStates, name]);
                    }}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white hover:text-[var(--color-accent)] transition-colors"
                  >
                    <Plus size={14} /> Add State
                  </button>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSymbolInput}
                      onChange={(e) => {
                        setNewSymbolInput(e.target.value);
                        if (error) setError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSymbol();
                        }
                      }}
                      className="w-20 bg-transparent border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:border-[var(--color-accent)] outline-none"
                      placeholder="sym"
                    />
                    <button 
                      onClick={handleAddSymbol}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white hover:text-[var(--color-accent)] transition-colors"
                    >
                      <Plus size={14} /> Add Symbol
                    </button>
                    <button
                      onClick={handleRemoveSymbol}
                      className="text-[10px] uppercase tracking-wider text-[#ff7a7a] hover:text-red-400 transition-colors"
                    >
                      Remove Symbol
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="p-3 bg-white/5 text-[10px] uppercase tracking-wider text-[#444] w-24">State</th>
                      <th className="p-3 bg-white/5 text-[10px] uppercase tracking-wider text-[#444] w-32 border-l border-white/5 whitespace-nowrap">Properties</th>
                      {['ε', ...tableAlphabet].map(sym => (
                        <th key={sym} className="p-3 bg-white/5 text-[10px] uppercase tracking-wider text-[#444] border-l border-white/5 text-center">
                          {sym === 'ε' ? 'EPSILON (ε)' : `SYM: ${sym}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableStates.map(state => (
                      <tr key={state} className="border-b border-white/5 hover:bg-white/[0.02] group">
                        <td className="p-4 font-mono text-[var(--color-accent)] text-[12px]">{state}</td>
                        <td className="p-4 border-l border-white/5">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setTableStart(state)}
                              className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-wider transition-all ${tableStart === state ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-black' : 'border-white/10 text-[#444] hover:text-white'}`}
                            >
                              Start
                            </button>
                            <button 
                              onClick={() => {
                                if (tableAccept.includes(state)) setTableAccept(tableAccept.filter(s => s !== state));
                                else setTableAccept([...tableAccept, state]);
                              }}
                              className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-wider transition-all ${tableAccept.includes(state) ? 'bg-white border-white text-black' : 'border-white/10 text-[#444] hover:text-white'}`}
                            >
                              Accept
                            </button>
                          </div>
                        </td>
                        {['ε', ...tableAlphabet].map(sym => (
                          <td key={sym} className="p-2 border-l border-white/5">
                            <input 
                              type="text"
                              value={tableTransitions[state]?.[sym]?.join(', ') || ''}
                              onChange={e => updateTableTransition(state, sym, e.target.value)}
                              className="w-full bg-transparent border border-white/5 rounded-lg px-3 py-2 text-[12px] text-white focus:border-[var(--color-accent)]/50 outline-none text-center"
                              placeholder="-"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button 
                onClick={handleTableSave}
                className="mt-6 bg-white text-black font-bold uppercase tracking-widest text-[11px] py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Assemble Table Arch
              </button>
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-[2px] text-[#444]">State Ledger</label>
                  <input 
                    value={statesInput} 
                    onChange={e => setStatesInput(e.target.value)} 
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white focus:border-[var(--color-accent)] outline-none"
                    placeholder="q0, q1, q2"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-[2px] text-[#444]">Signal Channels</label>
                  <input 
                    value={alphabetInput} 
                    onChange={e => setAlphabetInput(e.target.value)} 
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white focus:border-[var(--color-accent)] outline-none"
                    placeholder="0, 1"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-[2px] text-[#444]">Origin Node</label>
                  <input 
                    value={startInput} 
                    onChange={e => setStartInput(e.target.value)} 
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white focus:border-[var(--color-accent)] outline-none"
                    placeholder="q0"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-[2px] text-[#444]">Terminal Nodes</label>
                  <input 
                    value={acceptInput} 
                    onChange={e => setAcceptInput(e.target.value)} 
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white focus:border-[var(--color-accent)] outline-none"
                    placeholder="q2"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-[2px] text-[#444] flex justify-between">
                  <span>Logic Protocols</span>
                  <span>State, Symbol -{'>'} Targets</span>
                </label>
                <textarea 
                  value={transitionsInput} 
                  onChange={e => setTransitionsInput(e.target.value)} 
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-[13px] text-white focus:border-[var(--color-accent)] outline-none font-mono h-48 resize-none"
                  placeholder="q0, 0 -> q0&#10;q0, e -> q1&#10;q1, 1 -> q1, q2"
                />
              </div>

              <button 
                onClick={handleRawSave}
                className="mt-4 bg-[#111] border border-white/10 text-white font-bold uppercase tracking-widest text-[11px] py-4 rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                Parse Logic
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}