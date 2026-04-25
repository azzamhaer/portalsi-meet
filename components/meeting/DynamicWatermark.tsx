'use client';

import { useEffect, useState } from 'react';

export function DynamicWatermark({ name, roomId }: { name: string; roomId: string }) {
  const [pos, setPos] = useState({ top: '50%', left: '50%' });

  useEffect(() => {
    const move = () => {
      // Random position keeping it somewhat within bounds
      const t = Math.floor(Math.random() * 80) + 10;
      const l = Math.floor(Math.random() * 80) + 10;
      setPos({ top: `${t}%`, left: `${l}%` });
    };
    move();
    const interval = setInterval(move, 8000); // Move every 8 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed z-[45] pointer-events-none select-none text-white/10 font-bold text-2xl md:text-4xl whitespace-nowrap"
      style={{
        top: pos.top,
        left: pos.left,
        transform: 'translate(-50%, -50%)',
        transition: 'all 8s linear',
        textShadow: '0px 0px 8px rgba(0,0,0,0.2)'
      }}
    >
      {name} • {roomId}
    </div>
  );
}
