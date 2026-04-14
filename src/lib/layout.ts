import dagre from 'dagre';
import { DFA, NFA } from './automata';

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

export function getNFALayout(nfa: NFA): LayoutNode[] {
  const g = new dagre.graphlib.Graph();
  
  // Set graph labels
  g.setGraph({
    rankdir: 'LR',
    nodesep: 100, // Increased nodesep
    ranksep: 120, // Increased ranksep
    marginx: 50,
    marginy: 50
  });
  
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes
  nfa.states.forEach(state => {
    g.setNode(state, { width: 30, height: 30 });
  });

  // Add edges
  Object.entries(nfa.transitions).forEach(([from, symMap]) => {
    Object.entries(symMap).forEach(([_, tos]) => {
      tos.forEach(to => {
        g.setEdge(from, to);
      });
    });
  });

  // Layout
  dagre.layout(g);

  // Extract positions
  return nfa.states.map(state => {
    const node = g.node(state);
    return {
      id: state,
      x: node.x,
      y: node.y
    };
  });
}

export function getDFALayout(dfa: DFA): LayoutNode[] {
  const g = new dagre.graphlib.Graph();
  
  g.setGraph({
    rankdir: 'LR',
    nodesep: 120, // slightly more to account for long subset labels
    ranksep: 140,
    marginx: 50,
    marginy: 50
  });
  
  g.setDefaultEdgeLabel(() => ({}));

  dfa.states.forEach(state => {
    // DFA states are conceptually wider because of labels like {s0, s1}
    g.setNode(state, { width: 50, height: 30 });
  });

  Object.entries(dfa.transitions).forEach(([from, trans]) => {
    Object.entries(trans).forEach(([_, to]) => {
      g.setEdge(from, to);
    });
  });

  dagre.layout(g);

  return dfa.states.map(state => {
    const node = g.node(state);
    // If the graph is virtually empty or disconnected, Dagre might not set it
    return {
      id: state,
      x: node?.x || 0,
      y: node?.y || 0
    };
  });
}
