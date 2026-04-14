export type State = string;
export type Symbol = string;

export interface NFA {
  states: State[];
  alphabet: Symbol[];
  transitions: Record<State, Record<Symbol, State[]>>;
  start: State;
  accept: State[];
}

export interface DFA {
  states: State[];
  alphabet: Symbol[];
  transitions: Record<State, Record<Symbol, State>>;
  start: State;
  accept: State[];
}

export function epsilonClosure(nfa: NFA, states: State[]): State[] {
  const closure = new Set<State>(states);
  const stack = [...states];

  while (stack.length > 0) {
    const currentState = stack.pop()!;
    const epsilonTransitions = nfa.transitions[currentState]?.['ε'] || [];

    for (const nextState of epsilonTransitions) {
      if (!closure.has(nextState)) {
        closure.add(nextState);
        stack.push(nextState);
      }
    }
  }

  return Array.from(closure).sort();
}

export function move(nfa: NFA, states: State[], symbol: Symbol): State[] {
  const reachable = new Set<State>();

  for (const state of states) {
    const transitions = nfa.transitions[state]?.[symbol] || [];
    for (const nextState of transitions) {
      reachable.add(nextState);
    }
  }

  return Array.from(reachable).sort();
}

export function getSubsetId(states: State[]): string {
  return states.length === 0 ? 'DEAD' : `{${states.sort().join(',')}}`;
}

// --- Regex to NFA (Thompson's Construction) ---

export function regexToNFA(regex: string): NFA {
  const processed = insertExplicitConcat(regex);
  const postfix = infixToPostfix(processed);
  const nfa = buildNFA(postfix);
  return optimizeNFA(nfa);
}

function optimizeNFA(nfa: NFA): NFA {
  let { states, transitions, start, accept } = nfa;
  let changed = true;

  while (changed) {
    changed = false;
    const toRemove = new Set<string>();
    const mapping: Record<string, string> = {};

    for (const s of states) {
      const trans = transitions[s] || {};
      const epsilonOut = trans['ε'] || [];
      
      // If a state has exactly one outgoing epsilon transition and NO other transitions
      // and it's not the start/accept state (to be safe), we can merge it
      const symbolsOut = Object.keys(trans).filter(k => k !== 'ε');
      
      if (epsilonOut.length === 1 && symbolsOut.length === 0 && s !== start && !accept.includes(s)) {
        const target = epsilonOut[0];
        toRemove.add(s);
        mapping[s] = target;
        changed = true;
      }
    }

    if (changed) {
      // Update transitions
      const newTransitions: Record<string, Record<string, string[]>> = {};
      states.forEach(state => {
        if (toRemove.has(state)) return;
        
        const trans = transitions[state] || {};
        const newTrans: Record<string, string[]> = {};
        
        Object.entries(trans).forEach(([sym, tos]) => {
          const newTos = new Set<string>();
          tos.forEach(to => {
            let current = to;
            while (mapping[current]) {
              current = mapping[current];
            }
            newTos.add(current);
          });
          newTrans[sym] = Array.from(newTos);
        });
        newTransitions[state] = newTrans;
      });

      // Update start & accept
      while (mapping[start]) start = mapping[start];
      const newAccept = Array.from(new Set(accept.map(a => {
        let current = a;
        while (mapping[current]) current = mapping[current];
        return current;
      })));

      states = states.filter(s => !toRemove.has(s));
      transitions = newTransitions;
      accept = newAccept;
    }
  }

  // Final re-indexing for clean names
  const stateMap: Record<string, string> = {};
  states.forEach((s, i) => stateMap[s] = `s${i}`);
  
  const finalStates = states.map(s => stateMap[s]);
  const finalTransitions: Record<string, Record<string, string[]>> = {};
  states.forEach(s => {
    const trans = transitions[s] || {};
    const finalTrans: Record<string, string[]> = {};
    Object.entries(trans).forEach(([sym, tos]) => {
      finalTrans[sym] = Array.from(new Set(tos.map(to => stateMap[to])));
    });
    finalTransitions[stateMap[s]] = finalTrans;
  });

  return {
    states: finalStates,
    alphabet: nfa.alphabet,
    transitions: finalTransitions,
    start: stateMap[start],
    accept: accept.map(a => stateMap[a])
  };
}

function insertExplicitConcat(regex: string): string {
  let output = '';
  const operators = ['|', '*', '(', ')'];
  
  for (let i = 0; i < regex.length; i++) {
    const char = regex[i];
    output += char;
    
    if (i + 1 < regex.length) {
      const next = regex[i + 1];
      const isChar = (c: string) => !operators.includes(c) || c === '(';
      const isOperator = (c: string) => operators.includes(c);
      
      if (
        (char !== '(' && char !== '|' && isChar(next)) ||
        (char === '*' && (isChar(next) || next === '(')) ||
        (char === ')' && (isChar(next) || next === '('))
      ) {
        output += '.';
      }
    }
  }
  return output;
}

function infixToPostfix(infix: string): string {
  const precedence: Record<string, number> = { '*': 3, '.': 2, '|': 1 };
  const output: string[] = [];
  const stack: string[] = [];
  
  for (const char of infix) {
    if (char === '(') {
      stack.push(char);
    } else if (char === ')') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') {
        output.push(stack.pop()!);
      }
      stack.pop(); // Pop '('
    } else if (precedence[char]) {
      while (
        stack.length > 0 &&
        stack[stack.length - 1] !== '(' &&
        precedence[stack[stack.length - 1]] >= precedence[char]
      ) {
        output.push(stack.pop()!);
      }
      stack.push(char);
    } else {
      output.push(char);
    }
  }
  
  while (stack.length > 0) {
    output.push(stack.pop()!);
  }
  
  return output.join('');
}

interface NFAGraph {
  start: string;
  end: string;
  transitions: Record<string, Record<string, string[]>>;
}

function buildNFA(postfix: string): NFA {
  const stack: NFAGraph[] = [];
  let stateCounter = 0;
  const newState = () => `s${stateCounter++}`;
  
  const addTransitions = (target: Record<string, Record<string, string[]>>, source: Record<string, Record<string, string[]>>) => {
    Object.entries(source).forEach(([from, symMap]) => {
      if (!target[from]) target[from] = {};
      Object.entries(symMap).forEach(([sym, tos]) => {
        if (!target[from][sym]) target[from][sym] = [];
        target[from][sym].push(...tos);
      });
    });
  };

  for (const char of postfix) {
    if (char === '|') {
      const right = stack.pop()!;
      const left = stack.pop()!;
      const start = newState();
      const end = newState();
      const transitions: Record<string, Record<string, string[]>> = {
        [start]: { 'ε': [left.start, right.start] },
        [left.end]: { 'ε': [end] },
        [right.end]: { 'ε': [end] },
      };
      addTransitions(transitions, left.transitions);
      addTransitions(transitions, right.transitions);
      stack.push({ start, end, transitions });
    } else if (char === '.') {
      const right = stack.pop()!;
      const left = stack.pop()!;
      const transitions = { ...left.transitions };
      addTransitions(transitions, right.transitions);
      if (!transitions[left.end]) transitions[left.end] = {};
      if (!transitions[left.end]['ε']) transitions[left.end]['ε'] = [];
      transitions[left.end]['ε'].push(right.start);
      stack.push({ start: left.start, end: right.end, transitions });
    } else if (char === '*') {
      const frag = stack.pop()!;
      const start = newState();
      const end = newState();
      const transitions: Record<string, Record<string, string[]>> = {
        [start]: { 'ε': [frag.start, end] },
        [frag.end]: { 'ε': [frag.start, end] },
      };
      addTransitions(transitions, frag.transitions);
      stack.push({ start, end, transitions });
    } else {
      // Literal character
      const start = newState();
      const end = newState();
      stack.push({
        start,
        end,
        transitions: { [start]: { [char]: [end] } }
      });
    }
  }

  const finalFrag = stack.pop()!;
  
  // Convert NFAGraph to NFA object
  const allStates = new Set<string>();
  const alphabet = new Set<string>();
  
  Object.entries(finalFrag.transitions).forEach(([from, trans]) => {
    allStates.add(from);
    Object.entries(trans).forEach(([sym, tos]) => {
      if (sym !== 'ε') alphabet.add(sym);
      tos.forEach(to => allStates.add(to));
    });
  });
  allStates.add(finalFrag.start);
  allStates.add(finalFrag.end);

  return {
    states: Array.from(allStates).sort(),
    alphabet: Array.from(alphabet).sort(),
    transitions: finalFrag.transitions as Record<State, Record<Symbol, State[]>>,
    start: finalFrag.start,
    accept: [finalFrag.end]
  };
}
