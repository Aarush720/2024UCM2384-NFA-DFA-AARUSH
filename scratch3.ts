import { regexToNFA } from './src/lib/automata';
import { epsilonClosure, move, getSubsetId } from './src/lib/automata';

const nfa = regexToNFA('(a|b)*a(a|b)(a|b)');

// Build DFA manually
const dfaStates = [];
const transitions = {};

const startClosure = epsilonClosure(nfa, [nfa.start]);
const startId = getSubsetId(startClosure);
dfaStates.push(startId);

let unvisited = [startClosure];
const visitedStr = new Set();
visitedStr.add(startId);

while (unvisited.length > 0) {
  const current = unvisited.shift();
  const currentId = getSubsetId(current);
  
  if (!transitions[currentId]) transitions[currentId] = {};
  
  for (const sym of nfa.alphabet) {
    const reachable = move(nfa, current, sym);
    const closure = epsilonClosure(nfa, reachable);
    const targetId = getSubsetId(closure);
    
    transitions[currentId][sym] = targetId;
    
    if (!visitedStr.has(targetId)) {
      visitedStr.add(targetId);
      dfaStates.push(targetId);
      unvisited.push(closure);
    }
  }
}

console.log("STATES:", dfaStates);
console.log("TRANSITIONS:", transitions);
