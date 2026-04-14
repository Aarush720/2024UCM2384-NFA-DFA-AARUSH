/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hero } from './components/Hero';
import { Tool } from './components/Tool';
import { useAutomataStore } from './store/useAutomataStore';

export default function App() {
  const activePhase = useAutomataStore(state => state.activePhase);
  const initSubsetConstruction = useAutomataStore(state => state.initSubsetConstruction);

  const handleStart = () => {
    initSubsetConstruction();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {activePhase === 1 ? <Hero onStart={handleStart} /> : <Tool />}
    </div>
  );
}
