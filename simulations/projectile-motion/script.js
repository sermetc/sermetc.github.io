// Projectile Motion on Air Table Simulation

const canvas = document.getElementById('airTableCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const slopeAngleSlider = document.getElementById('slopeAngle');
const slopeValueSpan = document.getElementById('slopeValue');
const slopeDisplay = document.getElementById('slopeDisplay');
const gEffDisplay = document.getElementById('gEffDisplay');
const sparkIntervalSlider = document.getElementById('sparkInterval');
const sparkValueSpan = document.getElementById('sparkValue');
const resetBtn = document.getElementById('resetBtn');
const clearDotsBtn = document.getElementById('clearDotsBtn');
const speedDisplay = document.getElementById('speedDisplay');
const directionDisplay = document.getElementById('directionDisplay');

// Physical constants
const g = 980; // cm/s²
const pixelsPerCm = 5; // Scale: 5 pixels = 1 cm

// Table dimensions (in cm)
const tableWidth = canvas.width / pixelsPerCm;
const tableHeight = canvas.height / pixelsPerCm;

// Simulation state
let slopeAngle = 5; // degrees
let sparkInterval = 40; // ms
let puckRadius = 15; // pixels
let puckRadiusCm = puckRadius / pixelsPerCm;

// Puck state
let puckX = tableWidth / 2; // cm
let puckY = tableHeight / 4; // cm (start near top)
let puckVx = 0; // cm/s
let puckVy = 0; // cm/s

// Initial position for reset
let initialPuckX = tableWidth / 2;
let initialPuckY = tableHeight / 4;

// Interaction state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let currentMouseX = 0;
let currentMouseY = 0;

// Animation state
let isAnimating = false;
let animationId = null;
let lastTime = 0;
let lastSparkTime = 0;
let launchY = 0; // Y position at launch
let launchX = 0; // X position at launch
let launchAngle = 0; // Elevation angle at launch (degrees)
let hasMovedFromStart = false; // Track if puck has moved away from start
let trajectoryComplete = false; // Track if trajectory finished
let maxHeight = 0; // Maximum height reached (cm)
let minY = 0; // Minimum Y position (highest point, since Y increases downward)
let finalX = 0; // Final X position for range calculation
let initialVx = 0; // Initial velocity x component
let initialVy = 0; // Initial velocity y component
let flightTime = 0; // Total flight time
let timeToMaxHeight = 0; // Time to reach maximum height
let simulationTime = 0; // Track simulation time
let reachedMaxHeight = false; // Flag to track if max height was reached

// Spark dots (marks on paper)
let sparkDots = [];

// Convert canvas coordinates to physics coordinates (cm)
function canvasToPhysics(canvasX, canvasY) {
    return {
        x: canvasX / pixelsPerCm,
        y: canvasY / pixelsPerCm
    };
}

// Convert physics coordinates (cm) to canvas coordinates
function physicsToCanvas(physX, physY) {
    return {
        x: physX * pixelsPerCm,
        y: physY * pixelsPerCm
    };
}

// Check if point is inside puck
function isInsidePuck(canvasX, canvasY) {
    const pos = physicsToCanvas(puckX, puckY);
    const dx = canvasX - pos.x;
    const dy = canvasY - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= puckRadius + 10; // 10px tolerance
}

// Draw the air table
function drawTable() {
    // Table surface (paper) - slight gradient to show slope
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f5f5dc'); // Lighter at top (higher)
    gradient.addColorStop(1, '#e8e8c8'); // Slightly darker at bottom (lower)
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines to show the paper
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;

    // Vertical lines every 2cm
    for (let x = 0; x <= canvas.width; x += 2 * pixelsPerCm) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines every 2cm
    for (let y = 0; y <= canvas.height; y += 2 * pixelsPerCm) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw slope direction indicator (arrow showing "downhill")
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('↓ Downhill', 10, canvas.height - 10);

    // Border
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

// Draw spark dots
function drawSparkDots() {
    ctx.fillStyle = '#1a1a1a';
    sparkDots.forEach(dot => {
        const pos = physicsToCanvas(dot.x, dot.y);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw the puck
function drawPuck() {
    const pos = physicsToCanvas(puckX, puckY);

    // Puck shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(pos.x + 3, pos.y + 3, puckRadius, 0, Math.PI * 2);
    ctx.fill();

    // Puck body
    const puckGradient = ctx.createRadialGradient(
        pos.x - 5, pos.y - 5, 0,
        pos.x, pos.y, puckRadius
    );
    puckGradient.addColorStop(0, '#ff6b6b');
    puckGradient.addColorStop(1, '#cc4444');
    ctx.fillStyle = puckGradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, puckRadius, 0, Math.PI * 2);
    ctx.fill();

    // Puck border
    ctx.strokeStyle = '#aa3333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
    ctx.fill();
}

// Calculate predicted trajectory points
function calculateTrajectory(startX, startY, vx, vy) {
    const points = [];
    const slopeRad = slopeAngle * Math.PI / 180;
    const ay = g * Math.sin(slopeRad);

    let x = startX;
    let y = startY;
    let currentVy = vy;
    const dt = 0.01; // Time step for trajectory calculation

    points.push({ x, y });

    // Calculate trajectory until it returns to start Y or hits boundary
    let hasMovedAway = false;
    const maxIterations = 2000;

    for (let i = 0; i < maxIterations; i++) {
        // Update position
        x += vx * dt;
        y += currentVy * dt + 0.5 * ay * dt * dt;
        currentVy += ay * dt;

        // Check if moved away from start
        if (!hasMovedAway && Math.abs(y - startY) > 1) {
            hasMovedAway = true;
        }

        // Stop if returned to start Y (after moving away)
        if (hasMovedAway && y >= startY) {
            points.push({ x, y: startY });
            break;
        }

        // Stop if out of bounds
        if (x < 0 || x > tableWidth || y < 0 || y > tableHeight) {
            break;
        }

        points.push({ x, y });
    }

    return points;
}

// Draw ghost trajectory
function drawGhostTrajectory(vx, vy) {
    const trajectoryPoints = calculateTrajectory(puckX, puckY, vx, vy);

    if (trajectoryPoints.length < 2) return;

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);

    ctx.beginPath();
    const startPos = physicsToCanvas(trajectoryPoints[0].x, trajectoryPoints[0].y);
    ctx.moveTo(startPos.x, startPos.y);

    for (let i = 1; i < trajectoryPoints.length; i++) {
        const pos = physicsToCanvas(trajectoryPoints[i].x, trajectoryPoints[i].y);
        ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw predicted landing point
    if (trajectoryPoints.length > 1) {
        const endPoint = trajectoryPoints[trajectoryPoints.length - 1];
        const endPos = physicsToCanvas(endPoint.x, endPoint.y);

        ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(endPos.x, endPos.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Draw velocity arrow during drag
function drawVelocityArrow() {
    if (!isDragging) return;

    const pos = physicsToCanvas(puckX, puckY);

    // Calculate velocity direction (opposite to drag)
    const dx = dragStartX - currentMouseX;
    const dy = dragStartY - currentMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) return; // Too small to show

    // Calculate initial velocity for trajectory preview
    const velocityScale = 3; // cm/s per pixel of drag
    const vx = (dx / distance) * distance * velocityScale;
    const vy = (dy / distance) * distance * velocityScale;

    // Draw ghost trajectory first (so it's behind the arrow)
    drawGhostTrajectory(vx, vy);

    // Scale factor for arrow (visual representation)
    const maxArrowLength = 150;
    const arrowLength = Math.min(distance, maxArrowLength);

    // Arrow end point
    const endX = pos.x + (dx / distance) * arrowLength;
    const endY = pos.y + (dy / distance) * arrowLength;

    // Draw arrow line
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrowhead
    const headLength = 15;
    const angle = Math.atan2(dy, dx);

    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - headLength * Math.cos(angle - Math.PI / 6),
        endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        endX - headLength * Math.cos(angle + Math.PI / 6),
        endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Draw drag line (from puck to mouse)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(currentMouseX, currentMouseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Update velocity display
    const speed = distance * velocityScale;
    const direction = Math.atan2(-dy, dx) * 180 / Math.PI; // Angle from horizontal

    speedDisplay.textContent = speed.toFixed(1);
    directionDisplay.textContent = direction.toFixed(1);
}

// Draw launch angle label on paper
function drawAngleLabel() {
    if (!trajectoryComplete || sparkDots.length < 2) return;

    // Draw flight time info on top left
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';

    ctx.fillText('Flight Time: T = ' + flightTime.toFixed(3) + ' s', 15, 25);
    ctx.fillText('Time to Max Height: t = ' + timeToMaxHeight.toFixed(3) + ' s', 15, 45);

    // Get positions
    const startPos = physicsToCanvas(launchX, launchY);
    const endPos = physicsToCanvas(finalX, launchY);
    const highestPos = physicsToCanvas(launchX + (finalX - launchX) / 2, minY); // Approximate apex

    // Draw angle arc
    const arcRadius = 40;
    const startAngle = 0; // Horizontal reference
    const endAngle = -launchAngle * Math.PI / 180; // Convert to radians, negative for canvas coords

    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, arcRadius, startAngle, endAngle, launchAngle > 0);
    ctx.stroke();

    // Draw horizontal reference line
    ctx.strokeStyle = 'rgba(230, 57, 70, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(startPos.x + 60, startPos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw angle label - position it away from the arc
    const labelAngle = endAngle / 2;
    const labelRadius = arcRadius + 35;
    const labelX = startPos.x + labelRadius * Math.cos(labelAngle);
    const labelY = startPos.y + labelRadius * Math.sin(labelAngle);

    ctx.fillStyle = '#e63946';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('θ = ' + Math.abs(launchAngle).toFixed(1) + '°', labelX, labelY);

    // Calculate range
    const range = Math.abs(finalX - launchX);

    // Draw range line and label
    ctx.strokeStyle = '#2a9d8f';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Range line with arrows
    const rangeY = startPos.y + 25;
    ctx.beginPath();
    ctx.moveTo(startPos.x, rangeY);
    ctx.lineTo(endPos.x, rangeY);
    ctx.stroke();

    // Arrow heads for range
    ctx.fillStyle = '#2a9d8f';
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(startPos.x, rangeY);
    ctx.lineTo(startPos.x + 8, rangeY - 4);
    ctx.lineTo(startPos.x + 8, rangeY + 4);
    ctx.closePath();
    ctx.fill();
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(endPos.x, rangeY);
    ctx.lineTo(endPos.x - 8, rangeY - 4);
    ctx.lineTo(endPos.x - 8, rangeY + 4);
    ctx.closePath();
    ctx.fill();

    // Range label
    ctx.fillStyle = '#2a9d8f';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('R = ' + range.toFixed(1) + ' cm', (startPos.x + endPos.x) / 2, rangeY + 18);

    // Draw max height line and label
    if (maxHeight > 1) {
        const apexX = startPos.x + (endPos.x - startPos.x) / 2;
        const apexY = physicsToCanvas(0, minY).y;

        ctx.strokeStyle = '#e9c46a';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(apexX, startPos.y);
        ctx.lineTo(apexX, apexY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow heads for height
        ctx.fillStyle = '#e9c46a';
        // Bottom arrow
        ctx.beginPath();
        ctx.moveTo(apexX, startPos.y);
        ctx.lineTo(apexX - 4, startPos.y - 8);
        ctx.lineTo(apexX + 4, startPos.y - 8);
        ctx.closePath();
        ctx.fill();
        // Top arrow
        ctx.beginPath();
        ctx.moveTo(apexX, apexY);
        ctx.lineTo(apexX - 4, apexY + 8);
        ctx.lineTo(apexX + 4, apexY + 8);
        ctx.closePath();
        ctx.fill();

        // Height label
        ctx.fillStyle = '#e9c46a';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('H = ' + maxHeight.toFixed(1) + ' cm', apexX + 10, (startPos.y + apexY) / 2);
    }

    // Draw initial velocity vector and components from launch point
    const speed = Math.sqrt(initialVx * initialVx + initialVy * initialVy);
    const vectorScale = 0.4; // Scale factor for drawing vectors

    // Vector lengths in pixels (proportional to actual values)
    const vxLength = initialVx * vectorScale;
    const vyLength = initialVy * vectorScale;

    // Draw Vx component (horizontal arrow) - from initial point
    ctx.strokeStyle = '#2196F3';
    ctx.fillStyle = '#2196F3';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(startPos.x + vxLength, startPos.y);
    ctx.stroke();

    // Vx arrowhead
    if (Math.abs(vxLength) > 10) {
        const vxDir = vxLength > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(startPos.x + vxLength, startPos.y);
        ctx.lineTo(startPos.x + vxLength - 8 * vxDir, startPos.y - 4);
        ctx.lineTo(startPos.x + vxLength - 8 * vxDir, startPos.y + 4);
        ctx.closePath();
        ctx.fill();
    }

    // Vx label
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Vₓ = ' + initialVx.toFixed(0), startPos.x + vxLength / 2, startPos.y + 15);

    // Draw Vy component (vertical arrow) - from initial point
    ctx.strokeStyle = '#4CAF50';
    ctx.fillStyle = '#4CAF50';

    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(startPos.x, startPos.y + vyLength);
    ctx.stroke();

    // Vy arrowhead
    if (Math.abs(vyLength) > 10) {
        const vyDir = vyLength > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y + vyLength);
        ctx.lineTo(startPos.x - 4, startPos.y + vyLength - 8 * vyDir);
        ctx.lineTo(startPos.x + 4, startPos.y + vyLength - 8 * vyDir);
        ctx.closePath();
        ctx.fill();
    }

    // Vy label (show as positive for upward)
    ctx.textAlign = 'left';
    ctx.fillText('Vᵧ = ' + (-initialVy).toFixed(0), startPos.x - 55, startPos.y + vyLength / 2 + 4);

    // Draw V0 vector (total velocity - diagonal arrow)
    ctx.strokeStyle = '#9C27B0';
    ctx.fillStyle = '#9C27B0';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(startPos.x + vxLength, startPos.y + vyLength);
    ctx.stroke();

    // V0 arrowhead
    const v0Length = Math.sqrt(vxLength * vxLength + vyLength * vyLength);
    if (v0Length > 10) {
        const angle = Math.atan2(vyLength, vxLength);
        ctx.beginPath();
        ctx.moveTo(startPos.x + vxLength, startPos.y + vyLength);
        ctx.lineTo(
            startPos.x + vxLength - 10 * Math.cos(angle - 0.3),
            startPos.y + vyLength - 10 * Math.sin(angle - 0.3)
        );
        ctx.lineTo(
            startPos.x + vxLength - 10 * Math.cos(angle + 0.3),
            startPos.y + vyLength - 10 * Math.sin(angle + 0.3)
        );
        ctx.closePath();
        ctx.fill();
    }

    // V0 label
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    const labelOffsetX = vxLength / 2 + 5;
    const labelOffsetY = vyLength / 2 - 5;
    ctx.fillText('V₀ = ' + speed.toFixed(0) + ' cm/s', startPos.x + labelOffsetX, startPos.y + labelOffsetY);
}

// Main draw function
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTable();
    drawSparkDots();
    drawAngleLabel();
    drawPuck();
    drawVelocityArrow();
}

// Update physics
function updatePhysics(dt) {
    // Acceleration due to slope (only in y direction - down the slope)
    const slopeRad = slopeAngle * Math.PI / 180;
    const ay = g * Math.sin(slopeRad); // cm/s²
    const ax = 0;

    // Update velocity
    puckVx += ax * dt;
    puckVy += ay * dt;

    // Update position
    puckX += puckVx * dt;
    puckY += puckVy * dt;

    // Boundary collisions
    const margin = puckRadiusCm;

    // Left/Right walls
    if (puckX < margin) {
        puckX = margin;
        puckVx = -puckVx * 0.8; // Some energy loss on collision
    }
    if (puckX > tableWidth - margin) {
        puckX = tableWidth - margin;
        puckVx = -puckVx * 0.8;
    }

    // Top/Bottom walls
    if (puckY < margin) {
        puckY = margin;
        puckVy = -puckVy * 0.8;
    }
    if (puckY > tableHeight - margin) {
        puckY = tableHeight - margin;
        puckVy = -puckVy * 0.8;
    }
}

// Animation loop
function animate(timestamp) {
    if (!isAnimating) return;

    if (lastTime === 0) {
        lastTime = timestamp;
        lastSparkTime = timestamp;
    }

    const dt = (timestamp - lastTime) / 1000; // Convert to seconds
    lastTime = timestamp;

    // Store previous velocity to detect max height
    const prevVy = puckVy;

    // Update physics with small timesteps for accuracy
    const physicsSteps = 10;
    const physDt = dt / physicsSteps;
    for (let i = 0; i < physicsSteps; i++) {
        updatePhysics(physDt);
    }

    // Track simulation time
    simulationTime += dt;

    // Detect when max height is reached (Vy changes from negative to positive)
    if (!reachedMaxHeight && prevVy < 0 && puckVy >= 0) {
        reachedMaxHeight = true;
        timeToMaxHeight = simulationTime;
    }

    // Add spark dot at intervals
    if (timestamp - lastSparkTime >= sparkInterval) {
        sparkDots.push({ x: puckX, y: puckY });
        lastSparkTime = timestamp;
    }

    // Draw
    draw();

    // Track minimum Y (highest point, since Y increases downward)
    if (puckY < minY) {
        minY = puckY;
    }

    // Check if puck has moved away from start position
    if (!hasMovedFromStart && Math.abs(puckY - launchY) > 1) {
        hasMovedFromStart = true;
    }

    // Check if puck has returned to initial Y position (after moving away)
    if (hasMovedFromStart && puckY >= launchY) {
        // Snap to exact launch Y and stop
        puckY = launchY;
        puckVx = 0;
        puckVy = 0;

        // Store final values
        finalX = puckX;
        maxHeight = launchY - minY; // Height is difference (positive value)
        flightTime = simulationTime; // Store total flight time

        // Add final spark dot
        sparkDots.push({ x: puckX, y: puckY });

        trajectoryComplete = true;
        draw();
        isAnimating = false;
        return;
    }

    // Also stop if puck hits bottom boundary
    if (puckY >= tableHeight - puckRadiusCm - 1) {
        isAnimating = false;
        return;
    }

    animationId = requestAnimationFrame(animate);
}

// Start animation
function startAnimation() {
    if (isAnimating) return;

    isAnimating = true;
    lastTime = 0;
    lastSparkTime = 0;
    launchX = puckX; // Record initial X position
    launchY = puckY; // Record initial Y position
    minY = puckY; // Initialize minY to track highest point
    hasMovedFromStart = false;
    trajectoryComplete = false;
    simulationTime = 0;
    timeToMaxHeight = 0;
    flightTime = 0;
    reachedMaxHeight = false;

    // Add initial spark dot
    sparkDots.push({ x: puckX, y: puckY });

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

// Reset puck to initial position
function resetPuck() {
    stopAnimation();
    puckX = initialPuckX;
    puckY = initialPuckY;
    puckVx = 0;
    puckVy = 0;
    sparkDots = [];
    trajectoryComplete = false;
    speedDisplay.textContent = '0';
    directionDisplay.textContent = '0';
    draw();
}

// Clear only the dots
function clearDots() {
    sparkDots = [];
    trajectoryComplete = false;
    draw();
}

// Mouse event handlers
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (isAnimating) return;

    const mouse = getMousePos(e);

    if (isInsidePuck(mouse.x, mouse.y)) {
        // Start dragging to launch
        isDragging = true;
        dragStartX = mouse.x;
        dragStartY = mouse.y;
        currentMouseX = mouse.x;
        currentMouseY = mouse.y;
        canvas.style.cursor = 'grabbing';
    } else {
        // Click elsewhere to reposition puck
        const physPos = canvasToPhysics(mouse.x, mouse.y);

        // Keep puck within bounds
        const margin = puckRadiusCm;
        puckX = Math.max(margin, Math.min(tableWidth - margin, physPos.x));
        puckY = Math.max(margin, Math.min(tableHeight - margin, physPos.y));

        // Update initial position for reset
        initialPuckX = puckX;
        initialPuckY = puckY;

        // Clear dots when repositioning
        sparkDots = [];
        trajectoryComplete = false;

        draw();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const mouse = getMousePos(e);

    if (isDragging) {
        currentMouseX = mouse.x;
        currentMouseY = mouse.y;
        draw();
    } else if (!isAnimating) {
        // Change cursor when hovering over puck
        if (isInsidePuck(mouse.x, mouse.y)) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!isDragging) return;

    isDragging = false;
    canvas.style.cursor = 'crosshair';

    // Calculate initial velocity (opposite to drag direction)
    const dx = dragStartX - currentMouseX;
    const dy = dragStartY - currentMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        // Convert to velocity (cm/s)
        const velocityScale = 3; // cm/s per pixel of drag
        puckVx = (dx / distance) * distance * velocityScale;
        puckVy = (dy / distance) * distance * velocityScale;

        // Store initial velocity components
        initialVx = puckVx;
        initialVy = puckVy;

        // Store launch angle (angle above horizontal, negative because y increases downward)
        launchAngle = Math.atan2(-puckVy, puckVx) * 180 / Math.PI;

        // Start animation
        startAnimation();
    }

    draw();
});

canvas.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
        draw();
    }
});

// Touch support for mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
});

// Update effective gravity display
function updateEffectiveGravity() {
    const slopeRad = slopeAngle * Math.PI / 180;
    const gEff = g * Math.sin(slopeRad);
    gEffDisplay.textContent = gEff.toFixed(1);
}

// Control event listeners
slopeAngleSlider.addEventListener('input', () => {
    slopeAngle = parseFloat(slopeAngleSlider.value);
    slopeValueSpan.textContent = slopeAngle + '°';
    slopeDisplay.textContent = slopeAngle;
    updateEffectiveGravity();
});

sparkIntervalSlider.addEventListener('input', () => {
    sparkInterval = parseInt(sparkIntervalSlider.value);
    sparkValueSpan.textContent = sparkInterval + ' ms';
});

resetBtn.addEventListener('click', resetPuck);
clearDotsBtn.addEventListener('click', clearDots);

// Initial setup
updateEffectiveGravity();
draw();
