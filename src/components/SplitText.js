import { useEffect, useRef } from 'react';

export default function SplitText({ text, className = '', delay = 0 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const chars = containerRef.current.querySelectorAll('.split-char');
    chars.forEach((char, i) => {
      char.style.animationDelay = `${(i * 0.05) + delay}s`;
    });
  }, [text, delay]);

  return (
    <span ref={containerRef} className={`split-text ${className}`}>
      {text.split('').map((char, i) => (
        <span key={i} className="split-char">
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
