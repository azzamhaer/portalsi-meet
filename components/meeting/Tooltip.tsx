'use client';
import React from 'react';

export function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="tooltip-container">
      {children}
      <span className="tooltip-text">{text}</span>
    </div>
  );
}
