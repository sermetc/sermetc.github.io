// Physical Pendulum Simulation
// Physics: T = 2π√(I/(mgh)) where I = I_cm + mh² for parallel axis theorem

const canvas = document.getElementById('pendulumCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const pivotDistanceSelect = document.getElementById('pivotDistance');
const initialAngleSlider = document.getElementById('initialAngle');
const angleValueSpan = document.getElementById('angleValue');
const periodCountInput = document.getElementById('periodCount');
const releaseBtn = document.getElementById('releaseBtn');
const resetBtn = document.getElementById('resetBtn');
const timerValue = document.getElementById('timerValue');
const resultsDisplay = document.getElementById('resultsDisplay');
const resultH = document.getElementById('resultH');
const resultPeriods = document.getElementById('resultPeriods');
const resultTotalTime = document.getElementById('resultTotalTime');
const resultAvgPeriod = document.getElementById('resultAvgPeriod');
const storeBtn = document.getElementById('storeBtn');
const dataTableBody = document.getElementById('dataTableBody');
const clearTableBtn = document.getElementById('clearTableBtn');
const exportBtn = document.getElementById('exportBtn');

// Physical constants
const g = 980; // cm/s² (using cm for consistency)
const rulerLength = 100; // cm (total ruler length)
const rulerHalfLength = 50; // cm (from center to end)

// Simulation state
let isRunning = false;
let animationId = null;
let simulationTime = 0;
let lastFrameTime = 0;
let angle = 0;
let angularVelocity = 0;
let pivotDistance = 15; // cm from center of mass
let initialAngle = 10; // degrees
let targetPeriods = 10;
let completedPeriods = 0;
let hasStartedSwinging = false;

// Stored data
let storedData = [];

// Scale for drawing (pixels per cm)
const scale = 4;

// Initialize
function init() {
    pivotDistance = parseInt(pivotDistanceSelect.value);
    initialAngle = parseInt(initialAngleSlider.value);
    targetPeriods = parseInt(periodCountInput.value);
    angle = initialAngle * Math.PI / 180;
    angularVelocity = 0;
    completedPeriods = 0;
    hasStartedSwinging = false;
    simulationTime = 0;
    lastFrameTime = 0;
    resultsDisplay.style.display = 'none';
    timerValue.textContent = '0.000 s';
    draw();
}

// Calculate moment of inertia about pivot point
function getMomentOfInertia(h) {
    // I = I_cm + mh² = (1/12)mL² + mh²
    // We can factor out m, so I/m = L²/12 + h²
    const L = rulerLength;
    return (L * L / 12) + (h * h);
}

// Calculate angular acceleration
function getAngularAcceleration(theta, h) {
    // θ'' = -(mgh/I) * sin(θ)
    // Since I/m = L²/12 + h², we get θ'' = -gh/(L²/12 + h²) * sin(θ)
    const I_over_m = getMomentOfInertia(h);
    return -(g * h / I_over_m) * Math.sin(theta);
}

// Calculate theoretical period
function getTheoreticalPeriod(h) {
    // T = 2π√(I/(mgh)) = 2π√((L²/12 + h²)/(gh))
    const I_over_m = getMomentOfInertia(h);
    return 2 * Math.PI * Math.sqrt(I_over_m / (g * h));
}

// Update physics using RK4 integration
function updatePhysics(dt) {
    const h = pivotDistance;

    // RK4 integration for better accuracy
    const k1v = getAngularAcceleration(angle, h);
    const k1x = angularVelocity;

    const k2v = getAngularAcceleration(angle + 0.5 * dt * k1x, h);
    const k2x = angularVelocity + 0.5 * dt * k1v;

    const k3v = getAngularAcceleration(angle + 0.5 * dt * k2x, h);
    const k3x = angularVelocity + 0.5 * dt * k2v;

    const k4v = getAngularAcceleration(angle + dt * k3x, h);
    const k4x = angularVelocity + dt * k3v;

    const velocityBeforeUpdate = angularVelocity;

    angle += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    angularVelocity += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);

    // Count periods: a period completes when the ruler returns to its starting position
    // This occurs when the ruler reaches its maximum positive angle (turning point)
    // Detected when angular velocity crosses from positive to negative while angle is positive

    // First, mark that swinging has started (velocity has become non-zero)
    if (!hasStartedSwinging && Math.abs(angularVelocity) > 0.001) {
        hasStartedSwinging = true;
    }

    // Detect turning point: velocity was positive, now negative (or zero), and angle is positive
    // This means the ruler has returned to its starting position
    if (hasStartedSwinging && velocityBeforeUpdate > 0 && angularVelocity <= 0 && angle > 0) {
        completedPeriods++;
    }
}

// Draw the pendulum
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pivot point position on canvas
    const pivotX = canvas.width / 2;
    const pivotY = 80;

    // Draw support structure
    ctx.fillStyle = '#444';
    ctx.fillRect(pivotX - 60, 10, 120, 20);
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw pivot hook
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivotX, 30);
    ctx.lineTo(pivotX, pivotY);
    ctx.stroke();

    // Calculate ruler position
    // The ruler rotates around the pivot point
    // The pivot is at distance h from the center of mass
    const h = pivotDistance;

    // Ruler dimensions in pixels
    const rulerLengthPx = rulerLength * scale;
    const rulerWidth = 30;

    // Save context for rotation
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);

    // Draw ruler (pivot is at distance h from center)
    // Center of mass should be BELOW the pivot, so positive Y in local coords
    const centerOffset = h * scale;

    // Ruler background
    ctx.fillStyle = '#c9a868';
    ctx.fillRect(-rulerWidth / 2, centerOffset - rulerLengthPx / 2, rulerWidth, rulerLengthPx);

    // Ruler border
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(-rulerWidth / 2, centerOffset - rulerLengthPx / 2, rulerWidth, rulerLengthPx);

    // Draw markings on ruler
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';

    // Center mark (0)
    const centerY = centerOffset;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-rulerWidth / 2 + 2, centerY - 1, rulerWidth - 4, 2);
    ctx.fillStyle = '#333';
    ctx.fillText('0', 0, centerY + 12);

    // Marks at 5cm intervals
    for (let i = 5; i <= 45; i += 5) {
        const yUp = centerY - i * scale;
        const yDown = centerY + i * scale;

        // Upper marks (negative direction from center)
        if (yUp >= centerOffset - rulerLengthPx / 2 + 5) {
            ctx.fillStyle = '#333';
            ctx.fillRect(-rulerWidth / 2 + 5, yUp - 0.5, rulerWidth - 10, 1);
            ctx.fillText(i.toString(), 0, yUp - 3);
        }

        // Lower marks (positive direction from center)
        if (yDown <= centerOffset + rulerLengthPx / 2 - 5) {
            ctx.fillStyle = '#333';
            ctx.fillRect(-rulerWidth / 2 + 5, yDown - 0.5, rulerWidth - 10, 1);
            ctx.fillText(i.toString(), 0, yDown + 10);
        }
    }

    // Draw pivot hole indicator
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw period counter
    ctx.fillStyle = '#00d4ff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Periods: ${completedPeriods} / ${targetPeriods}`, 20, canvas.height - 20);

    // Draw theoretical period
    const theoreticalT = getTheoreticalPeriod(pivotDistance);
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.fillText(`Theoretical T: ${theoreticalT.toFixed(3)} s`, 20, canvas.height - 45);
}

// Animation loop
function animate(timestamp) {
    if (!isRunning) return;

    // Initialize lastFrameTime on first frame
    if (lastFrameTime === 0) {
        lastFrameTime = timestamp;
    }

    // Calculate actual elapsed time since last frame
    const frameElapsed = (timestamp - lastFrameTime) / 1000; // in seconds
    lastFrameTime = timestamp;

    // Update physics with proper time sync
    // Use fixed timestep for physics stability, but match real elapsed time
    const dt = 0.0005; // 0.5ms time step for accuracy
    const steps = Math.round(frameElapsed / dt);
    const maxSteps = 100; // Prevent spiral of death if frame takes too long
    const actualSteps = Math.min(steps, maxSteps);

    for (let i = 0; i < actualSteps; i++) {
        updatePhysics(dt);
        simulationTime += dt;
    }

    // Update timer display
    timerValue.textContent = simulationTime.toFixed(3) + ' s';

    // Draw
    draw();

    // Check if target periods reached
    if (completedPeriods >= targetPeriods) {
        stopSimulation();
        showResults();
        return;
    }

    animationId = requestAnimationFrame(animate);
}

// Start simulation
function startSimulation() {
    if (isRunning) return;

    isRunning = true;
    lastFrameTime = 0;
    releaseBtn.disabled = true;
    pivotDistanceSelect.disabled = true;
    initialAngleSlider.disabled = true;
    periodCountInput.disabled = true;

    animationId = requestAnimationFrame(animate);
}

// Stop simulation
function stopSimulation() {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    releaseBtn.disabled = false;
    pivotDistanceSelect.disabled = false;
    initialAngleSlider.disabled = false;
    periodCountInput.disabled = false;
}

// Show results
function showResults() {
    const avgPeriod = simulationTime / targetPeriods;

    resultH.textContent = pivotDistance;
    resultPeriods.textContent = targetPeriods;
    resultTotalTime.textContent = simulationTime.toFixed(3);
    resultAvgPeriod.textContent = avgPeriod.toFixed(4);

    resultsDisplay.style.display = 'block';
}

// Store result in table
function storeResult() {
    const avgPeriod = simulationTime / targetPeriods;

    storedData.push({
        h: pivotDistance,
        T: avgPeriod
    });

    // Sort by h (cm) ascending
    storedData.sort((a, b) => a.h - b.h);

    updateTable();
}

// Remove a single data entry
function removeData(index) {
    storedData.splice(index, 1);
    updateTable();
}

// Update data table
function updateTable() {
    dataTableBody.innerHTML = '';

    storedData.forEach((data, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.h}</td>
            <td>${data.T.toFixed(4)}</td>
            <td><button class="btn-remove" onclick="removeData(${index})">Remove</button></td>
        `;
        dataTableBody.appendChild(row);
    });
}

// Clear table
function clearTable() {
    storedData = [];
    updateTable();
}

// Export data as CSV
function exportData() {
    if (storedData.length === 0) {
        alert('No data to export!');
        return;
    }

    let csv = 'h (cm),T (s)\n';
    storedData.forEach(data => {
        csv += `${data.h},${data.T.toFixed(4)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'physical_pendulum_data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Event listeners
pivotDistanceSelect.addEventListener('change', () => {
    if (!isRunning) init();
});

initialAngleSlider.addEventListener('input', () => {
    angleValueSpan.textContent = initialAngleSlider.value + '°';
    if (!isRunning) init();
});

periodCountInput.addEventListener('change', () => {
    if (!isRunning) {
        targetPeriods = parseInt(periodCountInput.value);
        draw();
    }
});

releaseBtn.addEventListener('click', () => {
    init();
    startSimulation();
});

resetBtn.addEventListener('click', () => {
    stopSimulation();
    init();
});

storeBtn.addEventListener('click', storeResult);
clearTableBtn.addEventListener('click', clearTable);
exportBtn.addEventListener('click', exportData);

// Analysis elements
const analyzeBtn = document.getElementById('analyzeBtn');
const analysisResults = document.getElementById('analysisResults');
const plotCanvas = document.getElementById('plotCanvas');
const plotCtx = plotCanvas.getContext('2d');

analyzeBtn.addEventListener('click', analyzeData);

// Linear regression function
function linearRegression(xData, yData) {
    const n = xData.length;
    if (n < 2) return null;

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

    // Calculate R²
    const yMean = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    for (let i = 0; i < n; i++) {
        ssTotal += (yData[i] - yMean) ** 2;
        const yPredicted = slope * xData[i] + intercept;
        ssResidual += (yData[i] - yPredicted) ** 2;
    }
    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
}

// Analyze data and create plot
function analyzeData() {
    if (storedData.length < 2) {
        alert('Need at least 2 data points to perform analysis!');
        return;
    }

    // Transform data: x = h*T², y = h²
    const xData = storedData.map(d => d.h * d.T * d.T);
    const yData = storedData.map(d => d.h * d.h);

    // Perform linear regression
    const fit = linearRegression(xData, yData);
    if (!fit) return;

    // Calculate experimental g from slope: a = g/(4π²), so g = 4π²a
    const expG = 4 * Math.PI * Math.PI * fit.slope;
    const percentError = Math.abs((expG - g) / g * 100);

    // Update display
    document.getElementById('slopeValue').textContent = fit.slope.toFixed(4);
    document.getElementById('interceptValue').textContent = fit.intercept.toFixed(2);
    document.getElementById('slopeDisplay').textContent = fit.slope.toFixed(4);
    document.getElementById('interceptDisplay').textContent = fit.intercept.toFixed(2);
    document.getElementById('r2Value').textContent = fit.r2.toFixed(6);
    document.getElementById('expGravity').textContent = expG.toFixed(2);
    document.getElementById('expGravityM').textContent = (expG / 100).toFixed(2);
    document.getElementById('percentError').textContent = percentError.toFixed(2);

    // Draw scatter plot
    drawPlot(xData, yData, fit);

    analysisResults.style.display = 'flex';
}

// Draw scatter plot with linear fit
function drawPlot(xData, yData, fit) {
    const width = plotCanvas.width;
    const height = plotCanvas.height;
    const padding = 50;

    plotCtx.clearRect(0, 0, width, height);

    // Find data ranges
    const xMin = 0;
    const xMax = Math.max(...xData) * 1.1;
    const yMin = 0;
    const yMax = Math.max(...yData) * 1.1;

    // Helper functions for coordinate transformation
    const toCanvasX = (x) => padding + (x - xMin) / (xMax - xMin) * (width - 2 * padding);
    const toCanvasY = (y) => height - padding - (y - yMin) / (yMax - yMin) * (height - 2 * padding);

    // Draw grid
    plotCtx.strokeStyle = '#2a2a4a';
    plotCtx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
        const x = padding + i * (width - 2 * padding) / 5;
        plotCtx.beginPath();
        plotCtx.moveTo(x, padding);
        plotCtx.lineTo(x, height - padding);
        plotCtx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding + i * (height - 2 * padding) / 5;
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

    // Draw axis labels
    plotCtx.fillStyle = '#b8b8d1';
    plotCtx.font = '12px Arial';
    plotCtx.textAlign = 'center';

    // X-axis label
    plotCtx.fillText('x = h·T² (cm·s²)', width / 2, height - 10);

    // Y-axis label
    plotCtx.save();
    plotCtx.translate(15, height / 2);
    plotCtx.rotate(-Math.PI / 2);
    plotCtx.fillText('y = h² (cm²)', 0, 0);
    plotCtx.restore();

    // Draw axis tick labels
    plotCtx.font = '10px Arial';
    for (let i = 0; i <= 5; i++) {
        const xVal = xMin + i * (xMax - xMin) / 5;
        const x = toCanvasX(xVal);
        plotCtx.fillText(xVal.toFixed(1), x, height - padding + 15);

        const yVal = yMin + i * (yMax - yMin) / 5;
        const y = toCanvasY(yVal);
        plotCtx.textAlign = 'right';
        plotCtx.fillText(yVal.toFixed(0), padding - 5, y + 4);
        plotCtx.textAlign = 'center';
    }

    // Draw linear fit line
    plotCtx.strokeStyle = '#ff6b6b';
    plotCtx.lineWidth = 2;
    plotCtx.beginPath();
    const fitY0 = fit.slope * xMin + fit.intercept;
    const fitY1 = fit.slope * xMax + fit.intercept;
    plotCtx.moveTo(toCanvasX(xMin), toCanvasY(fitY0));
    plotCtx.lineTo(toCanvasX(xMax), toCanvasY(fitY1));
    plotCtx.stroke();

    // Draw data points
    plotCtx.fillStyle = '#00d4ff';
    for (let i = 0; i < xData.length; i++) {
        const cx = toCanvasX(xData[i]);
        const cy = toCanvasY(yData[i]);
        plotCtx.beginPath();
        plotCtx.arc(cx, cy, 6, 0, Math.PI * 2);
        plotCtx.fill();

        // Point border
        plotCtx.strokeStyle = '#fff';
        plotCtx.lineWidth = 1;
        plotCtx.stroke();
    }

    // Draw legend
    plotCtx.fillStyle = '#b8b8d1';
    plotCtx.font = '11px Arial';
    plotCtx.textAlign = 'left';

    // Data points legend
    plotCtx.fillStyle = '#00d4ff';
    plotCtx.beginPath();
    plotCtx.arc(width - 100, 25, 5, 0, Math.PI * 2);
    plotCtx.fill();
    plotCtx.fillStyle = '#b8b8d1';
    plotCtx.fillText('Data', width - 90, 28);

    // Fit line legend
    plotCtx.strokeStyle = '#ff6b6b';
    plotCtx.lineWidth = 2;
    plotCtx.beginPath();
    plotCtx.moveTo(width - 105, 45);
    plotCtx.lineTo(width - 85, 45);
    plotCtx.stroke();
    plotCtx.fillStyle = '#b8b8d1';
    plotCtx.fillText('Linear Fit', width - 80, 48);
}

// Initial draw
init();
