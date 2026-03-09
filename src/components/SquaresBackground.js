import { useEffect, useRef } from 'react';

export default function SquaresBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let squares = [];
    const squareSize = 40;
    const squareGap = 4;
    let cols, rows;
    let animationId;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(window.innerWidth / (squareSize + squareGap));
      rows = Math.ceil(window.innerHeight / (squareSize + squareGap));
      initSquares();
    }

    function initSquares() {
      squares = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          squares.push({
            x: i * (squareSize + squareGap),
            y: j * (squareSize + squareGap),
            opacity: Math.random() * 0.3,
            targetOpacity: Math.random() * 0.3,
            speed: 0.005 + Math.random() * 0.01
          });
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      squares.forEach(sq => {
        if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) {
          sq.targetOpacity = Math.random() * 0.4;
        }
        sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
        
        ctx.fillStyle = `rgba(4, 130, 195, ${sq.opacity})`;
        ctx.fillRect(sq.x, sq.y, squareSize, squareSize);
      });
      
      animationId = requestAnimationFrame(animate);
    }

    resize();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="squares-bg" />;
}
