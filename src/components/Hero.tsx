import { motion } from 'motion/react';

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen flex items-center px-10 box-border overflow-hidden">
      {/* Content */}
      <div className="relative z-10 flex flex-col items-start max-w-5xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[100px] leading-[0.85] font-black tracking-[-4px] m-0 z-10 relative pointer-events-none uppercase">
            <span className="block">Subset</span>
            <span className="block">Engine</span>
          </h1>
          <p className="max-w-[300px] text-[13px] leading-[1.6] text-[#888] ml-10 mt-6 mb-10">
            Converting Non-deterministic Finite Automata into optimized Deterministic structures via mathematical mapping.
          </p>
          
          <button
            onClick={onStart}
            className="ml-10 px-6 py-2 border border-white rounded-[20px] text-white hover:bg-white hover:text-black transition-colors text-[11px] uppercase tracking-[2px] cursor-pointer"
          >
            Start Engine
          </button>
        </motion.div>
      </div>

      {/* Floating Glass Object */}
      <motion.div
        animate={{
          rotate: [-15, -10, -15],
          y: [-10, 10, -10],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute right-[180px] top-1/2 -translate-y-1/2 w-[280px] h-[280px] glass-panel rounded-[40px] z-[1]"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[15deg] w-[120px] h-[120px] border-2 border-[var(--color-accent)] rounded-full flex items-center justify-center shadow-[0_0_30px_var(--color-accent)]">
          {'{q0, q1}'}
        </div>
        <div className="text-[10px] tracking-[2px] uppercase text-[var(--color-accent)] mt-[200px] text-center">
          Current Subset State
        </div>
      </motion.div>
    </div>
  );
}
