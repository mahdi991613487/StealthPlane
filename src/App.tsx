import React, { useEffect, useRef } from 'react';
import './App.scss';
import StealthPlaneImage from './assets/StealthPlane.svg';
import { useNavigate } from 'react-router-dom';
import useShortcuts from '../src/components/shortcuts/shortcuts';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  
  const shortcuts = useShortcuts();

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const layers = [
      { count: 100, speed: 0.5 },
      { count: 50, speed: 0.3 },
      { count: 25, speed: 0.1 },
    ];
    let stars: { x: number; y: number; size: number; velocity: number; alpha: number }[] = [];
    let meteors: { x: number; y: number; size: number; velocity: number; alpha: number; lifespan: number }[] = [];
    const meteorFrequency = 0.002;
    let lastFrameTime = Date.now();

    function createStars() {
      stars = [];
      layers.forEach((layer) => {
        for (let i = 0; i < layer.count; i++) {
          stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * (layer.speed + 0.5),
            velocity: Math.random() * layer.speed,
            alpha: 0.5 + Math.random() * 0.5,
          });
        }
      });
    }

    function createMeteor() {
      if (Math.random() < meteorFrequency) {
        meteors.push({
          x: Math.random() * canvas.width,
          y: 0,
          size: 2 + Math.random() * 3,
          velocity: 10 + Math.random() * 5,
          alpha: 1,
          lifespan: 100 + Math.random() * 100,
        });
      }
    }

    function draw() {
      const now = Date.now();
      const deltaTime = (now - lastFrameTime) / (1000 / 144); 
      lastFrameTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        star.x -= star.velocity * deltaTime;
        if (star.x < 0) {
          star.x = canvas.width;
          star.y = Math.random() * canvas.height;
        }
        star.alpha += (Math.random() * 0.2 - 0.1) * deltaTime;
        star.alpha = Math.min(Math.max(star.alpha, 0.3), 1);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
      });

      meteors.forEach((meteor, index) => {
        meteor.x -= meteor.velocity * deltaTime;
        meteor.y += meteor.velocity * deltaTime;
        meteor.lifespan -= 1 * deltaTime;

        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(meteor.x + meteor.velocity * deltaTime, meteor.y - meteor.velocity * deltaTime);
        ctx.strokeStyle = `rgba(255, 255, 255, ${meteor.alpha})`;
        ctx.lineWidth = meteor.size;
        ctx.stroke();

        if (meteor.x < 0 || meteor.y > canvas.height || meteor.lifespan <= 0) {
          meteors.splice(index, 1);
        }
      });

      createMeteor();
      requestAnimationFrame(draw);
    }

    function handleResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createStars();
    }

    window.addEventListener('resize', handleResize);

    createStars();
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleStartNavigation = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const urlOrQuery = event.currentTarget.value;
      navigate('/main', { state: { urlOrQuery } });
    }
  };

  return (
    <>
      <canvas ref={canvasRef} id="spaceCanvas"></canvas>
      <div id="start-page">
        <div id="logo-container">
          <img src={StealthPlaneImage} alt="StealthPlane" />
          <h1 id="title">StealthPlane</h1>
          <p id="description">Enter the URL below to get started - experience a stealthy browsing flight</p>
        </div>
        <input
          type="text"
          id="start-url-bar"
          placeholder="Search Google or type a URL"
          onKeyDown={handleStartNavigation}
        />
      </div>
      {}
      <div id="controls">
        <input
          type="range"
          id="brightness-slider"
          min="0.0001"
          max="1"
          step="0.0001"
          defaultValue="1"
          onChange={(event) => window.ipcRenderer.send('set-opacity', parseFloat(event.target.value))}
        />
      </div>
    </>
  );
};

export default App;