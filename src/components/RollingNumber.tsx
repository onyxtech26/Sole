import React, { useEffect, useState } from 'react';

interface RollingNumberProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
}

export default function RollingNumber({ value, duration = 1200, isCurrency = false }: RollingNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Cubic ease-out curve for smooth deceleration
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      const current = startValue + easedProgress * (endValue - startValue);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  if (isCurrency) {
    return (
      <span>
        €{displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    );
  }

  return <span>{Math.round(displayValue).toLocaleString()}</span>;
}
