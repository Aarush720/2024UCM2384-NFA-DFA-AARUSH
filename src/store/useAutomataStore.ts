import { create } from 'zustand';
import { NFA, DFA, epsilonClosure, move, getSubsetId, State, Symbol } from '../lib/automata';

const defaultNFA: NFA = {
  states: ['q0', 'q1', 'q2'],
  alphabet: ['0', '1'],
  transitions: {
    q0: { '0': ['q0'], 'ε': ['q1'] },
    q1: { '1': ['q1', 'q2'] },
    q2: { '0': ['q2'] },
  },
  start: 'q0',
  accept: ['q2'],
};

interface AutomataState {
  nfa: NFA;
  dfa: DFA;
  stableDfa: DFA;
  transitionSteps: Record<string, TransitionStepMeta>;
  
  unvisited: State[][];
  visited: State[][];
  currentSubset: State[] | null;
  currentSymbol: Symbol | null;
  reachableStates: State[] | null;
  closureStates: State[] | null;
  
  activePhase: number;
  logs: string[];
  history: ConstructionSnapshot[];
  
  // Testing state
  testInput: string;
  testStep: number;
  testStatus: 'idle' | 'running' | 'accepted' | 'rejected';
  activeNFAStates: State[];
  activeDFAState: State | null;
  
  initSubsetConstruction: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStepIndex: (index: number) => void;
  reset: () => void;
  goHome: () => void;
  
  // Testing actions
  setTestInput: (input: string) => void;
  startTest: () => void;
  stepTest: () => void;
  resetTest: () => void;

  autoPlaySpeed: number;
  setAutoPlaySpeed: (speed: number) => void;
  canStepBackward: boolean;
  
  setNFA: (nfa: NFA) => void;
}

interface ConstructionSnapshot {
  dfa: DFA;
  unvisited: State[][];
  visited: State[][];
  currentSubset: State[] | null;
  currentSymbol: Symbol | null;
  reachableStates: State[] | null;
  closureStates: State[] | null;
  activePhase: number;
  logs: string[];
}

interface TransitionStepMeta {
  stepNumber: number;
  stepIndex: number;
  to: string;
}

function countDfaTransitions(dfa: DFA): number {
  return Object.values(dfa.transitions).reduce((acc, map) => acc + Object.keys(map).length, 0);
}

export const useAutomataStore = create<AutomataState>((set, get) => ({
  nfa: defaultNFA,
  dfa: {
    states: [],
    alphabet: defaultNFA.alphabet,
    transitions: {},
    start: '',
    accept: [],
  },
  stableDfa: {
    states: [],
    alphabet: defaultNFA.alphabet,
    transitions: {},
    start: '',
    accept: [],
  },
  transitionSteps: {},
  
  unvisited: [],
  visited: [],
  currentSubset: null,
  currentSymbol: null,
  reachableStates: null,
  closureStates: null,
  
  activePhase: 1,
  logs: [],
  
  testInput: 'na',
  testStep: 0,
  testStatus: 'idle',
  activeNFAStates: [],
  activeDFAState: null,

  autoPlaySpeed: 150,
  setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),
  canStepBackward: false,
  
  history: [] as ConstructionSnapshot[],
  
  setNFA: (nfa) => {
    set({
      nfa,
      dfa: { states: [], alphabet: nfa.alphabet, transitions: {}, start: '', accept: [] },
      stableDfa: { states: [], alphabet: nfa.alphabet, transitions: {}, start: '', accept: [] },
      transitionSteps: {},
      unvisited: [],
      visited: [],
      currentSubset: null,
      currentSymbol: null,
      reachableStates: null,
      closureStates: null,
      activePhase: 1,
      logs: [`Loaded custom NFA with ${nfa.states.length} states.`],
      history: [],
      canStepBackward: false,
      testInput: 'na',
      testStep: 0,
      testStatus: 'idle',
      activeNFAStates: [],
      activeDFAState: null,
    });
    get().initSubsetConstruction();
  },

  initSubsetConstruction: () => {
    const { nfa } = get();
    const startClosure = epsilonClosure(nfa, [nfa.start]);
    const startId = getSubsetId(startClosure);
    
    set({
      dfa: {
        states: [startId],
        alphabet: nfa.alphabet,
        transitions: {},
        start: startId,
        accept: startClosure.some(s => nfa.accept.includes(s)) ? [startId] : [],
      },
      stableDfa: {
        states: [startId],
        alphabet: nfa.alphabet,
        transitions: {},
        start: startId,
        accept: startClosure.some(s => nfa.accept.includes(s)) ? [startId] : [],
      },
      transitionSteps: {},
      unvisited: [startClosure],
      visited: [],
      currentSubset: null,
      currentSymbol: null,
      reachableStates: null,
      closureStates: null,
      activePhase: 3,
      logs: [`Initialized with ε-closure(start) = ${startId}`],
      history: [],
      canStepBackward: false,
    });
  },
  
  stepForward: () => {
    const state = get();
    const { nfa, unvisited, visited, currentSubset, currentSymbol, reachableStates, closureStates, dfa, logs, history } = state;

    const snapshot: ConstructionSnapshot = {
      dfa,
      unvisited,
      visited,
      currentSubset,
      currentSymbol,
      reachableStates,
      closureStates,
      activePhase: state.activePhase,
      logs,
    };
    const nextHistory = [...history, snapshot];
    
    // If we have a current subset but no symbol, pick the first symbol
    if (currentSubset && !currentSymbol) {
      const symbol = nfa.alphabet[0];
      set({ 
        currentSymbol: symbol, 
        logs: [...logs, `[EXPLORATION] Scanning possible transitions from subset ${getSubsetId(currentSubset)} on signal '${symbol}'.`],
        history: nextHistory,
        canStepBackward: true,
      });
      return;
    }
    
    // If we have a current subset and symbol, but haven't computed reachable states
    if (currentSubset && currentSymbol && !reachableStates) {
      const reachable = move(nfa, currentSubset, currentSymbol);
      set({ 
        reachableStates: reachable, 
        logs: [...logs, `[MOVE] Following signal '${currentSymbol}' from each state in the current subset. Reachable NFA states: ${getSubsetId(reachable)}.`],
        history: nextHistory,
        canStepBackward: true,
      });
      return;
    }
    
    // If we have reachable states, compute their epsilon closure
    if (currentSubset && currentSymbol && reachableStates && !closureStates) {
      const closure = epsilonClosure(nfa, reachableStates);
      set({ 
        closureStates: closure, 
        logs: [...logs, `[ε-CLOSURE] Expanding reachable states through ε-transitions. Final DFA target subset: ${getSubsetId(closure)}.`],
        history: nextHistory,
        canStepBackward: true,
      });
      return;
    }
    
    // If we have closure states, add the transition to DFA and queue the new subset if unvisited
    if (currentSubset && currentSymbol && reachableStates && closureStates) {
      const fromId = getSubsetId(currentSubset);
      const toId = getSubsetId(closureStates);
      
      const newTransitions = { ...dfa.transitions };
      if (!newTransitions[fromId]) newTransitions[fromId] = {};
      newTransitions[fromId][currentSymbol] = toId;
      
      let newUnvisited = [...unvisited];
      let newDfaStates = [...dfa.states];
      let newDfaAccept = [...dfa.accept];
      
      const isVisited = visited.some(v => getSubsetId(v) === toId) || unvisited.some(u => getSubsetId(u) === toId);
      const isAlreadyInDfa = dfa.states.includes(toId);

      if (!isVisited && !isAlreadyInDfa) {
        newUnvisited.push(closureStates);
        newDfaStates.push(toId);
        if (closureStates.some(s => nfa.accept.includes(s))) {
          newDfaAccept.push(toId);
        }
      }
      
      const symbolIndex = nfa.alphabet.indexOf(currentSymbol);
      const nextSymbol = symbolIndex < nfa.alphabet.length - 1 ? nfa.alphabet[symbolIndex + 1] : null;
      
      if (nextSymbol) {
        const nextDfa = { ...dfa, transitions: newTransitions, states: newDfaStates, accept: newDfaAccept };
        const nextStableDfa = countDfaTransitions(nextDfa) >= countDfaTransitions(state.stableDfa) ? nextDfa : state.stableDfa;
        const transitionKey = `${fromId}|||${currentSymbol}`;
        const nextTransitionSteps = { ...state.transitionSteps };
        if (!nextTransitionSteps[transitionKey]) {
          nextTransitionSteps[transitionKey] = {
            stepNumber: Object.keys(nextTransitionSteps).length + 1,
            stepIndex: Math.max(0, nextHistory.length - 1),
            to: toId,
          };
        }
        set({
          dfa: nextDfa,
          stableDfa: nextStableDfa,
          transitionSteps: nextTransitionSteps,
          unvisited: newUnvisited,
          currentSymbol: nextSymbol,
          reachableStates: null,
          closureStates: null,
          logs: [...logs, `[MAPPING] Synced transition: ${fromId} --(${currentSymbol})--> ${toId}. Preparing next signal channel...`],
          history: nextHistory,
          canStepBackward: true,
        });
      } else {
        const nextDfa = { ...dfa, transitions: newTransitions, states: newDfaStates, accept: newDfaAccept };
        const nextStableDfa = countDfaTransitions(nextDfa) >= countDfaTransitions(state.stableDfa) ? nextDfa : state.stableDfa;
        const transitionKey = `${fromId}|||${currentSymbol}`;
        const nextTransitionSteps = { ...state.transitionSteps };
        if (!nextTransitionSteps[transitionKey]) {
          nextTransitionSteps[transitionKey] = {
            stepNumber: Object.keys(nextTransitionSteps).length + 1,
            stepIndex: Math.max(0, nextHistory.length - 1),
            to: toId,
          };
        }
        set({
          dfa: nextDfa,
          stableDfa: nextStableDfa,
          transitionSteps: nextTransitionSteps,
          visited: [...visited, currentSubset],
          unvisited: newUnvisited,
          currentSubset: null,
          currentSymbol: null,
          reachableStates: null,
          closureStates: null,
          logs: [...logs, `[COMPLETE] Finished scanning all signals for subset ${fromId}. Moving to next unvisited state.`],
          history: nextHistory,
          canStepBackward: true,
        });
      }
      return;
    }
    
    // If no current subset, pop from unvisited
    if (!currentSubset && unvisited.length > 0) {
      const nextSubset = unvisited[0];
      set({
        unvisited: unvisited.slice(1),
        currentSubset: nextSubset,
        logs: [...logs, `[NEW DISCOVERY] Expanding unvisited subset ${getSubsetId(nextSubset)} from the discovery queue.`],
        history: nextHistory,
        canStepBackward: true,
      });
      return;
    }
    
    // If unvisited is empty, we are done
    if (!currentSubset && unvisited.length === 0) {
      set({
        activePhase: 4,
        logs: [...logs, `Subset construction complete!`],
        history: nextHistory,
        canStepBackward: true,
      });
    }
  },

  stepBackward: () => {
    const { history } = get();
    if (history.length === 0) return;

    const previous = history[history.length - 1];
    const remaining = history.slice(0, -1);

    set({
      dfa: previous.dfa,
      unvisited: previous.unvisited,
      visited: previous.visited,
      currentSubset: previous.currentSubset,
      currentSymbol: previous.currentSymbol,
      reachableStates: previous.reachableStates,
      closureStates: previous.closureStates,
      activePhase: previous.activePhase,
      logs: previous.logs,
      history: remaining,
      canStepBackward: remaining.length > 0,
    });
  },

  goToStepIndex: (index) => {
    const { history } = get();
    if (index < 0) return;

    if (index <= history.length) {
      if (index === history.length) return;

      const target = history[index];
      const remaining = history.slice(0, index);

      set({
        dfa: target.dfa,
        unvisited: target.unvisited,
        visited: target.visited,
        currentSubset: target.currentSubset,
        currentSymbol: target.currentSymbol,
        reachableStates: target.reachableStates,
        closureStates: target.closureStates,
        activePhase: target.activePhase,
        logs: target.logs,
        history: remaining,
        canStepBackward: remaining.length > 0,
      });
      return;
    }

    let guard = 0;
    while (get().history.length < index && guard < 500) {
      const before = get();
      if (before.activePhase === 4) break;
      before.stepForward();
      guard += 1;
    }
  },
  
  reset: () => {
    const { nfa } = get();
    const startClosure = epsilonClosure(nfa, [nfa.start]);
    const startId = getSubsetId(startClosure);

    set({
      dfa: {
        states: [startId],
        alphabet: nfa.alphabet,
        transitions: {},
        start: startId,
        accept: startClosure.some(s => nfa.accept.includes(s)) ? [startId] : [],
      },
      stableDfa: {
        states: [startId],
        alphabet: nfa.alphabet,
        transitions: {},
        start: startId,
        accept: startClosure.some(s => nfa.accept.includes(s)) ? [startId] : [],
      },
      transitionSteps: {},
      unvisited: [startClosure],
      visited: [],
      currentSubset: null,
      currentSymbol: null,
      reachableStates: null,
      closureStates: null,
      activePhase: 3,
      logs: [`Initialized with ε-closure(start) = ${startId}`],
      history: [],
      canStepBackward: false,
      testStatus: 'idle',
      testStep: 0,
      testInput: 'na',
      activeNFAStates: [],
      activeDFAState: null,
    });
  },

  goHome: () => {
    set({
      dfa: {
        states: [],
        alphabet: defaultNFA.alphabet,
        transitions: {},
        start: '',
        accept: [],
      },
      stableDfa: {
        states: [],
        alphabet: defaultNFA.alphabet,
        transitions: {},
        start: '',
        accept: [],
      },
      transitionSteps: {},
      unvisited: [],
      visited: [],
      currentSubset: null,
      currentSymbol: null,
      reachableStates: null,
      closureStates: null,
      activePhase: 1,
      logs: [],
      history: [],
      canStepBackward: false,
      testStatus: 'idle',
      testStep: 0,
      testInput: 'na',
      activeNFAStates: [],
      activeDFAState: null,
    });
  },
  
  setTestInput: (input: string) => set({ testInput: input }),
  
  startTest: () => {
    const { nfa, dfa, testInput } = get();
    if (dfa.states.length === 0) return;
    
    const startNFA = epsilonClosure(nfa, [nfa.start]);
    set({
      testStatus: 'running',
      testStep: 0,
      activeNFAStates: startNFA,
      activeDFAState: dfa.start,
      logs: [`Started testing with input: "${testInput}". Initial states: NFA → {${startNFA.join(',')}} | DFA → ${dfa.start}`]
    });
  },
  
  stepTest: () => {
    const { nfa, dfa, testInput, testStep, activeNFAStates, activeDFAState, logs } = get();
    
    if (testStep >= testInput.length) {
      // Finish
      const nfaAccepted = activeNFAStates.some(s => nfa.accept.includes(s));
      const dfaAccepted = activeDFAState ? dfa.accept.includes(activeDFAState) : false;
      
      set({
        testStatus: dfaAccepted ? 'accepted' : 'rejected',
        logs: [...logs, `Finished. NFA Accepted: ${nfaAccepted}, DFA Accepted: ${dfaAccepted}`]
      });
      return;
    }
    
    const symbol = testInput[testStep];
    
    // NFA step
    const reachableNFA = move(nfa, activeNFAStates, symbol);
    const nextNFA = epsilonClosure(nfa, reachableNFA);
    
    // DFA step
    const nextDFA = activeDFAState ? dfa.transitions[activeDFAState]?.[symbol] || null : null;
    
    set({
      testStep: testStep + 1,
      activeNFAStates: nextNFA,
      activeDFAState: nextDFA,
      logs: [
        ...logs, 
        `On '${symbol}': NFA → {${nextNFA.join(',')}} | DFA → ${nextDFA || '∅'}`
      ]
    });
  },
  
  resetTest: () => {
    set({
      testStatus: 'idle',
      testStep: 0,
      activeNFAStates: [],
      activeDFAState: null,
      logs: []
    });
  }
}));
