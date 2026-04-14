import { motion, AnimatePresence } from 'motion/react';

export function GhostMerge({ states }: { states: string[] }) {
  if (!states || states.length === 0) {
    return (
      <div className="flex items-center h-10 px-4 bg-white/5 border border-dashed border-white/10 rounded-lg">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#555]">Waiting for subset...</span>
      </div>
    );
  }
  
  return (
    <div className="relative flex gap-2 h-10 items-center">
      <div className="flex -space-x-3">
        <AnimatePresence mode="popLayout">
          {states.map((s, i) => (
            <motion.div
              key={`${s}-${i}`}
              initial={{ x: 20, opacity: 0, scale: 0.5 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ 
                type: 'spring',
                stiffness: 400,
                damping: 25,
                delay: i * 0.05 
              }}
              className="w-8 h-8 bg-black text-[var(--color-accent)] rounded-full flex items-center justify-center font-mono text-[10px] border border-[var(--color-accent)] shadow-[0_0_15px_rgba(237,192,1,0.2)] relative z-20"
              style={{ zIndex: 100 - i }}
            >
              {s}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        key={states.join('-')}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="ml-6 flex items-center gap-3 font-mono text-sm"
      >
        <span className="text-[#444] tracking-widest">→</span>
        <span className="px-3 py-1 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded text-[var(--color-accent)] shadow-[0_0_20px_rgba(237,192,1,0.05)]">
          {'{' + states.join(', ') + '}'}
        </span>
      </motion.div>
    </div>
  );
}
