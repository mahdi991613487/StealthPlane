const { ipcRenderer } = require('electron');


document.addEventListener('DOMContentLoaded', function() {
    const startUrlBar = document.getElementById('start-url-bar');
    startUrlBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const urlOrQuery = e.target.value;
        ipcRenderer.send('start-navigation', urlOrQuery);
      }
    });


    var canvas = document.getElementById('spaceCanvas');
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var layers = [{count: 100, speed: 0.5}, {count: 50, speed: 0.3}, {count: 25, speed: 0.1}];
    var stars = [];
    var meteors = [];
    var meteorFrequency = 0.002; 
    function createStars() {
        stars = []; 
        layers.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * (layer.speed + 0.5),
                    velocity: Math.random() * layer.speed,
                    alpha: 0.5 + Math.random() * 0.5
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
                lifespan: 100 + Math.random() * 100 
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
            star.x -= star.velocity;
            if (star.x < 0) {
                star.x = canvas.width;
                star.y = Math.random() * canvas.height;
            }

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.fill();
        });

        meteors.forEach((meteor, index) => {
            meteor.x -= meteor.velocity;
            meteor.y += meteor.velocity;
            meteor.lifespan -= 1;

            ctx.beginPath();
            ctx.moveTo(meteor.x, meteor.y);
            ctx.lineTo(meteor.x + meteor.velocity, meteor.y - meteor.velocity); 
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

    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createStars();
    });

    createStars();
    draw();
});