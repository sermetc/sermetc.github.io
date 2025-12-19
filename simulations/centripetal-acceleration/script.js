// Centripetal Acceleration Experiment Simulation

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const springLengthDisplay = document.getElementById('springLengthDisplay');
const cylinderStatus = document.getElementById('cylinderStatus');
const phaseDisplay = document.getElementById('phaseDisplay');
const measureX1Btn = document.getElementById('measureX1Btn');
const attachMassBtn = document.getElementById('attachMassBtn');
const measureX2Btn = document.getElementById('measureX2Btn');
const x3Slider = document.getElementById('x3Slider');
const x3SliderValue = document.getElementById('x3SliderValue');
const hSlider = document.getElementById('hSlider');
const hSliderValue = document.getElementById('hSliderValue');
const releaseBtn = document.getElementById('releaseBtn');
const resetTrialBtn = document.getElementById('resetTrialBtn');
const recordBtn = document.getElementById('recordBtn');
const clearTableBtn = document.getElementById('clearTableBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const dataTableBody = document.getElementById('dataTableBody');
const analysisSection = document.getElementById('analysisSection');

const kSlider = document.getElementById('kSlider');

// Display elements
const x1Value = document.getElementById('x1Value');
const x2Value = document.getElementById('x2Value');
const x0Value = document.getElementById('x0Value');
const xValue = document.getElementById('xValue');
const hValue = document.getElementById('hValue');

// Physical constants
const g = 980; // cm/s²
const actualRopeLength = 75; // cm (the real rope length)
const springConstant = 8; // Softer spring constant
const cylinderMass = 3.5; // g (cylinder mass M - should be lighter than m)
const smallMass = 4.25; // g (small mass m)

// Spring properties
const naturalSpringLength = 30; // cm (x1 - natural length)
const springCoils = 12;
const groundY = 550; // Y position of ground in pixels

// Simulation state
let phase = 1;
let x1 = null; // Natural spring length
let x2 = null; // Spring length with mass m attached (only m, no cylinder)
let x0 = null; // Extension due to mass m (x2 - x1)
let x3 = null; // Extended spring length for experiment
let currentSpringLength = naturalSpringLength;
let massMOnlyAttached = false; // Only mass m attached (for measuring x2)
let fullSystemSetup = false; // Full system with cylinder and mass
let systemSetup = false;
let isAnimating = false;
let animationId = null;

// Pendulum state
let pendulumAngle = 0; // Current angle (radians)
let pendulumAngularVelocity = 0;
let releaseAngle = 0; // Initial release angle
let releaseHeight = 20; // h value in cm

// Cylinder oscillation tracking
let cylinderDisplacement = 0;
let maxCylinderDisplacement = 0;
let cylinderVelocity = 0;
let lastCylinderAccel = 0;

// Data storage
let recordedData = [];

// Scale for drawing
const scale = 3; // pixels per cm
const anchorY = 50; // Y position of anchor point in pixels

// Spring constant is now user-adjustable.
let effectiveSpringConstant = 2450; // dynes/cm. Default value.

// This is x0 = mg/k. It's calculated based on k.
let extensionDueToMass;

// Initialize
function init() {
    // Set initial values from the slider
    effectiveSpringConstant = parseFloat(kSlider.value);
    extensionDueToMass = (smallMass * g) / effectiveSpringConstant;

    currentSpringLength = naturalSpringLength;
    updateDisplay();
    draw();
}

// Event Listeners

kSlider.addEventListener('input', () => {
    effectiveSpringConstant = parseFloat(kSlider.value);

    // Recalculate x0 based on new k
    extensionDueToMass = (smallMass * g) / effectiveSpringConstant;

    // If we are in phase 2 (mass is attached), update the spring's length in the view
    if (massMOnlyAttached && !fullSystemSetup) {
        currentSpringLength = naturalSpringLength + extensionDueToMass;
        updateDisplay();
        draw();
    }
});

// Update spring length display
function updateDisplay() {
    springLengthDisplay.textContent = currentSpringLength.toFixed(1);
}

// Update phase display
function updatePhase(newPhase, text) {
    phase = newPhase;
    phaseDisplay.textContent = text;
}

// Draw spring
function drawSpring(startX, startY, endY, coils) {
    const springHeight = endY - startY;
    const coilHeight = springHeight / coils;
    const amplitude = 15;

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    for (let i = 0; i < coils; i++) {
        const y1 = startY + i * coilHeight;
        const y2 = startY + (i + 0.5) * coilHeight;
        const y3 = startY + (i + 1) * coilHeight;

        ctx.lineTo(startX + amplitude, y2);
        ctx.lineTo(startX - amplitude, y2 + coilHeight * 0.25);
    }

    ctx.lineTo(startX, endY);
    ctx.stroke();
}

// Draw cylinder
function drawCylinder(centerX, topY, width, height) {
    // Cylinder body
    const gradient = ctx.createLinearGradient(centerX - width/2, topY, centerX + width/2, topY);
    gradient.addColorStop(0, '#666');
    gradient.addColorStop(0.5, '#999');
    gradient.addColorStop(1, '#666');

    ctx.fillStyle = gradient;
    ctx.fillRect(centerX - width/2, topY, width, height);

    // Cylinder border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - width/2, topY, width, height);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('M', centerX, topY + height/2 + 4);
}

// Draw mass
function drawMass(centerX, centerY, radius) {
    // Mass body
    const gradient = ctx.createRadialGradient(centerX - 3, centerY - 3, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#ff8866');
    gradient.addColorStop(1, '#cc4433');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#992222';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('m', centerX, centerY + 4);
}

// Draw rope/string
function drawRope(startX, startY, endX, endY) {
    ctx.strokeStyle = '#a67c52';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

// Draw anchor point
function drawAnchor(x, y) {
    ctx.fillStyle = '#555';
    ctx.fillRect(x - 40, y - 15, 80, 15);

    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Draw reference lines and measurements
function drawMeasurements() {
    const centerX = canvas.width / 2;

    // Draw ruler on the side
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';

    const rulerX = 60;
    for (let cm = 0; cm <= 150; cm += 10) {
        const y = anchorY + cm * scale;
        if (y < canvas.height - 20) {
            ctx.beginPath();
            ctx.moveTo(rulerX - 10, y);
            ctx.lineTo(rulerX, y);
            ctx.stroke();
            ctx.fillText(cm + '', rulerX - 15, y + 4);
        }
    }

    // Draw spring length indicator
    if (currentSpringLength > 0) {
        const springEndY = anchorY + currentSpringLength * scale;

        ctx.strokeStyle = '#00d4ff';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rulerX + 10, anchorY);
        ctx.lineTo(rulerX + 10, springEndY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow heads
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(rulerX + 10, anchorY);
        ctx.lineTo(rulerX + 6, anchorY + 8);
        ctx.lineTo(rulerX + 14, anchorY + 8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(rulerX + 10, springEndY);
        ctx.lineTo(rulerX + 6, springEndY - 8);
        ctx.lineTo(rulerX + 14, springEndY - 8);
        ctx.closePath();
        ctx.fill();
    }
}

// Draw ground
function drawGround() {
    const centerX = canvas.width / 2;

    // Ground line
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    // Ground pattern
    ctx.strokeStyle = '#5d4a3a';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        ctx.lineTo(i + 10, canvas.height);
        ctx.stroke();
    }

    // Ground surface line
    ctx.strokeStyle = '#2d2118';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    // Ground label
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Ground', 10, groundY + 20);
}

// Main draw function
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;

    // Draw ground first
    drawGround();

    // Draw measurements
    drawMeasurements();

    // Draw anchor
    drawAnchor(centerX, anchorY);

    // VISUAL EXAGGERATION: Apply a scaling factor to the cylinder's displacement
    // to make small movements more visible to the user.
    let visualCylinderDisplacement = cylinderDisplacement;
    if (isAnimating) {
        if (maxCylinderDisplacement < 0.5) {
            visualCylinderDisplacement *= 3; // Exaggerate the most for the target condition
        } else if (maxCylinderDisplacement < 2) {
            visualCylinderDisplacement *= 1.5; // Exaggerate slightly for the 'slight' movement
        }
    }
    
    // Calculate positions based on current phase
    const springEndY = anchorY + currentSpringLength * scale + visualCylinderDisplacement * scale;
    const cylinderHeight = 40;
    const cylinderWidth = 60;
    const massRadius = 15;

    // Draw spring
    drawSpring(centerX, anchorY, springEndY, springCoils);

    // Phase 1: Just spring, no masses
    // Phase 2: Spring + mass m only (no cylinder)
    // Phase 3+: Full system with cylinder M and mass m

    if (massMOnlyAttached && !fullSystemSetup) {
        // Phase 2: Only mass m attached directly to spring (no cylinder)
        const massY = springEndY + massRadius;
        drawMass(centerX, massY, massRadius);

    } else if (fullSystemSetup) {
        // Phase 3+: Full system with cylinder and pendulum mass
        const cylinderBottomY = springEndY + cylinderHeight;

        // Draw cylinder
        drawCylinder(centerX, springEndY, cylinderWidth, cylinderHeight);

        // Draw rope and pendulum mass
        const ropeLength = actualRopeLength * scale;
        const ropeStartX = centerX;
        const ropeStartY = cylinderBottomY;

        const massX = ropeStartX + Math.sin(pendulumAngle) * ropeLength;
        const massY = ropeStartY + Math.cos(pendulumAngle) * ropeLength;

        // Draw rope
        drawRope(ropeStartX, ropeStartY, massX, massY);

        // Draw mass
        drawMass(massX, massY, massRadius);

        // Draw rest position indicator if system is setup
        if (systemSetup && !isAnimating) {
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(ropeStartX, ropeStartY);
            ctx.lineTo(ropeStartX, ropeStartY + ropeLength);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw release height indicator during setup
        if (systemSetup && releaseAngle !== 0) {
            const releaseX = ropeStartX + Math.sin(releaseAngle) * ropeLength;
            const releaseY = ropeStartY + Math.cos(releaseAngle) * ropeLength;

            // Height difference line
            ctx.strokeStyle = '#e9c46a';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(releaseX + 20, releaseY);
            ctx.lineTo(releaseX + 20, ropeStartY + ropeLength);
            ctx.stroke();
            ctx.setLineDash([]);

            // h label
            ctx.fillStyle = '#e9c46a';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('h = ' + releaseHeight.toFixed(0) + ' cm', releaseX + 25, (releaseY + ropeStartY + ropeLength) / 2);
        }
    }

    // Draw displacement indicators for the cylinder
    if (fullSystemSetup) {
        const cylinderBottomY_rest = anchorY + currentSpringLength * scale + cylinderHeight;
        const indicatorStartX = centerX + cylinderWidth / 2 + 10;
        const indicatorEndX = centerX + cylinderWidth / 2 + 50;

        // 1. "At Rest" indicator
        ctx.beginPath();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = '#aaa'; // Light gray color
        ctx.lineWidth = 1;
        ctx.moveTo(indicatorStartX, cylinderBottomY_rest);
        ctx.lineTo(indicatorEndX, cylinderBottomY_rest);
        ctx.stroke();

        ctx.fillStyle = '#aaa';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Rest', indicatorEndX + 5, cylinderBottomY_rest + 3);

        // 2. "Max Displacement" indicator
        if (maxCylinderDisplacement > 0.1) { // Only draw if there's noticeable displacement
            const cylinderBottomY_max = cylinderBottomY_rest + maxCylinderDisplacement * scale;

            ctx.beginPath();
            ctx.strokeStyle = '#e9c46a'; // Yellow color
            ctx.moveTo(indicatorStartX, cylinderBottomY_max);
            ctx.lineTo(indicatorEndX, cylinderBottomY_max);
            ctx.stroke();

            ctx.fillStyle = '#e9c46a';
            ctx.fillText('Max', indicatorEndX + 5, cylinderBottomY_max + 3);
        }
        ctx.setLineDash([]); // Reset line dash
    }

    // Update cylinder status display
    if (fullSystemSetup) {
        if (isAnimating) {
            if (maxCylinderDisplacement === 0) {
                cylinderStatus.textContent = 'No Oscillation Detected';
                cylinderStatus.style.color = '#666'; // Darker grey
            } else if (maxCylinderDisplacement > 0 && maxCylinderDisplacement <= 0.2) {
                cylinderStatus.textContent = 'Minimal Oscillation';
                cylinderStatus.style.color = '#e9c46a'; // Yellow for too minimal
            } else if (maxCylinderDisplacement > 0.2 && maxCylinderDisplacement < 0.5) {
                cylinderStatus.textContent = 'Equilibrium Found ✓';
                cylinderStatus.style.color = '#00ff88';
            } else if (maxCylinderDisplacement >= 0.5 && maxCylinderDisplacement < 2) {
                cylinderStatus.textContent = 'Slight Movement';
                cylinderStatus.style.color = '#e9c46a'; // Yellow
            } else { // maxCylinderDisplacement >= 2
                cylinderStatus.textContent = 'Moving Significantly';
                cylinderStatus.style.color = '#ff6b6b';
            }
        } else { // Not animating
            cylinderStatus.textContent = 'At Rest';
            cylinderStatus.style.color = '#00ff88';
        }
    } else {
        cylinderStatus.textContent = '--';
        cylinderStatus.style.color = '#888';
    }
}

// Physics update for pendulum
function updatePhysics(dt) {
    if (!isAnimating) return;

    // This is a coupled system. The pendulum's pivot is accelerating.
    // An inertial force (-m*y_ddot) exists in the pendulum's non-inertial frame.
    // The effective gravity becomes (g + y_ddot), where y_ddot is cylinder's vertical acceleration.
    // We use the acceleration from the previous time step as an approximation.
    const effective_g = g + lastCylinderAccel;
    const angularAcceleration = -(effective_g / actualRopeLength) * Math.sin(pendulumAngle);

    pendulumAngularVelocity += angularAcceleration * dt;
    pendulumAngle += pendulumAngularVelocity * dt;

    // Add small damping
    pendulumAngularVelocity *= 0.9995;

    // Calculate centripetal acceleration at current position
    const velocity = pendulumAngularVelocity * actualRopeLength;
    const centripetalAccel = (velocity * velocity) / actualRopeLength;

    // Calculate tension in rope: T = mg*cos(theta) + m*v²/l
    const tension = smallMass * g * Math.cos(pendulumAngle) + smallMass * centripetalAccel;

    // Force on cylinder from rope
    const ropeForceOnCylinder = tension;

    // Let's use a clear convention: positive direction is DOWNWARDS for cylinder motion.

    // Downward forces on cylinder: its own weight + tension from rope
    const downwardForce = cylinderMass * g + ropeForceOnCylinder;

    // Upward spring force depends on the TOTAL extension.
    // Rest extension is from the initial setup (x3)
    const restSpringExtension = (x3 || currentSpringLength) - naturalSpringLength;
    // Dynamic displacement is cylinderDisplacement (positive downwards)
    const totalSpringExtension = restSpringExtension + cylinderDisplacement;
    const upwardSpringForce = effectiveSpringConstant * totalSpringExtension;

    // Net force on cylinder, positive DOWNWARDS
    const netForce = downwardForce - upwardSpringForce;

    // Cylinder acceleration (positive DOWNWARDS)
    const cylinderAccel = netForce / cylinderMass;

    // Update cylinder velocity (positive DOWNWARDS)
    cylinderVelocity += cylinderAccel * dt;
    cylinderVelocity *= 0.95; // Damping

    // Update cylinder displacement (positive DOWNWARDS)
    cylinderDisplacement += cylinderVelocity * dt;

    // Track maximum displacement
    if (Math.abs(cylinderDisplacement) > maxCylinderDisplacement) {
        maxCylinderDisplacement = Math.abs(cylinderDisplacement);
    }

    // Limit cylinder displacement - it cannot go above its starting point (y=0)
    cylinderDisplacement = Math.max(0, Math.min(5, cylinderDisplacement));

    // Store acceleration for the next frame's pendulum calculation
    lastCylinderAccel = cylinderAccel;
}

// Animation loop
function animate(timestamp) {
    if (!isAnimating) return;

    const dt = 0.002; // Fixed time step
    for (let i = 0; i < 8; i++) {
        updatePhysics(dt);
    }

    draw();

    // Check if pendulum has nearly stopped
    if (Math.abs(pendulumAngularVelocity) < 0.01 && Math.abs(pendulumAngle) < 0.01) {
        // Pendulum has settled
    }

    animationId = requestAnimationFrame(animate);
}

// Start animation
function startAnimation() {
    if (isAnimating) return;

    isAnimating = true;
    maxCylinderDisplacement = 0;
    cylinderDisplacement = 0;
    cylinderVelocity = 0;

    // Set initial pendulum state
    pendulumAngle = releaseAngle;
    pendulumAngularVelocity = 0;

    animationId = requestAnimationFrame(animate);
}

// Stop animation
function stopAnimation() {
    isAnimating = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Calculate release angle from height
function calculateReleaseAngle(h) {
    // h = l - l*cos(theta) = l(1 - cos(theta))
    // cos(theta) = 1 - h/l
    // theta = acos(1 - h/l)
    const cosTheta = 1 - h / actualRopeLength;
    if (cosTheta < -1) return Math.PI;
    if (cosTheta > 1) return 0;
    return Math.acos(cosTheta);
}

// Event Listeners

// Step 1: Measure x1 (empty spring, no masses)
measureX1Btn.addEventListener('click', () => {
    x1 = naturalSpringLength;
    x1Value.textContent = x1.toFixed(1);
    measureX1Btn.disabled = true;
    attachMassBtn.disabled = false;
    updatePhase(2, '2 - Attach Mass m Only');
});

// Step 2: Attach mass m only (no cylinder)
attachMassBtn.addEventListener('click', () => {
    massMOnlyAttached = true;
    fullSystemSetup = false;
    // Spring extends due to mass m only
    currentSpringLength = naturalSpringLength + extensionDueToMass;
    updateDisplay();
    draw();
    attachMassBtn.disabled = true;
    measureX2Btn.disabled = false;
});

// Measure x2 (with only mass m attached)
measureX2Btn.addEventListener('click', () => {
    // Previous logic
    x2 = currentSpringLength;
    x0 = x2 - x1;
    x2Value.textContent = x2.toFixed(1);
    x0Value.textContent = x0.toFixed(1);
    measureX2Btn.disabled = true;
    kSlider.disabled = true; // Lock in the spring constant

    // --- Start of logic moved from setupSystemBtn ---
    
    // Enable sliders
    x3Slider.disabled = false;
    hSlider.disabled = false;

    // Set system state
    massMOnlyAttached = false;
    fullSystemSetup = true;
    systemSetup = true;

    // Apply initial slider values to the setup
    const xExtension = parseFloat(x3Slider.value);
    x3 = x1 + xExtension;
    currentSpringLength = x3;
    xValue.textContent = xExtension.toFixed(1);

    releaseHeight = parseFloat(hSlider.value);
    hValue.textContent = releaseHeight.toFixed(1);
    releaseAngle = calculateReleaseAngle(releaseHeight);
    pendulumAngle = releaseAngle;

    updateDisplay();
    draw();

    // Enable release controls
    releaseBtn.disabled = false;
    resetTrialBtn.disabled = false;
    
    // Update phase display
    updatePhase(3, '3 - Run Experiment');
});

// x3 slider change
x3Slider.addEventListener('input', () => {
    const xExtension = parseFloat(x3Slider.value);
    x3SliderValue.textContent = xExtension;
    xValue.textContent = xExtension.toFixed(1);

    if (systemSetup) {
        x3 = x1 + xExtension;
        currentSpringLength = x3;
        updateDisplay();
        draw();
    }
});

// h slider change
hSlider.addEventListener('input', () => {
    releaseHeight = parseFloat(hSlider.value);
    hSliderValue.textContent = releaseHeight;
    hValue.textContent = releaseHeight.toFixed(1);
    releaseAngle = calculateReleaseAngle(releaseHeight);

    if (systemSetup) {
        pendulumAngle = releaseAngle;
        draw();
    }
});

// Release mass
releaseBtn.addEventListener('click', () => {
    if (isAnimating) {
        stopAnimation();
        releaseBtn.textContent = 'Release Mass';
    } else {
        startAnimation();
        releaseBtn.textContent = 'Stop';
        recordBtn.disabled = false;
    }
});

// Reset trial
resetTrialBtn.addEventListener('click', () => {
    stopAnimation();
    pendulumAngle = releaseAngle;
    pendulumAngularVelocity = 0;
    cylinderDisplacement = 0;
    cylinderVelocity = 0;
    maxCylinderDisplacement = 0;
    releaseBtn.textContent = 'Release Mass';
    draw();
});

// Record data point
recordBtn.addEventListener('click', () => {
    const x = parseFloat(x3Slider.value);
    const h = releaseHeight;

    recordedData.push({ x, h });
    recordedData.sort((a, b) => a.h - b.h);
    updateDataTable();

    if (recordedData.length >= 2) {
        analyzeBtn.disabled = false;
    }
});

// Update data table
function updateDataTable() {
    dataTableBody.innerHTML = '';
    recordedData.forEach((data, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.x.toFixed(1)}</td>
            <td>${data.h.toFixed(1)}</td>
            <td><button class="btn-remove" onclick="removeData(${index})">Remove</button></td>
        `;
        dataTableBody.appendChild(row);
    });
}

// Remove data point
function removeData(index) {
    recordedData.splice(index, 1);
    updateDataTable();
    if (recordedData.length < 2) {
        analyzeBtn.disabled = true;
    }
}

// Clear table
clearTableBtn.addEventListener('click', () => {
    recordedData = [];
    updateDataTable();
    analyzeBtn.disabled = true;
    analysisSection.style.display = 'none';
});

// Analyze data
analyzeBtn.addEventListener('click', () => {
    if (recordedData.length < 2) return;

    // Perform linear regression: x = a*h + b
    const hData = recordedData.map(d => d.h);
    const xData = recordedData.map(d => d.x);

    const fit = linearRegression(hData, xData);

    // Calculate experimental rope length
    // dx/dh = 2*x0/l => l = 2*x0/slope
    const experimentalLength = (2 * x0) / fit.slope;
    const percentError = Math.abs((experimentalLength - actualRopeLength) / actualRopeLength * 100);

    // Update display
    document.getElementById('slopeValue').textContent = fit.slope.toFixed(4);
    document.getElementById('interceptValue').textContent = fit.intercept.toFixed(2);
    document.getElementById('r2Value').textContent = fit.r2.toFixed(4);
    document.getElementById('x0Result').textContent = x0.toFixed(2);
    document.getElementById('expLength').textContent = experimentalLength.toFixed(2);
    document.getElementById('percentError').textContent = percentError.toFixed(2);

    // Draw plot
    drawPlot(hData, xData, fit);

    analysisSection.style.display = 'block';
});

// Linear regression
function linearRegression(xData, yData) {
    const n = xData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += xData[i];
        sumY += yData[i];
        sumXY += xData[i] * yData[i];
        sumX2 += xData[i] * xData[i];
        sumY2 += yData[i] * yData[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R² calculation
    const yMean = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    for (let i = 0; i < n; i++) {
        ssTotal += (yData[i] - yMean) ** 2;
        ssResidual += (yData[i] - (slope * xData[i] + intercept)) ** 2;
    }
    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
}

// Draw scatter plot
function drawPlot(hData, xData, fit) {
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    const width = plotCanvas.width;
    const height = plotCanvas.height;
    const padding = 50;

    plotCtx.clearRect(0, 0, width, height);

    // Find data ranges
    const hMin = 0;
    const hMax = Math.max(...hData) * 1.2;
    const xMin = 0;
    const xMax = Math.max(...xData) * 1.2;

    // Coordinate transforms
    const toCanvasX = (h) => padding + (h - hMin) / (hMax - hMin) * (width - 2 * padding);
    const toCanvasY = (x) => height - padding - (x - xMin) / (xMax - xMin) * (height - 2 * padding);

    // Draw grid
    plotCtx.strokeStyle = '#2a2a4a';
    plotCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const x = padding + i * (width - 2 * padding) / 5;
        const y = padding + i * (height - 2 * padding) / 5;
        plotCtx.beginPath();
        plotCtx.moveTo(x, padding);
        plotCtx.lineTo(x, height - padding);
        plotCtx.stroke();
        plotCtx.beginPath();
        plotCtx.moveTo(padding, y);
        plotCtx.lineTo(width - padding, y);
        plotCtx.stroke();
    }

    // Draw axes
    plotCtx.strokeStyle = '#666';
    plotCtx.lineWidth = 2;
    plotCtx.beginPath();
    plotCtx.moveTo(padding, padding);
    plotCtx.lineTo(padding, height - padding);
    plotCtx.lineTo(width - padding, height - padding);
    plotCtx.stroke();

    // Axis labels
    plotCtx.fillStyle = '#b8b8d1';
    plotCtx.font = '12px Arial';
    plotCtx.textAlign = 'center';
    plotCtx.fillText('h (cm)', width / 2, height - 10);

    plotCtx.save();
    plotCtx.translate(15, height / 2);
    plotCtx.rotate(-Math.PI / 2);
    plotCtx.fillText('x (cm)', 0, 0);
    plotCtx.restore();

    // Tick labels
    plotCtx.font = '10px Arial';
    for (let i = 0; i <= 5; i++) {
        const hVal = hMin + i * (hMax - hMin) / 5;
        const xVal = xMin + i * (xMax - xMin) / 5;
        plotCtx.fillText(hVal.toFixed(0), toCanvasX(hVal), height - padding + 15);
        plotCtx.textAlign = 'right';
        plotCtx.fillText(xVal.toFixed(0), padding - 5, toCanvasY(xVal) + 4);
        plotCtx.textAlign = 'center';
    }

    // Draw fit line
    plotCtx.strokeStyle = '#ff6b6b';
    plotCtx.lineWidth = 2;
    plotCtx.beginPath();
    plotCtx.moveTo(toCanvasX(hMin), toCanvasY(fit.slope * hMin + fit.intercept));
    plotCtx.lineTo(toCanvasX(hMax), toCanvasY(fit.slope * hMax + fit.intercept));
    plotCtx.stroke();

    // Draw data points
    plotCtx.fillStyle = '#00d4ff';
    for (let i = 0; i < hData.length; i++) {
        plotCtx.beginPath();
        plotCtx.arc(toCanvasX(hData[i]), toCanvasY(xData[i]), 6, 0, Math.PI * 2);
        plotCtx.fill();
        plotCtx.strokeStyle = '#fff';
        plotCtx.lineWidth = 1;
        plotCtx.stroke();
    }
}

// Make removeData global
window.removeData = removeData;

const fullResetBtn = document.getElementById('fullResetBtn');

function fullReset() {
    // 1. Stop any running animation
    stopAnimation();

    // 2. Reset phase
    phase = 1;
    updatePhase(1, '1 - Measure Empty Spring');

    // 3. Reset all measurements and state variables
    x1 = null;
    x2 = null;
    x0 = null;
    x3 = null;
    massMOnlyAttached = false;
    fullSystemSetup = false;
    systemSetup = false;
    
    // Reset pendulum and cylinder
    pendulumAngle = 0;
    pendulumAngularVelocity = 0;
    releaseAngle = 0;
    cylinderDisplacement = 0;
    cylinderVelocity = 0;
    maxCylinderDisplacement = 0;
    lastCylinderAccel = 0;

    // 4. Reset spring constant to default
    const defaultK = 2450;
    kSlider.value = defaultK;
    effectiveSpringConstant = defaultK;
    
    // 5. Reset UI Display elements
    x1Value.textContent = '--';
    x2Value.textContent = '--';
    x0Value.textContent = '--';
    xValue.textContent = '--';
    hValue.textContent = '--';
    springLengthDisplay.textContent = '--';
    cylinderStatus.textContent = 'At Rest';
    cylinderStatus.style.color = '#00ff88';

    // 6. Reset buttons
    measureX1Btn.disabled = false;
    attachMassBtn.disabled = true;
    measureX2Btn.disabled = true;
    kSlider.disabled = false;
    x3Slider.disabled = true;
    hSlider.disabled = true;
    setupSystemBtn.disabled = true;
    setupSystemBtn.textContent = 'Setup System';
    releaseBtn.disabled = true;
    releaseBtn.textContent = 'Release Mass';
    resetTrialBtn.disabled = true;
    recordBtn.disabled = true;
    
    // 7. Reset sliders to default values
    x3Slider.value = 20;
    x3SliderValue.textContent = '20';
    hSlider.value = 20;
    hSliderValue.textContent = '20';
    releaseHeight = 20;

    // 8. Clear data table and analysis
    recordedData = [];
    updateDataTable();
    analyzeBtn.disabled = true;
    analysisSection.style.display = 'none';

    // 9. Redraw initial state
    init();
}

fullResetBtn.addEventListener('click', fullReset);


// Initialize
init();
