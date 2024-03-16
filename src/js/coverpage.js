const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', function() {
    const startUrlBar = document.getElementById('start-url-bar');
    startUrlBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const urlOrQuery = e.target.value;
            ipcRenderer.send('start-navigation', urlOrQuery);
        }
    });

     // Select the canvas element and get its 2D context for drawing.
     var canvas = document.getElementById('spaceCanvas');
     var ctx = canvas.getContext('2d');
     // Set the canvas width and height to fill the window.
     canvas.width = window.innerWidth;
     canvas.height = window.innerHeight;
     // Define layers for stars with different speeds and counts to simulate depth.
     var layers = [{count: 100, speed: 0.5}, {count: 50, speed: 0.3}, {count: 25, speed: 0.1}];
     var stars = []; // Array to store star properties.
     var meteors = []; // Array to store meteor properties.
     var meteorFrequency = 0.002; // Chance of generating a meteor each frame.
 
     // Function to populate the stars array with stars for each layer.
     function createStars() {
         stars = [];
         layers.forEach(layer => {
             for (let i = 0; i < layer.count; i++) {
                 stars.push({
                     x: Math.random() * canvas.width, // Random x position.
                     y: Math.random() * canvas.height, // Random y position.
                     size: Math.random() * (layer.speed + 0.5), // Size influenced by layer speed.
                     velocity: Math.random() * layer.speed, // Movement speed.
                     alpha: 0.5 + Math.random() * 0.5 // Opacity.
                 });
             }
         });
     }
 
     // Function to potentially add a new meteor to the meteors array based on meteorFrequency.
     function createMeteor() {
         if (Math.random() < meteorFrequency) {
             meteors.push({
                 x: Math.random() * canvas.width,
                 y: 0, // Start at the top of the canvas.
                 size: 2 + Math.random() * 3, // Random size.
                 velocity: 10 + Math.random() * 5, // Speed of descent.
                 alpha: 1, // Full opacity.
                 lifespan: 100 + Math.random() * 100 // How long the meteor exists before disappearing.
             });
         }
     }
 
     // Main drawing function to animate stars and meteors.
     function draw() {
         // Clear the canvas each frame.
         ctx.clearRect(0, 0, canvas.width, canvas.height);
 
         // Draw and update each star.
         stars.forEach(star => {
             star.x -= star.velocity; // Move star leftwards.
             if (star.x < 0) { // If star moves past the left edge, wrap it to the right side.
                 star.x = canvas.width;
                 star.y = Math.random() * canvas.height;
             }
             // Randomly adjust star opacity for a twinkling effect.
             star.alpha += Math.random() * 0.2 - 0.1; 
             star.alpha = Math.min(Math.max(star.alpha, 0.3), 1); 
 
             // Draw star as a circle.
             ctx.beginPath();
             ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
             ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
             ctx.fill();
         });
 
         // Draw and update each meteor.
         meteors.forEach((meteor, index) => {
             meteor.x -= meteor.velocity; // Move meteor diagonally.
             meteor.y += meteor.velocity;
             meteor.lifespan -= 1; // Decrease lifespan.
 
             // Draw meteor as a line.
             ctx.beginPath();
             ctx.moveTo(meteor.x, meteor.y);
             ctx.lineTo(meteor.x + meteor.velocity, meteor.y - meteor.velocity); // Create a tail effect.
             ctx.strokeStyle = `rgba(255, 255, 255, ${meteor.alpha})`;
             ctx.lineWidth = meteor.size;
             ctx.stroke();
 
             // Remove meteor if it moves off-screen or its lifespan ends.
             if (meteor.x < 0 || meteor.y > canvas.height || meteor.lifespan <= 0) {
                 meteors.splice(index, 1);
             }
         });
 
         // Attempt to create a new meteor each frame.
         createMeteor();
         // Recursively call draw to animate; requestAnimationFrame allows for smooth animation.
         requestAnimationFrame(draw);
     }
 
     // Adjust canvas size and regenerate stars when the window is resized to maintain full coverage.
     window.addEventListener('resize', function() {
         canvas.width = window.innerWidth;
         canvas.height = window.innerHeight;
         createStars();
     });
 
     // Initialize stars and start the animation loop.
     createStars();
     draw();
 });