import { regexToNFA } from './src/lib/automata';
const result = regexToNFA('(a|b)*a(a|b)(a|b)');
console.log(JSON.stringify(result, null, 2));
