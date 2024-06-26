// Function to get URL parameters
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const queries = queryString.split('&');
    queries.forEach(query => {
        const [key, value] = query.split('=');
        params[key] = decodeURIComponent(value);
    });
    return params;
}

// Apply configuration from URL parameters
function applyConfigFromParams(params) {
    if (params.shape) {
        document.getElementById('shapeSelect').value = params.shape;
    }
    if (params.colorMode) {
        document.getElementById('colorModeSelect').value = params.colorMode;
    }
    if (params.echoEffect) {
        document.getElementById('echoSlider').value = params.echoEffect;
    }
    if (params.fallingEffect) {
        document.getElementById('fallingToggle').checked = params.fallingEffect === 'true';
    }
}

let webcamStream;
let webcamCanvas;
let webcamCtx;
let xrSession = null;
let xrRefSpace = null;
let isXRSessionActive = false;


function startWebcam() {
    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            webcamStream = stream;
            video.srcObject = stream;

            webcamCanvas = document.createElement('canvas');
            webcamCanvas.width = 320;
            webcamCanvas.height = 240;
            webcamCtx = webcamCanvas.getContext('2d');

            video.addEventListener('play', () => {
                function drawVideoFrame() {
                    if (video.paused || video.ended) {
                        return;
                    }
                    webcamCtx.drawImage(video, 0, 0, webcamCanvas.width, webcamCanvas.height);
                    requestAnimationFrame(drawVideoFrame);
                }
                drawVideoFrame();
            });
        })
        .catch(error => {
            console.error('Error accessing webcam:', error);
        });
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
    }
    webcamStream = null;
    webcamCanvas = null;
    webcamCtx = null;
}

function getWebcamColor(x, y) {
    if (!webcamCtx) return '#FFFFFF';
    const frame = webcamCtx.getImageData(x, y, 1, 1).data;
    return `rgb(${frame[0]}, ${frame[1]}, ${frame[2]})`;
}

document.addEventListener('DOMContentLoaded', (event) => {
    // Get query params and apply configuration
    const params = getQueryParams();
    applyConfigFromParams(params);

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {

            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 32;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            analyser.smoothingTimeConstant = 0.85;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const frequencyStep = (audioContext.sampleRate / 2) / bufferLength;

            const shapeSelect = document.getElementById('shapeSelect');
            const colorModeSelect = document.getElementById('colorModeSelect');
            const echoSlider = document.getElementById('echoSlider');
            const fallingToggle = document.getElementById('fallingToggle');
            const webcamToggle = document.getElementById('webcamToggle');
            const enterVRButton = document.getElementById('enterVRButton');

            webcamToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    startWebcam();
                } else {
                    stopWebcam();
                }
            });

            let centerX = window.innerWidth / 2;
            let centerY = window.innerHeight / 2;

            function renderFrame(timestamp, frame) {
                if (xrSession) {
                    xrSession.requestAnimationFrame(renderFrame);
                } else {
                    requestAnimationFrame(renderFrame);
                }
                analyser.getByteFrequencyData(dataArray);
    
                const canvas = document.getElementById('mandalaCanvas');
                const ctx = canvas.getContext('2d');
                const gl = canvas.getContext('webgl', { xrCompatible: true });
    
                // Set global alpha for echo effect
                ctx.fillStyle = `rgba(0, 0, 0, ${echoSlider.value})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
    
                const falling = fallingToggle.checked;
    
                if (falling) {
                    // Move shapes towards the center
                    centerX += (window.innerWidth / 2 - centerX) * 0.05;
                    centerY += (window.innerHeight / 2 - centerY) * 0.05;
                } else {
                    // Move shapes outwards
                    centerX -= (centerX - window.innerWidth / 2) * 0.05;
                    centerY -= (centerY - window.innerHeight / 2) * 0.05;
                }
    
                generateMandala(dataArray, ctx, canvas, frequencyStep, bufferLength, shapeSelect.value, colorModeSelect.value, centerX, centerY, webcamToggle.checked);
            }

            renderFrame();
            
            // WebXR setup
            enterVRButton.addEventListener('click', () => {
                if (navigator.xr) {
                    navigator.xr.requestSession('immersive-vr', {
                        optionalFeatures: ['local-floor', 'bounded-floor']
                    }).then(onSessionStarted).catch(err => {
                        console.error('Failed to start XR session:', err);
                    });
                } else {
                    alert('WebXR not supported in this browser.');
                }
            });
    
            function onSessionStarted(session) {
                xrSession = session;
                isXRSessionActive = true;
                session.addEventListener('end', onSessionEnded);
                session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
                session.requestReferenceSpace('local-floor').then(refSpace => {
                    xrRefSpace = refSpace;
                    session.requestAnimationFrame(renderFrame);
                });
            }
    
            function onSessionEnded(event) {
                xrSession = null;
            }
            
            function onXRFrame(time, frame) {
                const session = frame.session;
                session.requestAnimationFrame(onXRFrame);

                // Your rendering code here
                renderFrame();
            }

        })
        .catch(error => {
            console.error('Error capturing audio:', error);
        });

    function generateMandala(audioData, ctx, canvas, frequencyStep, bufferLength, shape, colorMode, centerX, centerY, useWebcamColors) {
        const majorRadius = 150;
        const minorRadius = 50;

        audioData.forEach((value, index) => {
            const frequency = index * frequencyStep;
            let color;
            if (useWebcamColors && webcamCtx) {
                const x = Math.floor(Math.random() * webcamCanvas.width);
                const y = Math.floor(Math.random() * webcamCanvas.height);
                color = getWebcamColor(x, y);
            } else {
                color = (colorMode === 'rainbow') ? mapFrequencyToColor(frequency) : mapFrequencyToChakraColor(frequency);
            }

            const u = (index / bufferLength) * 2 * Math.PI;
            const v = (value / 255) * 2 * Math.PI;

            switch (shape) {
                case 'circle':
                    drawCircle(ctx, centerX, centerY, value, color);
                    break;

                case 'torus':
                    drawTorus(ctx, centerX, centerY, value, u, v, majorRadius, minorRadius, color);
                    break;

                case 'square':
                    drawSquare(ctx, centerX, centerY, value, u, color);
                    break;

                case 'flowerOfLife':
                    drawFlowerOfLife(ctx, centerX, centerY, value, color);
                    break;

                case 'metatronsCube':
                    drawMetatronsCube(ctx, centerX, centerY, value, color);
                    break;

                case 'drawInterlappingCircles':
                    drawInterlappingCircles(ctx, centerX, centerY, value, color);
                    break;

                case 'spiral':
                    drawSpiral(centerX, centerY, majorRadius, minorRadius, u, v, color, ctx);
                    break;

                default:
                    break;
            }
        });
    }

    // Existing canvas setup and resize handler

    function setupCanvas() {
        const canvas = document.getElementById('mandalaCanvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', setupCanvas);
    setupCanvas();
});

function mapFrequencyToChakraColor(frequency) {
    const chakraFrequencies = [
        { range: [200, 400], color: 'Red' },
        { range: [400, 800], color: 'Orange' },
        { range: [800, 1500], color: 'Yellow' },
        { range: [1500, 3000], color: 'Green' },
        { range: [3000, 6000], color: 'Blue' },
        { range: [6000, 10000], color: 'Indigo' },
        { range: [10000, 12000], color: 'Violet' },
    ];

    for (let i = 0; i < chakraFrequencies.length; i++) {
        if (frequency >= chakraFrequencies[i].range[0] && frequency <= chakraFrequencies[i].range[1]) {
            return chakraFrequencies[i].color;
        }
    }
    return 'DefaultColor';
}

function mapFrequencyToColor(frequency) {
    //ORIGINAL: const normalizedFrequency = (frequency - 20) / (22000 - 20);
    const normalizedFrequency = (frequency - 20) / (10000 - 200);
    const hue = normalizedFrequency * 360;
    return `hsl(${hue}, 100%, 50%)`;
}

function getNextFibonacci() {
    const nextFib = fibNumbers[fibIndex] + fibNumbers[fibIndex + 1];
    fibNumbers.push(nextFib);
    fibIndex++;
    return nextFib;
}

//Util
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// Create vertices with scaling
generateVertex(1, 1 / phi, phi).forEach(vertex => {
    points.push({
        x: centerX + majorRadius * vertex[0] * Math.cos(u),
        y: centerY + majorRadius * vertex[1] * Math.sin(u)
    });
});

// Draw edges
const edges = [
    [0, 8], [0, 10], [0, 16],
    [1, 9], [1, 11], [1, 17],
    [2, 8], [2, 14], [2, 18],
    [3, 9], [3, 15], [3, 19],
    [4, 12], [4, 14], [4, 20],
    [5, 13], [5, 15], [5, 21],
    [6, 12], [6, 10], [6, 22],
    [7, 13], [7, 11], [7, 23],
    [8, 12], [8, 14],
    [9, 13], [9, 15],
    [10, 16], [10, 22],
    [11, 17], [11, 23],
    [12, 20], [13, 21],
    [14, 18], [15, 19],
    [16, 18], [17, 19],
    [20, 22], [21, 23]
];

edges.forEach(edge => {
    const start = points[edge[0]];
    const end = points[edge[1]];
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
});


// shapes.js
function drawCircle(ctx, centerX, centerY, value, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, value * 6, 0, 2 * Math.PI);
    ctx.stroke();
}

function drawTorus(ctx, centerX, centerY, value, u, v, majorRadius, minorRadius, color) {
    ctx.strokeStyle = color;
    const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
    const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
    ctx.beginPath();
    ctx.arc(centerX + x * 2, centerY + y * 2, 2, 0, 2 * Math.PI); // Adjust the radius as needed
    ctx.stroke();
}

function drawSquare(ctx, centerX, centerY, value, u, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.rect(centerX + value * Math.sin(u), centerY + value * Math.sin(u), value, -value);
    ctx.rect(centerX - value * Math.sin(u), centerY - value * Math.sin(u), -value, value);
    ctx.stroke();

}

function drawGoldenRatioFractal(ctx, x, y, width, height, depth) {
    if (depth === 0) {
        return;
    }

    // Draw a rectangle
    ctx.fillRect(x, y, width, height);

    // Calculate dimensions for the next rectangles
    const nextWidth = width / 1.618;  // Golden ratio: approximately 1.618
    const nextHeight = height / 1.618;

    // Recursive calls for smaller rectangles
    drawGoldenRatioFractal(ctx, x, y, nextWidth, nextHeight, depth - 1);
    drawGoldenRatioFractal(ctx, x + width - nextWidth, y, nextWidth, nextHeight, depth - 1);
    drawGoldenRatioFractal(ctx, x, y + height - nextHeight, nextWidth, nextHeight, depth - 1);
    drawGoldenRatioFractal(ctx, x + width - nextWidth, y + height - nextHeight, nextWidth, nextHeight, depth - 1);
}
// Sacred geometry shapes
function drawInterlappingCircles(ctx, centerX, centerY, value, color) {
    ctx.strokeStyle = color;
    const radius = value * 2; // Adjust the radius as needed
    const numCircles = 21;
    for (let i = 0; i < numCircles; i++) {
        const angle = (i / numCircles) * 2 * Math.PI; const x = centerX + (radius / 2) *
            Math.cos(angle); const y = centerY + radius * Math.sin(angle); ctx.beginPath(); ctx.arc(x, y, value, 0, 2 *
                Math.PI); ctx.stroke();
    }
} 

function drawFlowerOfLife(ctx, centerX, centerY, value, color) {
    ctx.strokeStyle = color;
    const radius = value * 2; // Adjust the radius as needed
    const numCircles = 6;
    for (let i = 0; i < numCircles; i++) {
        const angle = (i / numCircles) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.linewidth = 3;
        ctx.stroke();
    }
}

function drawMetatronsCube(ctx, centerX, centerY, value, color) {
    ctx.strokeStyle = color;
    const radius = value * 2; // Adjust the radius as needed
    const numCircles = 12;
    for (let i = 0; i < numCircles; i++) {
        const angle = (i / numCircles) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        // Draw lines between all points
        for (let j = 0; j < numCircles; j++) {
            if (i !== j) {
                const x2 = centerX + radius * Math.cos((j / numCircles) * 2 * Math.PI);
                const y2 = centerY + radius * Math.sin((j / numCircles) * 2 * Math.PI);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }
}

function drawDodecahedron(centerX, centerY, majorRadius, minorRadius, u, v, color, ctx) {
    ctx.strokeStyle = color;
    const phi = (1 + Math.sqrt(5)) / 2; // golden ratio const points=[]; // Generate dodecahedron vertices const
    generateVertex = (a, b, c) => {
        const vertices = [
            [a, b, c],
            [a, b, -c],
            [a, -b, c],
            [a, -b, -c],
            [-a, b, c],
            [-a, b, -c],
            [-a, -b, c],
            [-a, -b, -c],
            [b, c, a],
            [b, c, -a],
            [b, -c, a],
            [b, -c, -a],
            [-b, c, a],
            [-b, c, -a],
            [-b, -c, a],
            [-b, -c, -a],
            [c, a, b],
            [c, a, -b],
            [c, -a, b],
            [c, -a, -b],
            [-c, a, b],
            [-c, a, -b],
            [-c, -a, b],
            [-c, -a, -b]
        ];
        return vertices;
    };
}

function drawMerkaba(centerX, centerY, majorRadius, minorRadius, u, v, color, ctx) {
    ctx.strokeStyle = color;
    minorRadius = minorRadius - (v * 100);
    majorRadius = majorRadius + (v * 100);
    // draw the tetrahedron base
    const baseVertices = [];
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * 2 * Math.PI; baseVertices.push({
            x: centerX + majorRadius *
                Math.cos(u) + minorRadius * Math.cos(angle), y: centerY + majorRadius * Math.sin(u) + minorRadius *
                    Math.sin(angle)
        });
    } ctx.beginPath(); baseVertices.forEach(vertex => ctx.lineTo(vertex.x, vertex.y));
    ctx.closePath();
    ctx.stroke();

    // draw the upper tetrahedron
    const topVertex = {
        x: centerX + majorRadius * Math.cos(u),
        y: centerY + majorRadius * Math.sin(u) - minorRadius
    };
    baseVertices.forEach(vertex => {
        ctx.beginPath();
        ctx.moveTo(topVertex.x, topVertex.y);
        ctx.lineTo(vertex.x, vertex.y);
        ctx.stroke();
    });

    // draw the lower tetrahedron
    const bottomVertex = {
        x: centerX + majorRadius * Math.cos(u),
        y: centerY + majorRadius * Math.sin(u) + minorRadius
    };
    baseVertices.forEach(vertex => {
        ctx.beginPath();
        ctx.moveTo(bottomVertex.x, bottomVertex.y);
        ctx.lineTo(vertex.x, vertex.y);
        ctx.stroke();
    });
}

function drawSpiral(centerX, centerY, majorRadius, minorRadius, u, v, color, ctx) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 4 * Math.PI; i += 0.1) {
        const radius = v * 6 * i; const x = centerX + radius * Math.cos(i +
            u); const y = centerY + radius * Math.sin(i + u); ctx.lineTo(x, y);
    } ctx.stroke();
} 
