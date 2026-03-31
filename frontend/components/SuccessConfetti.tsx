'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

export default function SuccessConfetti() {
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (fired) return;
      setFired(true);

      // First burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.5, y: 0.6 },
        colors: ['#0ea5e9', '#6366f1', '#a855f7', '#10b981', '#f59e0b'],
        scalar: 0.9,
      });

      // Second burst slightly offset
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { x: 0.4, y: 0.65 },
          colors: ['#0ea5e9', '#6366f1'],
        });
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { x: 0.6, y: 0.65 },
          colors: ['#10b981', '#a855f7'],
        });
      }, 200);
    };

    window.addEventListener('poll:vote-success', handler);
    return () => window.removeEventListener('poll:vote-success', handler);
  }, [fired]);

  return null;
}
