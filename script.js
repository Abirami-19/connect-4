const ROWS = 6;
const COLS = 7;
const PADDING = 16;
const SLOT_SIZE = 70;
const GAP = 12;

let board = [];
let currentPlayer = 1; // 1: Player (Red), 2: AI (Yellow)
let gameActive = true;
let isAnimating = false;
let moveCounter = 0;

let playerScore = 0;
let aiScore = 0;

document.addEventListener('DOMContentLoaded', () => {
    drawBoardSVG();
    drawClickOverlay();
    
    // Bind buttons
    document.getElementById('restart-btn').addEventListener('click', initGame);
    document.getElementById('new-round-btn').addEventListener('click', initGame);
    
    // Bind chips
    document.querySelectorAll('.diff-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.diff-chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    initGame();
});

// INITIALIZATION

function initGame() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    currentPlayer = 1;
    gameActive = true;
    isAnimating = false;
    moveCounter++;
    
    document.getElementById('pieces-container').innerHTML = '';
    updateStatusDisplay();
}

function updateScoreView() {
    const totalScore = playerScore + aiScore;
    document.getElementById('score-display').textContent = `Score: ${totalScore.toString().padStart(2, '0')}`;
}

// UI RENDERING

function drawBoardSVG() {
    const mask = document.getElementById('holes');
    const svgLayer = document.querySelector('.board-mask');
    
    svgLayer.querySelectorAll('.bevel-ring').forEach(e => e.remove());
    mask.querySelectorAll('.slot-hole').forEach(e => e.remove());

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cx = PADDING + c * (SLOT_SIZE + GAP) + SLOT_SIZE / 2;
            const cy = PADDING + r * (SLOT_SIZE + GAP) + SLOT_SIZE / 2;
            
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", cx);
            circle.setAttribute("cy", cy);
            circle.setAttribute("r", SLOT_SIZE / 2);
            circle.setAttribute("fill", "black");
            circle.setAttribute("class", "slot-hole");
            mask.appendChild(circle);
            
            const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            ring.setAttribute("cx", cx);
            ring.setAttribute("cy", cy);
            ring.setAttribute("r", SLOT_SIZE / 2);
            ring.setAttribute("fill", "transparent");
            ring.setAttribute("stroke", "rgba(36, 39, 46, 0.4)"); // Using backplate background for realistic inner shadow
            ring.setAttribute("stroke-width", "4");
            ring.setAttribute("class", "bevel-ring");
            svgLayer.appendChild(ring);
        }
    }
}

function drawClickOverlay() {
    const overlay = document.getElementById('click-overlay');
    overlay.innerHTML = '';
    
    for (let c = 0; c < COLS; c++) {
        const colDiv = document.createElement('div');
        colDiv.classList.add('hover-column');
        colDiv.dataset.col = c;
        
        let left = c === 0 ? 0 : PADDING + c * (SLOT_SIZE + GAP) - GAP / 2;
        let width = c === 0 ? PADDING + SLOT_SIZE + GAP / 2 : SLOT_SIZE + GAP;
        if (c === COLS - 1) width = SLOT_SIZE + PADDING + GAP / 2;
        
        colDiv.style.position = 'absolute';
        colDiv.style.left = `${left}px`;
        colDiv.style.width = `${width}px`;
        colDiv.style.height = '100%';
        
        colDiv.addEventListener('click', () => handleColumnClick(c));
        overlay.appendChild(colDiv);
    }
}

function updateStatusDisplay() {
    const display = document.getElementById('status-display');
    if (!gameActive) return; 
    
    if (currentPlayer === 1) {
        display.textContent = "Your Turn";
        display.style.color = "var(--player-color)";
    } else {
        display.textContent = "AI Thinking...";
        display.style.color = "var(--ai-color)";
    }
}

// GAME FLOW

function handleColumnClick(c) {
    if (!gameActive || isAnimating || currentPlayer !== 1) return;
    
    let r = getNextOpenRow(board, c);
    if (r === -1) return; 
    
    dropPiece(r, c, 1);
}

function dropPiece(r, c, player) {
    isAnimating = true;
    board[r][c] = player;
    
    const container = document.getElementById('pieces-container');
    const piece = document.createElement('div');
    piece.className = `piece ${player === 1 ? 'player' : 'ai'}`;
    piece.id = `piece-${r}-${c}`;
    
    const left = PADDING + c * (SLOT_SIZE + GAP);
    const targetTop = PADDING + r * (SLOT_SIZE + GAP);
    
    piece.style.left = `${left}px`;
    piece.style.top = `-100px`;
    
    container.appendChild(piece);
    
    const currentMoveId = moveCounter;

    piece.style.setProperty('--drop-y', `${targetTop + 100}px`);
    piece.classList.add('falling');
    
    piece.addEventListener('animationend', () => {
        if (currentMoveId !== moveCounter) return;
        if (!container.contains(piece)) return;
        
        const winResult = checkWin(board);
        if (winResult) {
            endGame(winResult.winner, winResult.line);
        } else if (checkDraw(board)) {
            endGame(0, null);
        } else {
            currentPlayer = currentPlayer === 1 ? 2 : 1;
            updateStatusDisplay();
            isAnimating = false;
            
            if (currentPlayer === 2) {
                playAITurn();
            }
        }
    }, { once: true });
}

function endGame(winner, line) {
    gameActive = false;
    isAnimating = false;
    const display = document.getElementById('status-display');
    
    if (winner === 1) {
        display.textContent = "You Win! 🎉";
        display.style.color = "var(--player-color)";
        playerScore++;
        updateScoreView();
    } else if (winner === 2) {
        display.textContent = "AI Wins! 🤖";
        display.style.color = "var(--ai-color)";
        aiScore++;
        updateScoreView();
    } else {
        display.textContent = "It's a Draw! 🤝";
        display.style.color = "var(--color-primary-text)";
    }
    
    if (line) {
        line.forEach(pos => {
            const p = document.getElementById(`piece-${pos.r}-${pos.c}`);
            if (p) p.classList.add('winning');
        });
    }
}

// WIN / DRAW LOGIC

function checkDraw(b) {
    for (let c = 0; c < COLS; c++) {
        if (b[0][c] === 0) return false;
    }
    return true;
}

function checkWinLine(b, r, c, dr, dc) {
    const player = b[r][c];
    if (player === 0) return null;
    
    let winNodes = [{r, c}];
    for (let i = 1; i < 4; i++) {
        let nr = r + dr * i;
        let nc = c + dc * i;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return null;
        if (b[nr][nc] !== player) return null;
        winNodes.push({r: nr, c: nc});
    }
    return winNodes;
}

function checkWin(b) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (b[r][c] === 0) continue;
            
            const lines = [
                checkWinLine(b, r, c, 0, 1),
                checkWinLine(b, r, c, 1, 0),
                checkWinLine(b, r, c, 1, 1),
                checkWinLine(b, r, c, 1, -1)
            ];
            
            for (let line of lines) {
                if (line) return { winner: b[r][c], line: line };
            }
        }
    }
    return null;
}

// AI LOGIC

function playAITurn() {
    isAnimating = true; 
    
    // Read selected difficulty directly from DOM
    const activeChip = document.querySelector('.diff-chip.active');
    const diff = activeChip ? activeChip.dataset.value : "3";
    
    setTimeout(() => {
        if (!gameActive) return;
        isAnimating = false; 
        
        let c = getAIMove(diff);
        if (c !== null) {
            let r = getNextOpenRow(board, c);
            dropPiece(r, c, 2);
        }
    }, 700);
}

function getValidColumns(b) {
    let valid = [];
    for (let c = 0; c < COLS; c++) {
        if (b[0][c] === 0) valid.push(c);
    }
    return valid;
}

function getNextOpenRow(b, c) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (b[r][c] === 0) return r;
    }
    return -1;
}

function copyBoard(b) {
    return b.map(row => [...row]);
}

function getAIMove(diff) {
    const validCols = getValidColumns(board);
    if (validCols.length === 0) return null;
    
    if (diff === "1") {
        return validCols[Math.floor(Math.random() * validCols.length)];
    }
    
    if (diff === "2") {
        for (let c of validCols) {
            let tmp = copyBoard(board);
            tmp[getNextOpenRow(board, c)][c] = 2;
            if (checkWin(tmp)) return c;
        }
        for (let c of validCols) {
            let tmp = copyBoard(board);
            tmp[getNextOpenRow(board, c)][c] = 1;
            if (checkWin(tmp)) return c;
        }
        return validCols[Math.floor(Math.random() * validCols.length)];
    }
    
    return getHardMove(board);
}

function getHardMove(b) {
    const validCols = getValidColumns(b);
    
    for (let c of validCols) {
        let tmp = copyBoard(b);
        tmp[getNextOpenRow(b, c)][c] = 2;
        if (checkWin(tmp)) return c;
    }
    
    for (let c of validCols) {
        let tmp = copyBoard(b);
        tmp[getNextOpenRow(b, c)][c] = 1;
        if (checkWin(tmp)) return c;
    }
    
    let bestScore = -Infinity;
    let bestCols = [];
    
    for (let c of validCols) {
        let r = getNextOpenRow(b, c);
        let tmp = copyBoard(b);
        tmp[r][c] = 2; 
        
        let score = scorePosition(tmp, 2);
        
        if (score > bestScore) {
            bestScore = score;
            bestCols = [c];
        } else if (score === bestScore) {
            bestCols.push(c);
        }
    }
    
    return bestCols[Math.floor(Math.random() * bestCols.length)];
}

function evaluateWindow(window, piece) {
    let score = 0;
    const oppPiece = piece === 1 ? 2 : 1;
    let pieceCount = 0;
    let emptyCount = 0;
    let oppCount = 0;
    
    for(let w of window) {
        if (w === piece) pieceCount++;
        else if (w === 0) emptyCount++;
        else if (w === oppPiece) oppCount++;
    }
    
    if (pieceCount === 4) score += 1000;
    else if (pieceCount === 3 && emptyCount === 1) score += 10;
    else if (pieceCount === 2 && emptyCount === 2) score += 2;
    
    if (oppCount === 3 && emptyCount === 1) score -= 8;
    
    return score;
}

function scorePosition(b, piece) {
    let score = 0;
    
    const centerArray = [];
    for (let r = 0; r < ROWS; r++) centerArray.push(b[r][3]);
    let centerCount = centerArray.filter(x => x === piece).length;
    score += centerCount * 5;
    
    for (let r = 0; r < ROWS; r++) {
        let rowArray = b[r];
        for (let c = 0; c <= COLS - 4; c++) {
            let window = rowArray.slice(c, c + 4);
            score += evaluateWindow(window, piece);
        }
    }
    
    for (let c = 0; c < COLS; c++) {
        let colArray = [];
        for (let r = 0; r < ROWS; r++) colArray.push(b[r][c]);
        for (let r = 0; r <= ROWS - 4; r++) {
            let window = colArray.slice(r, r + 4);
            score += evaluateWindow(window, piece);
        }
    }
    
    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            let window = [b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]];
            score += evaluateWindow(window, piece);
        }
    }
    
    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            let window = [b[r+3][c], b[r+2][c+1], b[r+1][c+2], b[r][c+3]];
            score += evaluateWindow(window, piece);
        }
    }
    
    return score;
}
