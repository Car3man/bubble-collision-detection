class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class AABB {
    constructor(minX, maxX, minY, maxY) {
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
    }

    getWidth() {
        return this.maxX - this.minX
    }

    getHeight() {
        return this.maxY - this.minY
    }
}

class Grid {
    constructor(rows, columns) {
        this.rows = rows;
        this.columns = columns;

        this.cells = Array(columns);
        for (let x = 0; x < columns; x++) {
            this.cells[x] = Array(rows).fill([]);
        }
    }
}

class Bubble {
    constructor(radius, color, position) {
        this.radius = radius;
        this.color = color;
        this.position = position;
    }
}

class BubbleWorld {
    constructor(aabb, grid) {
        this.aabb = aabb;
        this.grid = grid
    }

    getCellAABB(x, y) {
        const cellWidth = aabb.getWidth() / grid.columns;
        const cellHeight = aabb.getHeight() / grid.rows;
        const minX = aabb.minX + x * cellWidth;
        const maxX = aabb.minX + x * cellWidth + cellWidth;
        const minY = aabb.minY + y * cellHeight;
        const maxY = aabb.minY + y * cellHeight + cellHeight;
        return new AABB(minX, maxX, minY, maxY);
    }
}

// utility functions

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getCurrentTick() {
    return new Date().getTime();
}

function getRandomColor() {
    const colors = [
        "red",
        "green",
        "blue",
        "cyan",
        "yellow",
        "purple"
    ];
    const random = Math.floor(Math.random() * colors.length);
    return colors[random];
}

function getRandomPointInAABB(aabb) {
    return new Vector2(
        aabb.getWidth() * Math.random() + aabb.minX,
        aabb.getHeight() * Math.random() + aabb.minY  
    );
}

function angleToDirection(angle) {
    return new Vector2(
        Math.cos(angle),
        Math.sin(angle)
    );
}

function directionToAngle(direction) {
    return Math.atan2(direction.x, direction.y);
}

function getRandomAngle() {
    return Math.random() * 2 * Math.PI;
}

function isCircleIntersectRect(cx, cy, cr, rx, ry, rw, rh) {
    return cx - cr <= rx + rw &&
            cx + cr >= rx &&
            cy - cr <= ry + rh &&
            cy + cr >= ry;
}

function isCircleIntersectCircle(x1, y1, r1, x2, y2, r2) {
    const distance = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
    const radiuses = (r1 + r2) * (r1 + r2);
    return Math.abs(distance < radiuses);
}

// draw functions

function clear(ctx, canvasSize) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasSize.x, canvasSize.y);
}

function drawFramerate(ctx, deltaTime, framerate) {
    ctx.fillStyle = "red"
    ctx.font = "35px Arial";
    ctx.fillText(deltaTime.toFixed(7), 0, 35);
    ctx.fillText(framerate, 0, 75);
}

function drawWorldGrid(ctx, world) {
    for (let x = 0; x < world.grid.columns; x++) {
        for (let y = 0; y < world.grid.rows; y++) {
            const cellAABB = world.getCellAABB(x, y);
            
            if (world.grid.cells[x][y].length > 0) {
                ctx.fillStyle = "#e6e3e3";
                ctx.fillRect(
                    cellAABB.minX,
                    cellAABB.minY,
                    cellAABB.getWidth(),
                    cellAABB.getHeight()
                );
            }

            ctx.strokeStyle = "black";
            ctx.strokeRect(
                cellAABB.minX,
                cellAABB.minY,
                cellAABB.getWidth(),
                cellAABB.getHeight()
            );
        }
    }
}

function drawBubbles(ctx, bubbles) {
    for (const bubble of bubbles) {
        drawBubble(ctx, bubble);
    }
}

function drawBubble(ctx, bubble) {
    ctx.fillStyle = bubble.color;
    ctx.beginPath();
    ctx.arc(
        bubble.position.x,
        bubble.position.y,
        bubble.radius,
        0,
        2 * Math.PI
    );
    ctx.fill();

    if (bubble.contactWith.length > 0) {
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.arc(
            bubble.position.x,
            bubble.position.y,
            bubble.radius,
            0,
            2 * Math.PI
        );
        ctx.stroke();
    }
}

function calculateBestGridSize(aabb, bubbleRadius) {
    const bubbleDiameter = bubbleRadius * 2;
    const correction = 6
    let x = Math.floor(aabb.getWidth() / bubbleDiameter / correction);
    let y = Math.floor(aabb.getHeight() / bubbleDiameter / correction);
    let c = Math.min(x, y)
    return new Vector2(c, c);
}

// main
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

const canvas = document.getElementById("canvas");
canvas.width  = windowWidth;
canvas.height = windowHeight;

const ctx = canvas.getContext("2d");

const canvasSize = new Vector2(windowWidth, windowHeight);
const worldOffset = new Vector2(0, 100);
const worldSize = new Vector2(windowWidth, 600);
const bubbleRadius = 6;

let currentFrameTick = 0
let lastFrameTick = 0;
let deltaTime = 0.0;
let time = 0.0;
let framerate = 0;

const aabb = new AABB(
    worldOffset.x,
    worldOffset.x + worldSize.x,
    worldOffset.y,
    worldOffset.y + worldSize.y
);
const best_grid_size = calculateBestGridSize(aabb, bubbleRadius);
const grid = new Grid(best_grid_size.x, best_grid_size.y);
const world = new BubbleWorld(aabb, grid);
const bubbles = [];

// bubble spawn system vars
const maxSpawnedBubbles = 312
const spawnBubbleEvery = 0;
let lastBubbleSpawnTime = 0.0;

// bubble lifetime system vars
const bubbleLifetime = 10;

// bubble move system vars
const bubbleMovespeed = 25;

function calculateDeltaTime() {
    currentFrameTick = getCurrentTick();
    const tickDelta = currentFrameTick - lastFrameTick;
    const deltaSeconds = tickDelta / 1000;
    deltaTime = deltaSeconds;
    lastFrameTick = currentFrameTick;
}

function calculateFramerate() {
    framerate = (1 / deltaTime).toFixed(1);
}

function bubbleSpawning() {
    if (bubbles.length >= maxSpawnedBubbles) {
        return;
    }

    if (time - lastBubbleSpawnTime >= spawnBubbleEvery) {
        const bubble = new Bubble(
            bubbleRadius,
            "grey",
            // getRandomColor(),
            getRandomPointInAABB(world.aabb)
        );
        bubble.spawnTime = time;
        bubbles.push(bubble);
        lastBubbleSpawnTime = time;
    }
}

function bubbleMoving() {
    for (const bubble of bubbles) {
        if (!bubble.angle) {
            bubble.angle = getRandomAngle();
        }

        const direction = angleToDirection(bubble.angle);
        bubble.position.x = bubble.position.x + direction.x
            * bubbleMovespeed * deltaTime;
        bubble.position.y = bubble.position.y + direction.y
            * bubbleMovespeed * deltaTime;
    }
}

function bubbleDestroying() {
    const bubblesToDestroy = []

    for (const bubble of bubbles) {
        if (bubble.position.x < world.aabb.minX ||
            bubble.position.x > world.aabb.maxX ||
            bubble.position.y < world.aabb.minY ||
            bubble.position.y > world.aabb.maxY)
        {
            const bubbleIndex = bubbles.indexOf(bubble);
            bubblesToDestroy.push(bubbleIndex);
            continue;
        }

        if (time - bubble.spawnTime >= bubbleLifetime) {
            const bubbleIndex = bubbles.indexOf(bubble);
            bubblesToDestroy.push(bubbleIndex);
            continue;
        }
    }

    for (const bubbleIndex of bubblesToDestroy) {
        if (bubbleIndex < 0) {
            continue;
        }
        bubbles.splice(bubbleIndex, 1);
    }
}

function physicsBroadPhase() {
    for (const bubble of bubbles) {
        bubble.gridCells = [];
    }

    for (let x = 0; x < world.grid.columns; x++) {
        for (let y = 0; y < world.grid.rows; y++) {
            world.grid.cells[x][y] = [];
            
            const cellAABB = world.getCellAABB(x, y);
            for (const bubble of bubbles) {
                if (isCircleIntersectRect(
                    bubble.position.x,
                    bubble.position.y,
                    bubbleRadius,
                    cellAABB.minX,
                    cellAABB.minY,
                    cellAABB.getWidth(),
                    cellAABB.getHeight()))
                {
                    bubble.gridCells.push({
                        x,
                        y,
                    });
                    world.grid.cells[x][y].push(bubble);
                }
            }
        }
    }
}

function physicsCollisionDetection() {
    let collisionChecks = 0;

    for (const bubble of bubbles) {
        bubble.contactWith = [];
    }

    for (const bubble of bubbles) {
        for (const cellIndex of bubble.gridCells) {
            const cell = world.grid.cells[cellIndex.x][cellIndex.y];
            for (const otherBubble of cell) {
                collisionChecks++;

                if (bubble == otherBubble) {
                    continue;
                }

                if (isCircleIntersectCircle(
                    bubble.position.x,
                    bubble.position.y,
                    bubbleRadius,
                    otherBubble.position.x,
                    otherBubble.position.y,
                    bubbleRadius
                    ))
                {
                    bubble.contactWith.push(otherBubble);
                }
            }
        }
    }

    // console.log("Collision checks: " + collisionChecks)
}

function physicsStupidCollisionDetection() {
    for (const bubble of bubbles) {
        bubble.contactWith = [];
    }

    for (const bubble of bubbles) {
        for (const otherBubble of bubbles) {
            if (bubble == otherBubble) {
                continue;
            }

            if (isCircleIntersectCircle(
                bubble.position.x,
                bubble.position.y,
                bubbleRadius,
                otherBubble.position.x,
                otherBubble.position.y,
                bubbleRadius
                ))
            {
                bubble.contactWith.push(otherBubble);
            }
        }
    }

    // console.log("Collision checks: " + (bubbles.length * bubbles.length))
}

function physics() {
    physicsBroadPhase();
    physicsCollisionDetection();
}

async function gameLoop() {
    while (true) {
        calculateDeltaTime();
        calculateFramerate();

        logic();
        render();

        await wait(1 / 60 * 1000);
        time += deltaTime
    }
}

function logic() {
    bubbleSpawning();
    bubbleMoving();
    bubbleDestroying();
    physics();
}

function render() {
    clear(ctx, canvasSize);
    drawFramerate(ctx, deltaTime, framerate);
    drawWorldGrid(ctx, world);
    drawBubbles(ctx, bubbles);
}

gameLoop();