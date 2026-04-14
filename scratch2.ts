import { regexToNFA } from './src/lib/automata';
const nfa = regexToNFA('(a|b)*a(a|b)(a|b)');
console.log(nfa.transitions['s0']);
