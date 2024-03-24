const { ipcRenderer, clipboard, nativeImage } = require('electron');

// Function to validate URLs
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

 


 // Snipping Tool class
 class SnippingTool {
   constructor() {
     this.startX = null;
     this.startY = null;
     this.isDrawing = false;
     this.rect = document.getElementById('rect');

     this.attachEventListeners();
   }

   attachEventListeners() {
     document.addEventListener('mousedown', this.handleMouseDown.bind(this));
     document.addEventListener('mousemove', this.handleMouseMove.bind(this));
     document.addEventListener('mouseup', this.handleMouseUp.bind(this));
     document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        ipcRenderer.send('cancel-snipping');
      }
    });
     document.getElementById('snip-button').addEventListener('click', this.initiateSnipping.bind(this));
   }

   handleMouseDown(e) {
     if (!this.isDrawing) {
       this.startX = e.clientX;
       this.startY = e.clientY;
       this.isDrawing = true;
       if (this.rect) {
         this.rect.style.visibility = 'visible';
       }
     }
   }

   handleMouseMove(e) {
     if (this.rect && this.isDrawing && this.startX !== null) {
       const { width, height, left, top } = this.calculateDimensions(e.clientX, e.clientY);

       this.rect.style.width = `${width}px`;
       this.rect.style.height = `${height}px`;
       this.rect.style.left = `${left}px`;
       this.rect.style.top = `${top}px`;
     }
   }

   handleMouseUp(e) {
     if (this.isDrawing) {
       const { width, height, left, top } = this.calculateDimensions(e.clientX, e.clientY);

       ipcRenderer.send('capture-portion', {
         x: left,
         y: top,
         width,
         height
       });
       this.reset();
     }
   }

   calculateDimensions(currentX, currentY) {
     const width = Math.abs(currentX - this.startX);
     const height = Math.abs(currentY - this.startY);
     const left = Math.min(currentX, this.startX);
     const top = Math.min(currentY, this.startY);

     return { width, height, left, top };
   }

   initiateSnipping() {
     console.log('Snipping button clicked');

     ipcRenderer.send('start-snipping');
   }

   reset() {
     this.startX = null;
     this.startY = null;
     this.isDrawing = false;
     if (this.rect) {
       this.rect.style.visibility = 'hidden';
     }
   }
 }

 new SnippingTool();

 // Event listener for URL bar enter key press
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

 // Event listener for brightness slider input
 document.getElementById('brightness-slider').addEventListener('input', (e) => {
   const opacity = e.target.value;
   ipcRenderer.send('set-opacity', parseFloat(opacity));
 });

 const backButton = document.getElementById('back-button');
 const forwardButton = document.getElementById('forward-button');
 const webView = document.querySelector('webview');

 // Function to update navigation buttons state
 function updateNavButtons() {
   if (webView.canGoBack()) {
     backButton.classList.remove('disabled-button');
   } else {
     backButton.classList.add('disabled-button');
   }

   if (webView.canGoForward()) {
     forwardButton.classList.remove('disabled-button');
   } else {
     forwardButton.classList.add('disabled-button');
   }
 }

 webView.addEventListener('did-navigate', updateNavButtons);
 webView.addEventListener('did-navigate-in-page', updateNavButtons);

 // Event listener for back button click
 document.getElementById('back-button').addEventListener('click', () => {
   if (webview.canGoBack()) {
     webview.goBack();
   }
 });

 // Event listener for forward button click
 document.getElementById('forward-button').addEventListener('click', () => {
   if (webview.canGoForward()) {
     webview.goForward();
   }
 });

 // Function to hide URL prefix and remove trailing backslashes
 function hidePrefixAndRemoveBackslashes(url) {
   let modifiedUrl = url.replace(/^https:\/\/(www\.)?/, '');
   modifiedUrl = modifiedUrl.replace(/\/+$/, '');
   return modifiedUrl;
 }

 // Function to toggle controls visibility
 function toggleControls() {
   const controls = document.getElementById('controls');
   if (controls.style.display === 'none') {
     controls.style.display = 'flex';
   } else {
     controls.style.display = 'none';
   }
 }

 ipcRenderer.on('toggle-controls', toggleControls);

 // Event listener for webview navigation
 webview.addEventListener('did-navigate', (event) => {
   const urlBar = document.getElementById('url-bar');
   urlBar.value = event.url;
   urlBar.dataset.fullUrl = event.url;
   urlBar.value = hidePrefixAndRemoveBackslashes(event.url);
 });

 // Event listener for URL bar focus
 document.getElementById('url-bar').addEventListener('focus', (event) => {
   const urlBar = event.target;
   if (urlBar.dataset.fullUrl) {
     urlBar.value = urlBar.dataset.fullUrl;
   }
 });

 // Event listener for URL bar blur
 document.getElementById('url-bar').addEventListener('blur', (event) => {
   const urlBar = event.target;
   if (urlBar.dataset.fullUrl) {
     urlBar.value = hidePrefixAndRemoveBackslashes(urlBar.dataset.fullUrl);
   }
 });

 // Event listener for loading webview
 ipcRenderer.on('load-webview', (event, url) => {
   webview.setAttribute('src', url);
 });

 // Event listener for navigation from cover
 ipcRenderer.on('navigate-from-cover', (event, urlOrQuery) => {
   let url = urlOrQuery;
   if (!isValidURL(url)) {
     url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
   } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
     url = 'https://' + url;
   }
   webview.setAttribute('src', url);
 });

 // Event listener for increasing opacity
 ipcRenderer.on('increase-opacity', () => {
   const brightnessSlider = document.getElementById('brightness-slider');
   brightnessSlider.value = Math.min(brightnessSlider.max, parseFloat(brightnessSlider.value) + 0.01);
   ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
 });

 // Event listener for decreasing opacity
 ipcRenderer.on('decrease-opacity', () => {
   const brightnessSlider = document.getElementById('brightness-slider');
   brightnessSlider.value = Math.max(brightnessSlider.min, parseFloat(brightnessSlider.value) - 0.01);
   ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
 });

 // Event listener for setting minimum opacity
 ipcRenderer.on('set-min-opacity', () => {
   const brightnessSlider = document.getElementById('brightness-slider');
   brightnessSlider.value = brightnessSlider.min;
   ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
 });
 ipcRenderer.on('toggle-frame', () => {
  ipcRenderer.send('toggle-frame');
});

 // Event listener for setting maximum opacity
 ipcRenderer.on('set-max-opacity', () => {
   const brightnessSlider = document.getElementById('brightness-slider');
   brightnessSlider.value = brightnessSlider.max;
   ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
 });

  // Event listener to Increase window size
 ipcRenderer.on('increase-window-size', () => {
  ipcRenderer.send('increase-window-size');
});

  // Event listener to decrease window size
ipcRenderer.on('decrease-window-size', () => {
  ipcRenderer.send('decrease-window-size');
});

  // Event listener to quit the app
ipcRenderer.on('quit-app', () => {
  ipcRenderer.send('quit-app');
});

  // Event listener to hide and unhide the app 
ipcRenderer.on('toggle-window', () => {
  ipcRenderer.send('toggle-window');
});

  // Event listener to start the snipping tool 
ipcRenderer.on('snipping-tool', () => {
  ipcRenderer.send('snipping-tool');
});

 // Event listener for settings button click
 document.getElementById('settings-button').addEventListener('click', function() {
   window.location.href = "../html/settings.html";
 });


});