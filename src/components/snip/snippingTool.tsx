import React, { useState, useEffect, useRef } from 'react';
import './snippingTool.css';

const SnippingTool: React.FC = () => {
  const rectRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      setStartX(e.clientX);
      setStartY(e.clientY);

      if (rectRef.current) {
        rectRef.current.style.left = `${e.clientX}px`;
        rectRef.current.style.top = `${e.clientY}px`;
        rectRef.current.style.width = '0px';
        rectRef.current.style.height = '0px';
        rectRef.current.style.visibility = 'visible';
        setIsDragging(true);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && rectRef.current) {
        const width = Math.abs(e.clientX - startX);
        const height = Math.abs(e.clientY - startY);
        const left = Math.min(e.clientX, startX);
        const top = Math.min(e.clientY, startY);

        rectRef.current.style.width = `${width}px`;
        rectRef.current.style.height = `${height}px`;
        rectRef.current.style.left = `${left}px`;
        rectRef.current.style.top = `${top}px`;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (rectRef.current) {
        rectRef.current.style.visibility = 'hidden';
        const width = parseInt(rectRef.current.style.width, 10);
        const height = parseInt(rectRef.current.style.height, 10);
        if (width > 0 && height > 0) {
          window.ipcRenderer.send('capture-portion', {
            x: parseInt(rectRef.current.style.left, 10),
            y: parseInt(rectRef.current.style.top, 10),
            width,
            height,
          });
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.ipcRenderer.send('cancel-snipping');
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [startX, startY]);

  return (
    <div id="snipping-tool">
      <div id="snip-modal">Press ESC to cancel snipping</div>
      <div id="rect" ref={rectRef} />
    </div>
  );
};

export default SnippingTool;