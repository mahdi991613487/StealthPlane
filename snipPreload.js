const { ipcRenderer, screen } = require('electron');

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = screen.width;
canvas.height = screen.height;
document.body.appendChild(canvas);

let isDrawing = false;
let startPoint = {};

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    startPoint.x = e.offsetX;
    startPoint.y = e.offsetY;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.rect(startPoint.x, startPoint.y, e.offsetX - startPoint.x, e.offsetY - startPoint.y);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
});

canvas.addEventListener('mouseup', (e) => {
    isDrawing = false;
    
    ipcRenderer.send('request-screenshot');
    ipcRenderer.once('capture-screen-response', (event, response) => {
        if(response.error) {
            console.error("Failed to capture screen:", response.error);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const startX = Math.min(e.offsetX, startPoint.x);
            const startY = Math.min(e.offsetY, startPoint.y);
            const width = Math.abs(e.offsetX - startPoint.x);
            const height = Math.abs(e.offsetY - startPoint.y);
            
            const snippedCanvas = document.createElement('canvas');
            snippedCanvas.width = width;
            snippedCanvas.height = height;
            snippedCanvas.getContext('2d').drawImage(img, startX, startY, width, height, 0, 0, width, height);
            
            ipcRenderer.send('snip-done', snippedCanvas.toDataURL());
        };
        img.src = response.data;
    });
});
