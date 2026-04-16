import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, MarkerType, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAutomataStore } from '../store/useAutomataStore';
import { motion } from 'motion/react';
import { getSubsetId } from '../lib/automata';
import { GhostMerge } from './GhostMerge';
import { AnimatedNode } from './AnimatedNode';
import { AnimatedEdge } from './AnimatedEdge';
import { CustomNFAModal } from './CustomNFAModal';
import { Maximize2, Minimize2, Plus } from 'lucide-react';
import { getNFALayout, getDFALayout } from '../lib/layout';

// Custom node styles for premium look
const nodeStyle: CSSProperties = {
  background: 'transparent',
  color: '#fff',
  border: '1px solid #fff',
  borderRadius: '50%',
  width: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
};

const activeNodeStyle: CSSProperties = {
  ...nodeStyle,
  background: 'var(--color-accent)',
  borderColor: 'var(--color-accent)',
  color: '#000',
};

const currentNodeStyle: CSSProperties = {
  ...nodeStyle,
  background: 'rgba(237, 192, 1, 0.2)',
  borderColor: 'var(--color-accent)',
  color: 'var(--color-accent)',
  boxShadow: '0 0 15px var(--color-accent)',
};

const FitViewUpdater = ({ nodesLength, activeTab, viewportMode }: { nodesLength: number, activeTab: string, viewportMode: string }) => {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [nodesLength, activeTab, viewportMode, fitView]);
  return null;
};

const isTeachingCheckpoint = (logLine?: string) => {
  if (!logLine) return false;
  return (
    logLine.startsWith('[MAPPING]') ||
    logLine.startsWith('[COMPLETE]') ||
    logLine === 'Subset construction complete!'
  );
};

const getDfaNodeDiameter = (state: string) => Math.max(36, Math.min(96, Math.round(state.length * 6.5)));

export function Tool() {
  const { nfa, dfa, stableDfa, transitionSteps, currentSubset, currentSymbol, reachableStates, closureStates, stepForward, stepBackward, goToStepIndex, canStepBackward, activePhase, logs, testInput, setTestInput, startTest, stepTest, resetTest, testStatus, testStep, activeNFAStates, activeDFAState, autoPlaySpeed, setAutoPlaySpeed, setNFA, history, unvisited, visited } = useAutomataStore();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isTestAutoPlaying, setIsTestAutoPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'construction' | 'testing'>('construction');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [fullscreenDiagram, setFullscreenDiagram] = useState<'none' | 'nfa' | 'dfa'>('none');

  const nodeTypes = useMemo(() => ({ animated: AnimatedNode }), []);
  const edgeTypes = useMemo(() => ({ animated: AnimatedEdge }), []);

  const goHome = useCallback(() => {
    setIsAutoPlaying(false);
    setIsTestAutoPlaying(false);
    setFullscreenDiagram('none');
    setActiveTab('construction');
    useAutomataStore.getState().goHome();
  }, []);

  const stepInsight = useMemo(() => {
    const currentSubsetId = currentSubset ? getSubsetId(currentSubset) : '-';
    const moveSubsetId = reachableStates ? getSubsetId(reachableStates) : '-';
    const closureSubsetId = closureStates ? getSubsetId(closureStates) : '-';
    const pendingTarget = closureStates ? getSubsetId(closureStates) : reachableStates ? getSubsetId(reachableStates) : '-';

    let action = 'Awaiting next subset from queue';
    if (activePhase === 4) action = 'Construction complete';
    else if (currentSubset && !currentSymbol) action = 'Selecting next alphabet symbol';
    else if (currentSubset && currentSymbol && !reachableStates) action = `Computing move(${currentSubsetId}, ${currentSymbol})`;
    else if (currentSubset && currentSymbol && reachableStates && !closureStates) action = `Computing ε-closure(${moveSubsetId})`;
    else if (currentSubset && currentSymbol && reachableStates && closureStates) action = 'Writing DFA transition + queue update';

    const lastLog = logs[logs.length - 1] || 'No log yet.';
    const pendingTransition = currentSubset && currentSymbol
      ? `${currentSubsetId} --(${currentSymbol})--> ${pendingTarget}`
      : '-';

    return {
      stepNumber: history.length,
      action,
      currentSubsetId,
      currentSymbol: currentSymbol || '-',
      moveSubsetId,
      closureSubsetId,
      pendingTransition,
      queueCount: unvisited.length,
      visitedCount: visited.length,
      dfaStates: dfa.states.length,
      dfaTransitions: Object.values(dfa.transitions).reduce((acc, map) => acc + Object.keys(map).length, 0),
      lastLog,
    };
  }, [currentSubset, currentSymbol, reachableStates, closureStates, activePhase, logs, history.length, unvisited.length, visited.length, dfa.states.length, dfa.transitions]);

  const transitionStepMeta = useMemo(() => {
    const map = new Map<string, { stepNumber: number; snapshotIndex: number; to: string }>();
    Object.entries(transitionSteps).forEach(([key, value]) => {
      map.set(key, {
        stepNumber: value.stepNumber,
        snapshotIndex: value.stepIndex,
        to: value.to,
      });
    });
    return map;
  }, [transitionSteps]);

  const stepForwardTeaching = useCallback(() => {
    if (isAutoPlaying || activePhase === 4) return;

    let guard = 0;
    while (guard < 16) {
      useAutomataStore.getState().stepForward();
      guard += 1;

      const nextState = useAutomataStore.getState();
      const lastLog = nextState.logs[nextState.logs.length - 1];

      if (nextState.activePhase === 4 || isTeachingCheckpoint(lastLog)) {
        break;
      }
    }
  }, [isAutoPlaying, activePhase]);

  const stepBackwardTeaching = useCallback(() => {
    if (isAutoPlaying || !canStepBackward) return;

    // Always move at least one micro-step back, then continue until previous checkpoint.
    let guard = 0;
    while (guard < 32) {
      const before = useAutomataStore.getState();
      if (!before.canStepBackward) break;

      before.stepBackward();
      guard += 1;

      const current = useAutomataStore.getState();
      const lastLog = current.logs[current.logs.length - 1];
      if (!current.canStepBackward || current.logs.length === 0 || isTeachingCheckpoint(lastLog)) {
        break;
      }
    }
  }, [isAutoPlaying, canStepBackward]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (isAutoPlaying && activePhase !== 4) {
      const timer = setTimeout(() => {
        stepForward();
      }, autoPlaySpeed);
      return () => clearTimeout(timer);
    }
    if (activePhase === 4) {
      setIsAutoPlaying(false);
    }
  }, [isAutoPlaying, activePhase, stepForward, logs, autoPlaySpeed]);

  useEffect(() => {
    if (activeTab !== 'testing' || !isTestAutoPlaying) return;

    if (!testInput) {
      setIsTestAutoPlaying(false);
      return;
    }

    if (testStatus === 'accepted' || testStatus === 'rejected') {
      setIsTestAutoPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      const state = useAutomataStore.getState();
      if (state.testStatus === 'idle') {
        state.startTest();
      } else if (state.testStatus === 'running') {
        state.stepTest();
      }
    }, Math.max(120, autoPlaySpeed));

    return () => clearTimeout(timer);
  }, [activeTab, isTestAutoPlaying, testStatus, testInput, autoPlaySpeed, testStep]);

  // NFA Nodes & Edges
  const nfaNodes = useMemo(() => {
    const layout = getNFALayout(nfa);
    
    return nfa.states.map((state) => {
      let style = { ...nodeStyle };
      
      const isCurrent = activeTab === 'construction' 
        ? currentSubset?.includes(state) 
        : activeNFAStates.includes(state);
      
      const isReachable = activeTab === 'construction' && reachableStates?.includes(state);
      const isClosure = activeTab === 'construction' && closureStates?.includes(state);
      
      if (isCurrent) {
        style = currentNodeStyle;
      } else if (isClosure || isReachable) {
        style = activeNodeStyle;
      }

      const pos = layout.find(l => l.id === state) || { x: 0, y: 0 };

      return {
        id: `nfa-${state}`,
        type: 'animated',
        position: { x: pos.x, y: pos.y },
        data: { 
          label: state, 
          style, 
          animate: false,
          isAccept: nfa.accept.includes(state)
        },
        style: { width: 30, height: 30, background: 'transparent', border: 'none' },
      };
    });
  }, [nfa, activeTab, currentSubset, activeNFAStates, reachableStates, closureStates]);

  const nfaEdges = useMemo(() => {
    const edgesMap: Record<string, string[]> = {};
    const validStates = new Set(nfa.states);
    
    Object.entries(nfa.transitions).forEach(([from, transitions]) => {
      if (!validStates.has(from)) return;
      Object.entries(transitions).forEach(([symbol, toStates]) => {
        toStates.forEach(to => {
          if (!validStates.has(to)) return;
          const key = `${from}|||${to}`;
          if (!edgesMap[key]) edgesMap[key] = [];
          edgesMap[key].push(symbol);
        });
      });
    });

    return Object.entries(edgesMap).map(([key, symbols]) => {
      const [from, to] = key.split('|||');
      const isBidirectional = !!edgesMap[`${to}|||${from}`];
      return {
        id: `nfa-e-${from}-${to}`,
        source: `nfa-${from}`,
        target: `nfa-${to}`,
        type: 'animated',
        label: symbols.join(', '),
        data: { animate: false, isBidirectional },
        style: { stroke: 'var(--color-text-muted)', strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-text-muted)' },
      };
    });
  }, [nfa]);

  // DFA Nodes & Edges
  const dfaNodes = useMemo(() => {
    const layout = getDFALayout(dfa);
    
    return dfa.states.map((state) => {
      const diameter = getDfaNodeDiameter(state);
      let style: CSSProperties = {
        ...nodeStyle,
        width: diameter,
        height: diameter,
        fontSize: diameter > 70 ? '8px' : diameter > 54 ? '9px' : '10px',
      };
      const isCurrent = activeTab === 'construction' 
        ? state === getSubsetId(currentSubset || [])
        : state === activeDFAState;

      if (isCurrent) {
        style = {
          ...style,
          background: 'var(--color-accent)',
          borderColor: 'var(--color-accent)',
          color: '#000',
          boxShadow: '0 0 15px var(--color-accent)',
        };
      }

      const pos = layout.find(l => l.id === state) || { x: 0, y: 0 };

      return {
        id: `dfa-${state}`,
        type: 'animated',
        position: { x: pos.x, y: pos.y },
        data: { 
          label: state, 
          style,
          isAccept: dfa.accept.includes(state)
        },
        style: { width: diameter, height: diameter, background: 'transparent', border: 'none' },
      };
    });
  }, [dfa, activeTab, currentSubset, activeDFAState]);

  const dfaEdges = useMemo(() => {
    const edgesMap: Record<string, string[]> = {};
    const validStates = new Set(dfa.states);

    Object.entries(dfa.transitions).forEach(([from, transitions]) => {
      if (!validStates.has(from)) return;
      Object.entries(transitions).forEach(([symbol, to]) => {
        if (!validStates.has(to)) return;
        const key = `${from}|||${to}`;
        if (!edgesMap[key]) edgesMap[key] = [];
        edgesMap[key].push(symbol);
      });
    });

    return Object.entries(edgesMap).map(([key, symbols]) => {
      const [from, to] = key.split('|||');
      const isBidirectional = !!edgesMap[`${to}|||${from}`];
      return {
        id: `dfa-e-${from}-${to}`,
        source: `dfa-${from}`,
        target: `dfa-${to}`,
        type: 'animated',
        label: symbols.join(', '),
        data: {
          animate: true,
          isBidirectional,
          sourceSize: getDfaNodeDiameter(from),
          targetSize: getDfaNodeDiameter(to),
        },
        style: { stroke: 'var(--color-accent)', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-accent)' },
      };
    });
  }, [dfa]);

  return (
    <div className="viz-shell h-screen w-full flex flex-col bg-black text-white overflow-hidden font-sans">
      {/* Top Bar */}
      <nav className="flex items-center gap-6 px-10 h-[68px] box-border shrink-0 border-b border-[var(--viz-border)] bg-[linear-gradient(90deg,rgba(212,83,3,0.08),rgba(0,0,0,0))]">
        <button
          onClick={goHome}
          className="shrink-0 text-[16px] tracking-[4px] font-bold text-[#fff4ea] transition-colors hover:text-[#ffd7bc]"
        >
          AURELIA
        </button>
        <div className="flex items-center gap-4 min-w-0">
          <div onClick={() => setActiveTab('construction')} className={`text-[12px] uppercase tracking-[2px] px-4 py-2 rounded-[10px] border transition-colors cursor-pointer ${activeTab === 'construction' ? 'text-[#fff4ea] border-[rgba(212,83,3,0.7)] bg-[rgba(212,83,3,0.14)]' : 'text-[var(--viz-text-muted)] border-[rgba(255,255,255,0.12)] hover:text-[#ffd7bc] hover:border-[rgba(212,83,3,0.55)]'}`}>01. Construction</div>
          <div className="text-[12px] uppercase tracking-[2px] px-4 py-2 rounded-[10px] border border-[rgba(255,255,255,0.12)] text-[var(--viz-text-muted)] cursor-not-allowed opacity-55">02. E-Closure</div>
          <div className="text-[12px] uppercase tracking-[2px] px-4 py-2 rounded-[10px] border border-[rgba(255,255,255,0.12)] text-[var(--viz-text-muted)] cursor-not-allowed opacity-55">03. Equivalence</div>
          <div onClick={() => setActiveTab('testing')} className={`text-[12px] uppercase tracking-[2px] px-4 py-2 rounded-[10px] border transition-colors cursor-pointer ${activeTab === 'testing' ? 'text-[#fff4ea] border-[rgba(212,83,3,0.7)] bg-[rgba(212,83,3,0.14)]' : 'text-[var(--viz-text-muted)] border-[rgba(255,255,255,0.12)] hover:text-[#ffd7bc] hover:border-[rgba(212,83,3,0.55)]'}`}>04. Testing</div>
        </div>
        <div className="ml-auto flex gap-4 items-center min-w-0">
          {activeTab === 'construction' ? (
            <>
              <div className="flex items-center gap-2 mr-1">
                <span className="text-[11px] uppercase tracking-[1px] text-[var(--viz-text-muted)]">Speed</span>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={1550 - autoPlaySpeed}
                  onChange={(e) => setAutoPlaySpeed(1550 - Number(e.target.value))}
                  className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--viz-accent)]"
                />
              </div>
              <button onClick={() => useAutomataStore.getState().reset()} className="viz-btn-ghost text-[12px] uppercase tracking-[2px]">
                Reset
              </button>
              <button onClick={() => setIsAutoPlaying(!isAutoPlaying)} className={`viz-btn text-[12px] uppercase tracking-[2px] px-4 py-2 ${isAutoPlaying ? 'viz-btn-primary' : 'viz-btn-outline'}`}>
                {isAutoPlaying ? 'Pause Auto' : 'Auto Mode'}
              </button>
              <button onClick={stepForwardTeaching} disabled={isAutoPlaying || activePhase === 4} className="viz-btn-ghost text-[12px] uppercase tracking-[2px] disabled:opacity-50">
                Next Step
              </button>
              <button onClick={stepBackwardTeaching} disabled={isAutoPlaying || !canStepBackward} className="viz-btn-ghost text-[12px] uppercase tracking-[2px] disabled:opacity-50">
                Previous Step
              </button>
              <div className="w-[1px] h-4 bg-white/10 mx-1" />
              <button 
                onClick={() => setIsCustomModalOpen(true)}
                className="viz-btn-outline text-[11px] uppercase tracking-[2px] px-3 py-2 rounded-lg transition-all flex items-center gap-2"
              >
                <Plus size={13} className="text-[var(--viz-accent)]" />
                Custom NFA
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { resetTest(); setIsTestAutoPlaying(false); }} className="viz-btn-ghost text-[12px] uppercase tracking-[2px]">
                Reset Test
              </button>
              <button
                onClick={() => setIsTestAutoPlaying(!isTestAutoPlaying)}
                disabled={!testInput || testStatus === 'accepted' || testStatus === 'rejected'}
                className={`viz-btn text-[12px] uppercase tracking-[2px] px-4 py-2 disabled:opacity-50 ${isTestAutoPlaying ? 'viz-btn-outline-active' : 'viz-btn-outline'}`}
              >
                {isTestAutoPlaying ? 'Pause Auto' : 'Auto Trace'}
              </button>
              <button onClick={testStatus === 'idle' ? startTest : stepTest} disabled={isTestAutoPlaying || testStatus === 'accepted' || testStatus === 'rejected' || !testInput} className="viz-btn-primary text-[12px] uppercase tracking-[2px] px-4 py-2 disabled:opacity-50">
                {testStatus === 'idle' ? 'Start Trace' : 'Next Step'}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Main Split Screen */}
      <div className={`flex-1 grid gap-[1px] bg-[var(--viz-border)] border-t border-[var(--viz-border)] mb-[60px] ${fullscreenDiagram === 'none' ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {/* Left: NFA Graph */}
        {fullscreenDiagram !== 'dfa' && (
        <div className="bg-[var(--viz-panel-bg)] p-6 flex flex-col">
          <div className="flex justify-between mb-5">
            <span className="text-[12px] uppercase tracking-[1px] text-[var(--viz-text-muted)]">NFA Source Graph</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-1 border border-[var(--viz-border)] text-[var(--viz-text-muted)] rounded-[10px]">Static</span>
              <button
                onClick={() => setFullscreenDiagram(fullscreenDiagram === 'nfa' ? 'none' : 'nfa')}
                className="viz-btn-outline text-[11px] px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1"
              >
                {fullscreenDiagram === 'nfa' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                {fullscreenDiagram === 'nfa' ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
            </div>
          </div>
          <div className="flex-1 border border-dashed border-white/10 rounded-lg relative overflow-hidden">
            <ReactFlow 
              nodes={nfaNodes} 
              edges={nfaEdges} 
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView 
              proOptions={{ hideAttribution: true }}
            >
              <FitViewUpdater nodesLength={nfaNodes.length} activeTab={activeTab} viewportMode={fullscreenDiagram} />
              <Background color="rgba(255,255,255,0.05)" gap={20} />
            </ReactFlow>
          </div>
        </div>
        )}

        {/* Middle: Transition Table & Explorer */}
        {fullscreenDiagram === 'none' && (
        <div className="bg-[var(--viz-panel-bg)] p-6 flex flex-col border-l border-r border-[var(--viz-border)] overflow-hidden">
          {activeTab === 'construction' ? (
            <>
              <div className="flex justify-between mb-5">
                <span className="text-[12px] uppercase tracking-[1px] text-[var(--viz-text-muted)]">Transition Mapping</span>
                <span className="text-[11px] px-2 py-1 border border-[var(--viz-accent)] text-[var(--viz-accent)] rounded-[10px]">Phase {activePhase}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <table className="w-full border-collapse text-[12px] leading-normal">
                  <thead>
                    <tr>
                      <th className="text-left text-[var(--viz-text-muted)] p-2 border-b border-[var(--viz-border)] font-normal">Current DFA</th>
                      <th className="text-left text-[var(--viz-text-muted)] p-2 border-b border-[var(--viz-border)] font-normal">Symbol</th>
                      <th className="text-left text-[var(--viz-text-muted)] p-2 border-b border-[var(--viz-border)] font-normal">Next NFA</th>
                      <th className="text-left text-[var(--viz-text-muted)] p-2 border-b border-[var(--viz-border)] font-normal">Next DFA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stableDfa.states.map(state => {
                      const isCurrentState = state === getSubsetId(currentSubset || []);
                      return nfa.alphabet.map(sym => {
                        const nextDfa = stableDfa.transitions[state]?.[sym];
                        const mappedMeta = transitionStepMeta.get(`${state}|||${sym}`);
                        const mappedStepIndex = mappedMeta ? mappedMeta.snapshotIndex : null;
                        const displayedTarget = nextDfa || mappedMeta?.to || '-';
                        
                        const isCurrentRow = isCurrentState && currentSymbol === sym;
                        
                        return (
                          <tr
                            key={`${state}-${sym}`}
                            onClick={mappedStepIndex !== null ? () => goToStepIndex(mappedStepIndex) : undefined}
                            className={`${isCurrentRow ? 'bg-[rgba(212,83,3,0.16)]' : ''} ${mappedStepIndex !== null ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.05)]' : ''}`}
                            title={mappedMeta ? `Jump to step ${mappedMeta.stepNumber}` : 'Step not available yet'}
                          >
                            <td className="p-2 py-2 border-b border-white/5">{state}</td>
                            <td className="p-2 py-2 border-b border-white/5">{sym}</td>
                            <td className="p-2 py-2 border-b border-white/5">{isCurrentRow && reachableStates ? getSubsetId(reachableStates) : '-'}</td>
                            <td className="p-2 py-2 border-b border-white/5">
                              <div className="flex items-center justify-between gap-2">
                                <span>{displayedTarget}</span>
                                {mappedStepIndex !== null && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--viz-accent)]/40 text-[var(--viz-accent)]">
                                    Step {mappedMeta?.stepNumber}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>

              {/* Step Insight / Ghost Merge */}
              <div className="border-t border-[var(--viz-border)] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[2px] text-[var(--viz-text-muted)]">Step Insight</div>
                  <div className="text-[12px] font-mono text-[var(--viz-accent)]">Step {stepInsight.stepNumber}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
                    <div className="text-[#666] uppercase tracking-[1px] mb-1">Action</div>
                    <div className="text-white/90">{stepInsight.action}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
                    <div className="text-[#666] uppercase tracking-[1px] mb-1">Current DFA Subset</div>
                    <div className="text-white/90 truncate">{stepInsight.currentSubsetId}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
                    <div className="text-[#666] uppercase tracking-[1px] mb-1">Symbol</div>
                    <div className="text-white/90">{stepInsight.currentSymbol}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
                    <div className="text-[#666] uppercase tracking-[1px] mb-1">Pending Transition</div>
                    <div className="text-white/90 truncate">{stepInsight.pendingTransition}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
                    <div className="text-[#666] uppercase tracking-[1px] mb-1">move() Result</div>
                    <div className="text-white/90 truncate">{stepInsight.moveSubsetId}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
                    <div className="text-[#666] uppercase tracking-[1px] mb-1">ε-Closure Result</div>
                    <div className="text-white/90 truncate">{stepInsight.closureSubsetId}</div>
                  </div>
                </div>

                <div className="flex gap-4 text-[11px] font-mono text-[#c8b9ad]">
                  <span>Queue: <b className="text-white">{stepInsight.queueCount}</b></span>
                  <span>Visited: <b className="text-white">{stepInsight.visitedCount}</b></span>
                  <span>DFA States: <b className="text-white">{stepInsight.dfaStates}</b></span>
                  <span>DFA Edges: <b className="text-white">{stepInsight.dfaTransitions}</b></span>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[2px] text-[var(--viz-text-muted)] mb-2">Subset Formation</div>
                  <GhostMerge states={closureStates || reachableStates || currentSubset || []} />
                </div>

                <div className="text-[12px] text-white/80 bg-white/5 border border-white/10 rounded px-3 py-2 font-mono">
                  {stepInsight.lastLog}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between mb-5">
                <span className="text-[12px] uppercase tracking-[1px] text-[var(--viz-text-muted)]">Word Trace Simulation</span>
                <span className={`text-[11px] px-2 py-1 border rounded-[10px] ${testStatus === 'accepted' ? 'border-green-500 text-green-500' : testStatus === 'rejected' ? 'border-red-500 text-red-500' : 'border-[var(--viz-accent)] text-[var(--viz-accent)]'}`}>
                  {testStatus.toUpperCase()}
                </span>
              </div>
              
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-[11px] uppercase tracking-[2px] text-[var(--viz-text-muted)] mb-2">Input Word</label>
                  <input 
                    type="text" 
                    value={testInput} 
                    onChange={(e) => setTestInput(e.target.value)}
                    disabled={testStatus !== 'idle'}
                    className="w-full bg-transparent border border-[var(--viz-border)] rounded p-3 text-white font-mono text-[16px] focus:border-[var(--viz-accent)] outline-none disabled:opacity-50"
                    placeholder="e.g. 0101"
                  />
                </div>
                
                {testStatus !== 'idle' && (
                  <div>
                    <div className="text-[11px] uppercase tracking-[2px] text-[var(--viz-text-muted)] mb-2">Trace Progress</div>
                    <div className="flex gap-1 font-mono text-lg mb-4">
                      {testInput.split('').map((char, i) => (
                        <span key={i} className={`${i < testStep ? 'text-[var(--viz-text-muted)]' : i === testStep ? 'text-[var(--viz-accent)] border-b-2 border-[var(--viz-accent)]' : 'text-white'}`}>
                          {char}
                        </span>
                      ))}
                    </div>
                    
                    <div className="text-[11px] uppercase tracking-[2px] text-[var(--viz-text-muted)] mb-2">Current Step Explanation</div>
                    <div className="text-[13px] text-white/85 bg-white/5 p-3 rounded border border-white/10 leading-relaxed">
                      {logs.length > 0 ? logs[logs.length - 1] : 'Waiting to start...'}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        )}

        {/* Right: DFA Graph */}
        {fullscreenDiagram !== 'nfa' && (
        <div className="bg-[var(--viz-panel-bg)] p-6 flex flex-col">
          <div className="flex justify-between mb-5">
            <span className="text-[12px] uppercase tracking-[1px] text-[var(--viz-text-muted)]">DFA Target Result</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-1 border border-[var(--viz-accent)] text-[#ffd8bf] rounded-[10px]">
                {activePhase === 4 ? 'Complete' : 'Building...'}
              </span>
              <button
                onClick={() => setFullscreenDiagram(fullscreenDiagram === 'dfa' ? 'none' : 'dfa')}
                className="viz-btn-outline text-[11px] px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1"
              >
                {fullscreenDiagram === 'dfa' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                {fullscreenDiagram === 'dfa' ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
            </div>
          </div>
          <div className="flex-1 border border-dashed border-white/10 rounded-lg relative overflow-hidden">
            <ReactFlow 
              nodes={dfaNodes} 
              edges={dfaEdges} 
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView 
              proOptions={{ hideAttribution: true }}
            >
              <FitViewUpdater nodesLength={dfaNodes.length} activeTab={activeTab} viewportMode={fullscreenDiagram} />
              <Background color="rgba(255,255,255,0.05)" gap={20} />
            </ReactFlow>
          </div>
        </div>
        )}
      </div>

      {/* Bottom: Log Panel / Simulation HUD */}
      <div className="absolute bottom-0 left-0 w-full h-[72px] bg-[#070605] border-t border-[var(--viz-border)] flex items-center px-10 box-border overflow-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4 w-full">
          <div className="flex flex-col shrink-0">
            <span className="text-[var(--viz-accent)] text-[10px] font-bold uppercase tracking-[2px]">System Monitor</span>
            <div className="flex gap-1 mt-1">
              <div className="w-1 h-1 rounded-full bg-[var(--viz-accent)] animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-[var(--viz-accent)]/40" />
              <div className="w-1 h-1 rounded-full bg-[var(--viz-accent)]/20" />
            </div>
          </div>
          
          <div className="h-8 w-[1px] bg-white/10 mx-4" />
          
          <div className="flex-1 font-mono text-[13px] text-white/90 truncate flex items-center gap-3">
            {logs.length > 0 ? (
              <>
                <span className="text-[var(--viz-accent)] opacity-60">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="text-white/40">{'>'}</span>
                <span className="tracking-tight italic whitespace-nowrap overflow-hidden text-ellipsis">
                  {logs[logs.length - 1].split(']').length > 1 ? (
                    <>
                      <b className="text-[var(--viz-accent)] not-italic mr-2">{logs[logs.length - 1].split(']')[0] + ']'}</b>
                      {logs[logs.length - 1].split(']')[1]}
                    </>
                  ) : logs[logs.length - 1]}
                </span>
              </>
            ) : (
              <span className="text-[#444] italic">System standby. Awaiting NFA architecture for subset synthesis...</span>
            )}
          </div>

          <div className="flex gap-4 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-[1px] text-[#7f6c5f]">Complexity</span>
              <span className="text-[11px] text-white font-mono">{nfa.states.length}S / {dfa.states.length}D</span>
            </div>
          </div>
        </div>
      </div>

      <CustomNFAModal 
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        currentNFA={nfa}
        onSave={(newNFA) => {
          setNFA(newNFA);
        }}
      />
    </div>
  );
}
