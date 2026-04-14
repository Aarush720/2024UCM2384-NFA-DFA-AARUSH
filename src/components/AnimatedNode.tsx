import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'motion/react';

export function AnimatedNode({ data, selected }: NodeProps) {
  const shouldAnimate = data.animate !== false;
  const isAccept = data.isAccept === true;
  const label = String(data.label ?? '');
  const nodeDiameter = typeof data.style?.width === 'number' ? data.style.width : 30;
  const baseFontSize = typeof data.style?.fontSize === 'string'
    ? Number.parseFloat(data.style.fontSize)
    : 11;
  const estimatedLabelWidth = Math.max(1, label.length) * (baseFontSize * 0.62);
  const fitScale = Math.max(0.42, Math.min(1, (nodeDiameter - 8) / estimatedLabelWidth));
  
  return (
    <motion.div
      layout
      initial={shouldAnimate ? { scale: 0.8, opacity: 0 } : false}
      animate={{ 
        scale: 1, 
        opacity: 1,
        boxShadow: data.style?.boxShadow || 'none'
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 500, 
        damping: 30,
        opacity: { duration: 0.2 }
      }}
      style={{
        ...(data.style as React.CSSProperties),
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        backgroundColor: data.style?.background || '#000',
        position: 'relative',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ top: '50%', left: '50%', opacity: 0 }} />
      
      {/* Inner circle for Accept States */}
      {isAccept && (
        <div 
          style={{
            position: 'absolute',
            inset: 2,
            border: `1px solid ${data.style?.color || '#fff'}`,
            borderRadius: '50%',
            pointerEvents: 'none',
          }} 
        />
      )}

      <span
        className="relative z-20 select-none font-bold tracking-tight"
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          transform: `scale(${fitScale})`,
          transformOrigin: 'center center',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      
      <Handle type="source" position={Position.Bottom} style={{ top: '50%', left: '50%', opacity: 0 }} />
    </motion.div>
  );
}
