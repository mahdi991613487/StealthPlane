const { ipcRenderer, clipboard, nativeImage } = require('electron');

function isValidURL(str) {
    const pattern = new RegExp('^(https?:\\/\\/)?' +
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
        '((\\d{1,3}\\.){3}\\d{1,3}))' +
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
        '(\\?[;&a-z\\d%_.~+=-]*)?' +
        '(\\#[-a-z\\d_]*)?$', 'i');
    return !!pattern.test(str);
}

window.addEventListener('DOMContentLoaded', () => {
 const webview = document.querySelector('webview');
 
 
 //SNIPPING FUNCTION
	
	
const deviceRatio = window.devicePixelRatio || 1;

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = screen.width * deviceRatio;
canvas.height = screen.height * deviceRatio;

let bufferCanvas = document.createElement('canvas');
let bufferCtx = bufferCanvas.getContext('2d');
bufferCanvas.width = screen.width * deviceRatio;
bufferCanvas.height = screen.height * deviceRatio;

let isDrawing = false;
let startPoint = {};

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    startPoint.x = e.clientX * deviceRatio;
    startPoint.y = e.clientY * deviceRatio;
    ctx.drawImage(bufferCanvas, 0, 0, screen.width * deviceRatio, screen.height * deviceRatio);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const offsetX = e.clientX * deviceRatio;
    const offsetY = e.clientY * deviceRatio;
    ctx.drawImage(bufferCanvas, 0, 0, screen.width * deviceRatio, screen.height * deviceRatio);
    ctx.beginPath();
    ctx.rect(startPoint.x, startPoint.y, offsetX - startPoint.x, offsetY - startPoint.y);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
});

canvas.addEventListener('mouseup', (e) => {
    isDrawing = false;

    const offsetX = e.clientX * deviceRatio;
    const offsetY = e.clientY * deviceRatio;
    const width = Math.abs(offsetX - startPoint.x);
    const height = Math.abs(offsetY - startPoint.y);
    const startX = Math.min(offsetX, startPoint.x);
    const startY = Math.min(offsetY, startPoint.y);

    if (width === 0 || height === 0) {
        return;
    }
    const snippedImage = ctx.getImageData(startX, startY, width, height);
    const snippedCanvas = document.createElement('canvas');
    snippedCanvas.width = width;
    snippedCanvas.height = height;
    snippedCanvas.getContext('2d').putImageData(snippedImage, 0, 0);

    const snippedDataURL = snippedCanvas.toDataURL();

    clipboard.writeImage(nativeImage.createFromDataURL(snippedDataURL));
    document.body.removeChild(canvas);
});
document.getElementById('snip-button').addEventListener('click', () => {
    if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);

    ipcRenderer.send('capture-screen');
});

ipcRenderer.on('capture-screen-response', (event, response) => {
    if(response.error) {
        console.error("Failed to capture screen:", response.error);
        return;
    }

    const img = new Image();
    img.onload = () => {
        bufferCtx.drawImage(img, 0, 0, screen.width, screen.height);
        ctx.drawImage(bufferCanvas, 0, 0, screen.width, screen.height);

        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '9999';  

   
        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';

        document.body.appendChild(canvas);
    };
    img.src = response.data;
});




//URL BAR
    document.getElementById('url-bar').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            let url = e.target.value;
            if (!isValidURL(url)) {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            ipcRenderer.send('navigate', url);
        }
    });

    document.getElementById('brightness-slider').addEventListener('input', (e) => {
        const opacity = e.target.value;
        ipcRenderer.send('set-opacity', parseFloat(opacity));
    });

    document.getElementById('back-button').addEventListener('click', () => {
        if (webview.canGoBack()) {
            webview.goBack();
        }
    });
document.getElementById('forward-button').addEventListener('click', () => {
    if (webview.canGoForward()) {
        webview.goForward();
    }
});

function hidePrefixAndRemoveBackslashes(url) {
    let modifiedUrl = url.replace(/^https:\/\/(www\.)?/, '');
    modifiedUrl = modifiedUrl.replace(/\/+$/, ''); 
    return modifiedUrl;
}
   



webview.addEventListener('did-navigate', (event) => {
    const urlBar = document.getElementById('url-bar');
    urlBar.value = event.url;
    urlBar.dataset.fullUrl = event.url; 
    urlBar.value = hidePrefixAndRemoveBackslashes(event.url); 
});


document.getElementById('url-bar').addEventListener('focus', (event) => {
    const urlBar = event.target;
    if (urlBar.dataset.fullUrl) {
        urlBar.value = urlBar.dataset.fullUrl; 
    }
});


document.getElementById('url-bar').addEventListener('blur', (event) => {
    const urlBar = event.target;
    if (urlBar.dataset.fullUrl) {
        urlBar.value = hidePrefixAndRemoveBackslashes(urlBar.dataset.fullUrl);
    }
});


    ipcRenderer.on('load-webview', (event, url) => {
        webview.setAttribute('src', url);
    });

    ipcRenderer.on('increase-opacity', () => {
        const brightnessSlider = document.getElementById('brightness-slider');
        brightnessSlider.value = Math.min(brightnessSlider.max, parseFloat(brightnessSlider.value) + 0.01);
        ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
    });

    ipcRenderer.on('decrease-opacity', () => {
        const brightnessSlider = document.getElementById('brightness-slider');
        brightnessSlider.value = Math.max(brightnessSlider.min, parseFloat(brightnessSlider.value) - 0.01);
        ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
    });

    ipcRenderer.on('set-min-opacity', () => {
        const brightnessSlider = document.getElementById('brightness-slider');
        brightnessSlider.value = brightnessSlider.min;
        ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
    });
    ipcRenderer.on('set-max-opacity', () => {
        const brightnessSlider = document.getElementById('brightness-slider');
        brightnessSlider.value = brightnessSlider.max;
        ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
    });
});
