import React from 'react';
import { EdgeProps } from 'reactflow';
import { motion } from 'motion/react';

export function AnimatedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  target,
  style = {},
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const sourceRadius = Math.max(8, Number(data?.sourceSize ?? 30) / 2);
  const targetRadius = Math.max(8, Number(data?.targetSize ?? 30) / 2);
  const targetOffset = targetRadius + 0.6;
  
  let path = '';
  let labelX = 0;
  let labelY = 0;

  if (source === target) {
    // Elegant, circular self-loop
    const sweep = 40;
    const startA = (-90 - sweep / 2) * (Math.PI / 180);
    const endA = (-90 + sweep / 2) * (Math.PI / 180);
    
    const sX = sourceX + sourceRadius * Math.cos(startA);
    const sY = sourceY + sourceRadius * Math.sin(startA);
    const eX = sourceX + targetOffset * Math.cos(endA);
    const eY = sourceY + targetOffset * Math.sin(endA);
    
    const loopLift = Math.max(24, sourceRadius * 1.5);
    const cp1X = sourceX + (sourceRadius + loopLift) * Math.cos(startA);
    const cp1Y = sourceY + (sourceRadius + loopLift) * Math.sin(startA);
    const cp2X = sourceX + (sourceRadius + loopLift) * Math.cos(endA);
    const cp2Y = sourceY + (sourceRadius + loopLift) * Math.sin(endA);
    
    path = `M ${sX} ${sY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${eX} ${eY}`;
    labelX = sourceX;
    labelY = sourceY - sourceRadius - loopLift + 2;
  } else {
    const isBidirectional = data?.isBidirectional;
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    const normX = -dy / length;
    const normY = dx / length;
    
    // Base curvature for typical neighbor connections
    let offset = isBidirectional ? 25 : 15;
    
    // Dynamic curvature specifically for very long expression skipping or backtracking
    if (length > 150) {
        // Curve gets taller the further the nodes are (up to a ceiling)
        offset += Math.min((length - 150) * 0.25, 120);
    }
    
    const cpX = midX + normX * offset;
    const cpY = midY + normY * offset;
    
    const startAngle = Math.atan2(cpY - sourceY, cpX - sourceX);
    const endAngle = Math.atan2(cpY - targetY, cpX - targetX);
    
    const sX = sourceX + sourceRadius * Math.cos(startAngle);
    const sY = sourceY + sourceRadius * Math.sin(startAngle);
    const eX = targetX + targetOffset * Math.cos(endAngle);
    const eY = targetY + targetOffset * Math.sin(endAngle);
    
    path = `M ${sX} ${sY} Q ${cpX} ${cpY} ${eX} ${eY}`;
    labelX = cpX + normX * 14;
    labelY = cpY + normY * 14;
  }

  return (
    <>
      <motion.path
        id={`edge-${source}-${target}`}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd}
        style={style}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ 
          pathLength: { duration: 0.8, ease: "easeOut" },
          opacity: { duration: 0.3 }
        }}
      />
      {label && (
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          x={labelX}
          y={labelY}
          style={{
            fill: 'var(--color-text-muted)',
            fontSize: 10,
            fontWeight: 500,
            textAnchor: 'middle',
            dominantBaseline: 'central',
            textShadow: '0 0 4px #000, 0 0 4px #000',
            pointerEvents: 'none',
          }}
        >
          {label}
        </motion.text>
      )}
    </>
  );
}
