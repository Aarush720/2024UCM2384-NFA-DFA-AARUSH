import { useMemo, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export function Hero({ onStart }: { onStart: () => void }) {
  const { scrollYProgress } = useScroll();
  const [activeBriefStep, setActiveBriefStep] = useState(0);
  const [sampleWord, setSampleWord] = useState('101');

  const briefingSteps = [
    {
      id: 'S1',
      title: 'Read Current Subset',
      summary: 'Pick the next unvisited DFA subset generated from NFA states.',
      detail:
        'The visualizer keeps a queue of unvisited subsets. Each subset represents one DFA state composed of multiple NFA states.',
      formula: 'DFA State = {q_i, q_j, ...}',
    },
    {
      id: 'S2',
      title: 'Apply move(T, a)',
      summary: 'For each alphabet symbol, collect all directly reachable NFA states.',
      detail:
        'Given subset T and symbol a, move(T, a) unions transitions from every state in T on a. This gives a raw target set.',
      formula: 'move(T, a) = ⋃ δ(q, a), q ∈ T',
    },
    {
      id: 'S3',
      title: 'Apply ε-closure',
      summary: 'Expand target set through epsilon transitions before finalizing target subset.',
      detail:
        'The visualizer computes epsilon closure of the move set so hidden ε-paths are included in the deterministic target state.',
      formula: 'U = ε-closure(move(T, a))',
    },
    {
      id: 'S4',
      title: 'Record & Queue',
      summary: 'Write DFA edge and queue new subset if unseen.',
      detail:
        'If U has not appeared before, it is added as a new DFA node. Accept status propagates if any member NFA state is accepting.',
      formula: 'T --a--> U',
    },
  ] as const;

  const miniTrace = useMemo(() => {
    const transitions: Record<string, Record<string, string>> = {
      A: { '0': 'A', '1': 'B' },
      B: { '0': 'C', '1': 'B' },
      C: { '0': 'C', '1': 'A' },
    };
    const accept = 'C';
    const clean = sampleWord.trim();
    const steps: Array<{ index: number; symbol: string; from: string; to: string }> = [];

    let state = 'A';
    let invalid = false;
    for (let i = 0; i < clean.length; i += 1) {
      const symbol = clean[i];
      const to = transitions[state]?.[symbol];
      if (!to) {
        invalid = true;
        steps.push({ index: i + 1, symbol, from: state, to: '∅' });
        break;
      }
      steps.push({ index: i + 1, symbol, from: state, to });
      state = to;
    }

    const accepted = clean.length > 0 && !invalid && state === accept;
    return {
      clean,
      steps,
      finalState: invalid ? '∅' : state,
      accepted,
      invalid,
    };
  }, [sampleWord]);

  const planetX = useTransform(scrollYProgress, [0, 0.22, 0.36], [0, -260, -980]);
  const planetY = useTransform(scrollYProgress, [0, 0.35], [0, -700]);
  const planetScale = useTransform(scrollYProgress, [0, 0.2, 0.35], [1, 1.06, 1.02]);
  const planetOpacity = useTransform(scrollYProgress, [0, 0.2, 0.3, 0.36], [1, 1, 0.55, 0]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.35, 0.7], [0.75, 0.55, 0.35]);

  return (
    <div className="aurelia-landing relative bg-[#090909] text-[#fff9ee]">
      <div className="aurelia-noise pointer-events-none fixed inset-0 z-0" />
      <div className="aurelia-vignette pointer-events-none fixed inset-0 z-0" />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-350 items-center justify-between px-6 py-3 md:px-10">
          <div className="aurelia-mono text-[12px] uppercase tracking-[0.14em] text-white/75">Aurelia / Mission Log</div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={onStart} className="aurelia-chip aurelia-chip-accent">
              Enter Visualizer
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <motion.div
          style={{ x: planetX, y: planetY, scale: planetScale, opacity: planetOpacity }}
          className="pointer-events-none fixed bottom-[-30vh] left-[-17vw] z-20 h-[42vw] w-[42vw] min-h-75 min-w-75 rounded-full border border-[#d45303]/30 bg-[radial-gradient(circle_at_32%_28%,#ffb56d_0%,#ec6a13_40%,#8b2d00_73%,#3f1400_100%)] shadow-[0_0_220px_rgba(212,83,3,0.45)] lg:bottom-[-28vh] lg:left-[-13vw] lg:h-[38vw] lg:w-[38vw]"
        >
          <div className="absolute left-[14%] top-[18%] h-9 w-9 rounded-full bg-black/20" />
          <div className="absolute left-[37%] top-[24%] h-5 w-12 rounded-full bg-black/15" />
          <div className="absolute left-[43%] top-[54%] h-6 w-20 rounded-full bg-black/20" />
          <div className="absolute left-[60%] top-[67%] h-8 w-8 rounded-full bg-black/20" />
        </motion.div>

        <section className="relative flex min-h-screen items-center justify-center px-6 pt-24 md:px-12 lg:px-16 xl:px-20">
          <div className="relative z-30 mx-auto w-full max-w-280">
            <div className="mb-6 flex items-center justify-between aurelia-mono text-[12px] uppercase tracking-[0.16em] text-white/60">
              <span>Sol 63</span>
              <span>Phase 01</span>
            </div>
            <h1 className="aurelia-display text-center text-[16vw] leading-[0.84] text-[#fff9ee] sm:text-[13vw] lg:text-[165px] xl:text-[182px]">
              AURELIA
            </h1>
            <p className="aurelia-mono mx-auto mt-8 max-w-170 px-2 text-center text-[13px] uppercase tracking-widest text-white/68 md:px-8 md:text-[17px] lg:px-10">
              A hypothetical world demands adaptable logic. This simulator maps uncertain NFA behavior into deterministic DFA systems,
              one subset at a time.
            </p>
            <div className="mt-10 flex justify-center">
              <button onClick={onStart} className="aurelia-cta">
                Start Mission
              </button>
            </div>
            <div className="mt-8 text-center aurelia-mono text-[12px] uppercase tracking-[0.16em] text-white/28">Scroll Down</div>
          </div>
        </section>

        <section className="relative min-h-screen px-6 py-18 md:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-325">
            <div className="relative rounded-[28px] border border-white/10 bg-black/25 px-6 py-14 backdrop-blur-[1px] md:px-14 md:py-18">
              <div className="pointer-events-none absolute -left-8 top-10 h-65 w-65 rounded-full bg-[radial-gradient(circle,rgba(212,83,3,0.3)_0%,rgba(212,83,3,0)_70%)]" />
              <div className="pointer-events-none absolute -bottom-10 right-10 h-45 w-45 rounded-full bg-[radial-gradient(circle,rgba(255,182,66,0.25)_0%,rgba(255,182,66,0)_70%)]" />

              <div className="aurelia-display px-1 text-center text-[16vw] leading-[0.88] text-[#fff9ee] sm:px-6 sm:text-[13vw] lg:px-10 lg:text-[155px]">
                A JOURNEY
                <br />
                THROUGH
                <br />
                STATES
              </div>

              <div className="mt-11 grid gap-4 md:grid-cols-3">
                <div className="aurelia-panel">
                  <div className="aurelia-panel-label">Chapter 01</div>
                  <div className="aurelia-panel-title">Define NFA</div>
                  <p className="aurelia-panel-copy">Load regex or transitions, start state, and accept states.</p>
                </div>
                <div className="aurelia-panel">
                  <div className="aurelia-panel-label">Chapter 02</div>
                  <div className="aurelia-panel-title">Build DFA</div>
                  <p className="aurelia-panel-copy">Track move and epsilon-closure with guided construction logs.</p>
                </div>
                <div className="aurelia-panel">
                  <div className="aurelia-panel-label">Chapter 03</div>
                  <div className="aurelia-panel-title">Validate Words</div>
                  <p className="aurelia-panel-copy">Test strings live against NFA and DFA for instant acceptance feedback.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative min-h-screen px-6 py-18 md:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-325">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,#3c3c3c_0%,#1a1a1a_55%,#0c0c0c_100%)] p-6 md:p-14">
              <div className="aurelia-display px-1 text-[10vw] leading-[0.92] text-[#fff9ee] sm:px-4 sm:text-[8.6vw] lg:px-0 lg:text-[96px]">
                CALL TO
                <br />
                NAVIGATE
                <br />
                COMPLEXITY
              </div>
              <p className="aurelia-mono mt-7 max-w-145 text-[12px] uppercase tracking-[0.12em] text-white/70 md:text-[15px]">
                This interface is a mission console for automata theory: deterministic transitions, explicit state graphs, and clear
                educational checkpoints.
              </p>

              <div className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_1fr]">
                <div className="rounded-2xl border border-white/15 bg-black/40 p-4 md:p-5">
                  <div className="aurelia-mono text-[11px] uppercase tracking-[0.14em] text-white/58">How It Works</div>
                  <div className="mt-3 grid gap-2">
                    {briefingSteps.map((step, idx) => {
                      const active = idx === activeBriefStep;
                      return (
                        <button
                          key={step.id}
                          onClick={() => setActiveBriefStep(idx)}
                          className={`rounded-xl border px-3 py-3 text-left transition-colors ${active ? 'border-[#d45303]/70 bg-[#d45303]/18' : 'border-white/12 bg-black/30 hover:border-white/30'}`}
                        >
                          <div className="aurelia-mono text-[10px] uppercase tracking-[0.16em] text-[#d45303]">{step.id}</div>
                          <div className="aurelia-display mt-1 text-[28px] leading-[0.92] text-[#fff9ee] sm:text-[30px]">{step.title}</div>
                          <p className="aurelia-mono mt-2 text-[11px] uppercase tracking-[0.08em] text-white/65">{step.summary}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/40 p-4 md:p-5">
                  <div className="aurelia-mono text-[11px] uppercase tracking-[0.14em] text-white/58">Current Step Insight</div>
                  <div className="mt-3 rounded-xl border border-white/12 bg-black/35 p-4">
                    <div className="aurelia-display text-[38px] leading-[0.9] text-[#fff9ee] sm:text-[44px]">
                      {briefingSteps[activeBriefStep].title}
                    </div>
                    <p className="aurelia-mono mt-3 text-[11px] uppercase tracking-[0.09em] text-white/72">
                      {briefingSteps[activeBriefStep].detail}
                    </p>
                    <div className="mt-4 rounded-lg border border-[#d45303]/40 bg-[#d45303]/12 px-3 py-2 aurelia-mono text-[11px] uppercase tracking-[0.12em] text-[#ffc89f]">
                      {briefingSteps[activeBriefStep].formula}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/12 bg-black/35 p-4 aurelia-readable">
                    <div className="aurelia-mono text-[11px] uppercase tracking-[0.14em] text-white/58">Mini DFA Playground</div>
                    <p className="mt-2 text-[11px] text-white/68">
                      Enter 0/1 word for sample DFA: start=A, accept=C
                    </p>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={sampleWord}
                        onChange={(e) => setSampleWord(e.target.value.replace(/[^01]/g, '').slice(0, 12))}
                        className="w-full rounded-lg border border-white/20 bg-black/45 px-3 py-2 text-[18px] tracking-[0.08em] text-[#fff9ee] outline-none focus:border-[#d45303]"
                        placeholder="101"
                      />
                      <button
                        onClick={() => setSampleWord('101')}
                        className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-[12px] uppercase tracking-widest text-white/70 transition-colors hover:border-white/50"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {miniTrace.steps.length === 0 ? (
                        <div className="text-[11px] text-white/55">Type a word to see transitions.</div>
                      ) : (
                        miniTrace.steps.map((step) => (
                          <div key={step.index} className="rounded border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white/78">
                            Step {step.index}: {step.from} --({step.symbol})--&gt; {step.to}
                          </div>
                        ))
                      )}
                    </div>

                    <div
                      className={`mt-3 rounded-lg border px-3 py-2 text-[12px] ${miniTrace.invalid ? 'border-red-400/50 bg-red-500/15 text-red-200' : miniTrace.accepted ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-white/20 bg-black/35 text-white/78'}`}
                    >
                      Final state: {miniTrace.finalState} • {miniTrace.invalid ? 'Invalid symbol detected' : miniTrace.accepted ? 'Accepted' : 'Rejected'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <button onClick={onStart} className="aurelia-cta">
                  Enter Simulator
                </button>
                <span className="aurelia-mono text-[11px] uppercase tracking-[0.15em] text-white/40">Visualizer remains unchanged</span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative min-h-screen px-6 pb-22 pt-18 md:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-325 rounded-[28px] border border-white/10 bg-black/30 p-6 backdrop-blur-[1px] md:p-10">
            <div className="aurelia-mono text-center text-[12px] uppercase tracking-[0.14em] text-[#d45303]">[ Chapter ] Determinism</div>
            <h2 className="aurelia-display mt-6 px-1 text-center text-[8.4vw] leading-[0.96] text-[#fff9ee] sm:px-4 sm:text-[6.4vw] lg:px-0 lg:text-[78px]">
              A WORLD OF
              <br />
              LOGICAL
              <br />
              EXTREMES
            </h2>

            <div className="relative mt-11 overflow-hidden rounded-xl border border-white/12 bg-black/45 p-5 md:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,transparent_12.5%,rgba(255,255,255,0.08)_12.6%,transparent_12.7%,transparent_25%,rgba(255,255,255,0.08)_25.1%,transparent_25.2%,transparent_37.5%,rgba(255,255,255,0.08)_37.6%,transparent_37.7%,transparent_50%,rgba(255,255,255,0.08)_50.1%,transparent_50.2%,transparent_62.5%,rgba(255,255,255,0.08)_62.6%,transparent_62.7%,transparent_75%,rgba(255,255,255,0.08)_75.1%,transparent_75.2%,transparent_87.5%,rgba(255,255,255,0.08)_87.6%,transparent_87.7%,transparent_100%)] opacity-35" />
              <div className="relative z-10">
                <div className="aurelia-display text-center text-[52px] leading-none text-white sm:text-[68px]">DFA</div>

                <div className="mt-7 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-white/12 bg-black/35 p-3">
                    <div className="aurelia-mono text-[10px] uppercase tracking-[0.14em] text-[#d45303]">Rule 01</div>
                    <div className="aurelia-display mt-1 text-[30px] leading-[0.9] text-[#fff9ee]">Unique Edge</div>
                    <p className="aurelia-mono mt-2 text-[11px] uppercase tracking-[0.08em] text-white/62">
                      Each DFA state has exactly one outgoing transition per symbol.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/12 bg-black/35 p-3">
                    <div className="aurelia-mono text-[10px] uppercase tracking-[0.14em] text-[#d45303]">Rule 02</div>
                    <div className="aurelia-display mt-1 text-[30px] leading-[0.9] text-[#fff9ee]">Accept Lift</div>
                    <p className="aurelia-mono mt-2 text-[11px] uppercase tracking-[0.08em] text-white/62">
                      A DFA subset is accepting if it contains any accepting NFA state.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/12 bg-black/35 p-3">
                    <div className="aurelia-mono text-[10px] uppercase tracking-[0.14em] text-[#d45303]">Rule 03</div>
                    <div className="aurelia-display mt-1 text-[30px] leading-[0.9] text-[#fff9ee]">Closure First</div>
                    <p className="aurelia-mono mt-2 text-[11px] uppercase tracking-[0.08em] text-white/62">
                      Every move result must pass through epsilon-closure before wiring edges.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-[#d45303]/35 bg-[#d45303]/10 px-4 py-3">
                  <div className="aurelia-mono text-[11px] uppercase tracking-[0.12em] text-[#ffd2b0]">
                    Transition Formula: U = ε-closure(move(T, a))
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
