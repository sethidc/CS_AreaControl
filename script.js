// --- SECTION 1: GAME CONFIGURATION & CONSTANTS ---
// These are the core settings for the game. Changing these values will alter the game's appearance and feel.
const DOT_COUNT = 6;         // Number of dots per row/column. 6 means a 5x5 grid of boxes.
const DOT_RADIUS = 7;        // The size of each dot on the grid.
const LINE_WIDTH = 6;        // How thick the player lines are.
const CLICK_THRESHOLD = 15;  // How close the mouse needs to be to a line to select it (in pixels).
const PLAYER_COLORS = {      // Defines the colors for each player.
    1: '#3498db', // Player 1
    2: '#e74c3c'  // Player 2
};
const PLAYER_INITIALS = {    // The initials displayed inside a completed box.
    1: 'P1',
    2: 'P2'
};

// --- SECTION 2: DOM ELEMENT REFERENCES ---
// We get references to all the HTML elements we need to interact with. This is more efficient than searching for them every time.
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const player1Info = document.getElementById('player1-info');
const player2Info = document.getElementById('player2-info');
const turnIndicator = document.getElementById('turn-indicator');
const restartButton = document.getElementById('restart-button');
const questionModal = document.getElementById('question-modal');
const modalHeader = document.getElementById('modal-header');
const questionText = document.getElementById('question-text');
const answerOptionsContainer = document.getElementById('answer-options');
const feedbackText = document.getElementById('feedback-text');
const submitAnswerButton = document.getElementById('submit-answer-button');
const winnerMessageArea = document.getElementById('winner-message-area');

// --- SECTION 3: GAME STATE VARIABLES ---
// These variables store the current state of the game, like scores, who the current player is, and line/box data.
let currentPlayer;
let scores;
let hLines; // 2D array to store horizontal lines
let vLines; // 2D array to store vertical lines
let boxes;  // 2D array to store completed boxes
let cellWidth, cellHeight;
let padding;
let gameEnded;
let selectedLineData; // Stores the line a player clicked on before answering a question
let currentQuestionObj; // The current question being displayed
let availableQuestions = []; // A copy of the questions that we can safely remove items from
let hoveredLine = null; // Stores data about the line the mouse is currently over

// --- SECTION 4: INITIALIZATION ---
/**
 * Sets up the game for a new round. Resets scores, player turn, and all game data arrays.
 */
function initGame() {
    currentPlayer = 1;
    scores = { 1: 0, 2: 0 };
    gameEnded = false;
    selectedLineData = null;
    currentQuestionObj = null;
    hoveredLine = null;
    winnerMessageArea.textContent = '';
    winnerMessageArea.className = '';

    // Create empty 2D arrays to track the state of horizontal lines, vertical lines, and boxes. '0' means unclaimed.
    hLines = Array(DOT_COUNT).fill(null).map(() => Array(DOT_COUNT - 1).fill(0));
    vLines = Array(DOT_COUNT - 1).fill(null).map(() => Array(DOT_COUNT).fill(0));
    boxes = Array(DOT_COUNT - 1).fill(null).map(() => Array(DOT_COUNT - 1).fill(0));
    
    // Create a shuffled copy of the questions array to avoid repeating questions too soon.
    availableQuestions = [...questions].sort(() => 0.5 - Math.random());

    resizeCanvas();
    updateScoreboard();
}

/**
 * Adjusts the canvas size to fit its container and recalculates drawing dimensions.
 */
function resizeCanvas() {
    const containerWidth = canvas.parentElement.clientWidth;
    canvas.width = containerWidth;
    canvas.height = containerWidth;

    padding = canvas.width * 0.1;
    const drawingWidth = canvas.width - 2 * padding;
    const drawingHeight = canvas.height - 2 * padding;
    
    cellWidth = drawingWidth / (DOT_COUNT - 1);
    cellHeight = drawingHeight / (DOT_COUNT - 1);

    drawGame(); // Redraw the game with the new dimensions.
}

// --- SECTION 5: DRAWING FUNCTIONS ---
// These functions are responsible for rendering everything on the canvas.

/**
 * Main drawing function. Clears the canvas and calls specific drawing functions in order.
 */
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGridLines();
    drawHoverHighlight();
    drawBoxes();
    drawLines();
    drawDots();
}

/**
 * Draws the faint background grid lines.
 */
function drawGridLines() {
    ctx.strokeStyle = 'var(--grid-line-color)';
    ctx.lineWidth = 2;

    // Horizontal grid lines
    for (let r = 0; r < DOT_COUNT; r++) {
        for (let c = 0; c < DOT_COUNT - 1; c++) {
            const x1 = padding + c * cellWidth;
            const y1 = padding + r * cellHeight;
            const x2 = padding + (c + 1) * cellWidth;
            drawSingleLine(x1, y1, x2, y1, 'var(--grid-line-color)');
        }
    }
    // Vertical grid lines
    for (let r = 0; r < DOT_COUNT - 1; r++) {
        for (let c = 0; c < DOT_COUNT; c++) {
            const x1 = padding + c * cellWidth;
            const y1 = padding + r * cellHeight;
            const y2 = padding + (r + 1) * cellHeight;
            drawSingleLine(x1, y1, x1, y2, 'var(--grid-line-color)');
        }
    }
}

/**
 * Draws a semi-transparent highlight over the line the user is hovering on.
 */
function drawHoverHighlight() {
    if (!hoveredLine || gameEnded) return;

    const { type, r, c } = hoveredLine;
    let x1, y1, x2, y2;

    if (type === 'h') {
        if (hLines[r][c]) return; // Don't highlight an already drawn line
        x1 = padding + c * cellWidth;
        y1 = padding + r * cellHeight;
        x2 = padding + (c + 1) * cellWidth;
        y2 = y1;
    } else { // type === 'v'
        if (vLines[r][c]) return; // Don't highlight an already drawn line
        x1 = padding + c * cellWidth;
        y1 = padding + r * cellHeight;
        x2 = x1;
        y2 = padding + (r + 1) * cellHeight;
    }
    drawSingleLine(x1, y1, x2, y2, hexToRgba(PLAYER_COLORS[currentPlayer], 0.5));
}

/**
 * Draws the dots on the grid.
 */
function drawDots() {
    ctx.fillStyle = 'var(--dot-color)';
    for (let r = 0; r < DOT_COUNT; r++) {
        for (let c = 0; c < DOT_COUNT; c++) {
            const x = padding + c * cellWidth;
            const y = padding + r * cellHeight;
            ctx.beginPath();
            ctx.arc(x, y, DOT_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

/**
 * Draws the lines that have been claimed by players.
 */
function drawLines() {
    ctx.lineCap = 'round'; // Makes line ends rounded

    // Draw horizontal lines
    for (let r = 0; r < DOT_COUNT; r++) {
        for (let c = 0; c < DOT_COUNT - 1; c++) {
            if (hLines[r][c]) {
                const color = PLAYER_COLORS[hLines[r][c]];
                const x1 = padding + c * cellWidth;
                const y1 = padding + r * cellHeight;
                const x2 = padding + (c + 1) * cellWidth;
                drawSingleLine(x1, y1, x2, y1, color);
            }
        }
    }

    // Draw vertical lines
    for (let r = 0; r < DOT_COUNT - 1; r++) {
        for (let c = 0; c < DOT_COUNT; c++) {
            if (vLines[r][c]) {
                const color = PLAYER_COLORS[vLines[r][c]];
                const x1 = padding + c * cellWidth;
                const y1 = padding + r * cellHeight;
                const x2 = x1;
                const y2 = padding + (r + 1) * cellHeight;
                drawSingleLine(x1, y1, x1, y2, color);
            }
        }
    }
}

/**
 * A helper function to draw a single line on the canvas.
 */
function drawSingleLine(x1, y1, x2, y2, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    // Use different line widths for the grid vs. player lines
    ctx.lineWidth = (color === 'var(--grid-line-color)') ? 2 : LINE_WIDTH;
    ctx.stroke();
}

/**
 * Fills in completed boxes with the player's color and initial.
 */
function drawBoxes() {
    for (let r = 0; r < DOT_COUNT - 1; r++) {
        for (let c = 0; c < DOT_COUNT - 1; c++) {
            if (boxes[r][c]) {
                const owner = boxes[r][c];
                const x = padding + c * cellWidth;
                const y = padding + r * cellHeight;
                
                // Fill the box with a transparent color
                ctx.fillStyle = hexToRgba(PLAYER_COLORS[owner], 0.4);
                ctx.fillRect(x + LINE_WIDTH/2, y + LINE_WIDTH/2, cellWidth - LINE_WIDTH, cellHeight - LINE_WIDTH);

                // Draw the player's initial in the center of the box
                ctx.fillStyle = PLAYER_COLORS[owner];
                ctx.font = `bold ${Math.min(cellWidth, cellHeight) * 0.45}px 'Poppins', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(PLAYER_INITIALS[owner], x + cellWidth / 2, y + cellHeight / 2);
            }
        }
    }
}

// --- SECTION 6: GAME LOGIC ---

/**
 * Determines which line is being hovered over by the mouse.
 * @param {MouseEvent} event - The mouse event from the event listener.
 * @returns {object|null} An object with line data {type, r, c} or null if no line is hovered.
 */
function getHoveredLine(event) {
    if (gameEnded || questionModal.style.display === 'flex') return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX - padding;
    const mouseY = (event.clientY - rect.top) * scaleY - padding;

    // Check for hover over horizontal lines
    for (let r = 0; r < DOT_COUNT; r++) {
        for (let c = 0; c < DOT_COUNT - 1; c++) {
            if (hLines[r][c] === 0 && Math.abs(mouseY - r * cellHeight) < CLICK_THRESHOLD && mouseX > c * cellWidth && mouseX < (c + 1) * cellWidth) {
                return { type: 'h', r, c };
            }
        }
    }

    // Check for hover over vertical lines
    for (let r = 0; r < DOT_COUNT - 1; r++) {
        for (let c = 0; c < DOT_COUNT; c++) {
            if (vLines[r][c] === 0 && Math.abs(mouseX - c * cellWidth) < CLICK_THRESHOLD && mouseY > r * cellHeight && mouseY < (r + 1) * cellHeight) {
                return { type: 'v', r, c };
            }
        }
    }
    return null; // No line was hovered
}

/**
 * Handles clicks on the canvas. If a valid line is clicked, it shows the question modal.
 */
function handleCanvasClick() {
    if (gameEnded || !hoveredLine) return;
    selectedLineData = hoveredLine; // Store the clicked line
    showQuestionModal();
}

/**
 * Handles mouse movement over the canvas to update the hover highlight.
 */
function handleCanvasMouseMove(event) {
    const line = getHoveredLine(event);
    // Redraw only if the hovered line changes to improve performance
    if ((line && (!hoveredLine || line.type !== hoveredLine.type || line.r !== hoveredLine.r || line.c !== hoveredLine.c)) || (!line && hoveredLine)) {
        hoveredLine = line;
        drawGame();
    }
}

/**
 * Displays the question modal with a new question.
 */
function showQuestionModal() {
    // Refill the question pool if it runs out
    if (availableQuestions.length === 0) {
        availableQuestions = [...questions].sort(() => 0.5 - Math.random());
    }
    currentQuestionObj = availableQuestions.pop();

    modalHeader.textContent = `Player ${currentPlayer}'s Challenge!`;
    modalHeader.style.color = PLAYER_COLORS[currentPlayer];
    
    questionText.textContent = currentQuestionObj.text;
    answerOptionsContainer.innerHTML = ''; // Clear old answer buttons
    feedbackText.textContent = '';
    feedbackText.className = '';

    const isTrueFalse = currentQuestionObj.options.length === 2 && currentQuestionObj.options.includes("True");
    answerOptionsContainer.classList.toggle('true-false', isTrueFalse);

    // Create a button for each answer option
    currentQuestionObj.options.forEach((option, index) => {
        const button = document.createElement('button');
        
        const optionLetterSpan = document.createElement('span');
        optionLetterSpan.classList.add('answer-option-letter');
        if (!isTrueFalse && currentQuestionObj.options.length > 1) {
            optionLetterSpan.textContent = String.fromCharCode(65 + index); // A, B, C, D
        }
        
        const optionTextSpan = document.createElement('span');
        optionTextSpan.classList.add('answer-option-text');
        optionTextSpan.textContent = option;

        button.appendChild(optionLetterSpan);
        button.appendChild(optionTextSpan);
        
        button.onclick = () => {
            answerOptionsContainer.querySelectorAll('button').forEach(btn => btn.disabled = true);
            checkAnswer(option, button);
        };
        answerOptionsContainer.appendChild(button);
    });
    
    questionModal.style.display = 'flex';
    submitAnswerButton.style.display = 'none'; // Hide the continue button initially
}

/**
 * Checks if the selected answer is correct and handles the consequences.
 * @param {string} selectedAnswer - The text of the answer the user clicked.
 * @param {HTMLElement} clickedButton - The button element that was clicked.
 */
function checkAnswer(selectedAnswer, clickedButton) {
    const isCorrect = (selectedAnswer === currentQuestionObj.correctAnswer);

    // Provide visual feedback for correct/incorrect answers
    if (isCorrect) {
        clickedButton.classList.add('correct');
        feedbackText.textContent = 'Correct!';
        feedbackText.className = 'feedback-correct';
    } else {
        clickedButton.classList.add('incorrect');
        feedbackText.textContent = `Incorrect!`;
        feedbackText.className = 'feedback-incorrect';
        
        // Highlight the correct answer for the user to learn from
        answerOptionsContainer.querySelectorAll('button').forEach(btn => {
            const btnTextContent = btn.querySelector('.answer-option-text')?.textContent || btn.textContent;
            if (btnTextContent === currentQuestionObj.correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    // Set a timeout to allow the player to see the feedback before the game continues.
    setTimeout(() => {
        if (isCorrect) {
            // If correct, claim the line for the current player
            if (selectedLineData.type === 'h') {
                hLines[selectedLineData.r][selectedLineData.c] = currentPlayer;
            } else {
                vLines[selectedLineData.r][selectedLineData.c] = currentPlayer;
            }
            
            const boxesMade = checkForNewBoxes();
            if (boxesMade > 0) {
                scores[currentPlayer] += boxesMade;
                // Player scored, so they get to go again. We don't switch players.
            } else {
                switchPlayer(); // No box was made, switch to the next player.
            }
        } else {
            // If incorrect, it's simply the next player's turn.
            switchPlayer();
            if (feedbackText.textContent === "Incorrect!") {
               feedbackText.textContent = `Incorrect. The correct answer was: ${currentQuestionObj.correctAnswer}`;
            }
        }
        
        hoveredLine = null;
        drawGame();
        updateScoreboard();
        checkGameEnd();

        submitAnswerButton.style.display = 'block'; // Show the continue button
    }, isCorrect ? 1200 : 2200); // Longer delay for incorrect answers
}

/**
 * Handles the click of the 'Continue' button in the modal.
 */
submitAnswerButton.onclick = () => {
    questionModal.style.display = 'none';
    selectedLineData = null;
    currentQuestionObj = null;
};

/**
 * Checks the entire grid for any new boxes that have been completed.
 * @returns {number} The number of new boxes completed in this turn.
 */
function checkForNewBoxes() {
    let newBoxesCount = 0;
    for (let r = 0; r < DOT_COUNT - 1; r++) {
        for (let c = 0; c < DOT_COUNT - 1; c++) {
            if (boxes[r][c] === 0) { // Only check unclaimed boxes
                const topLine = hLines[r][c];
                const bottomLine = hLines[r + 1][c];
                const leftLine = vLines[r][c];
                const rightLine = vLines[r][c + 1];

                // If all four sides are claimed, a box is made
                if (topLine && bottomLine && leftLine && rightLine) {
                    boxes[r][c] = currentPlayer;
                    newBoxesCount++;
                }
            }
        }
    }
    return newBoxesCount;
}

/**
 * Switches the current player.
 */
function switchPlayer() {
    currentPlayer = (currentPlayer === 1) ? 2 : 1;
}

/**
 * Updates the scoreboard with the current scores and turn indicator.
 */
function updateScoreboard() {
    player1Info.textContent = `Player 1: ${scores[1]}`;
    player2Info.textContent = `Player 2: ${scores[2]}`;
    
    if (!gameEnded) {
        turnIndicator.textContent = `Player ${currentPlayer}'s Turn`;
        // Add/remove 'active' class to highlight the current player
        player1Info.classList.toggle('active', currentPlayer === 1);
        player2Info.classList.toggle('active', currentPlayer === 2);
    } else {
        player1Info.classList.remove('active');
        player2Info.classList.remove('active');
    }
}

/**
 * Checks if all boxes have been claimed to determine if the game is over.
 */
function checkGameEnd() {
    const totalBoxes = (DOT_COUNT - 1) * (DOT_COUNT - 1);
    const claimedBoxes = scores[1] + scores[2];

    if (claimedBoxes === totalBoxes) {
        gameEnded = true;
        let winnerText;
        if (scores[1] > scores[2]) {
            winnerText = "Player 1 Wins!";
        } else if (scores[2] > scores[1]) {
            winnerText = "Player 2 Wins!";
        } else {
            winnerText = "It's a Draw!";
        }
        winnerMessageArea.textContent = winnerText;
        winnerMessageArea.className = 'winner-message';
        turnIndicator.textContent = `Game Over! ${winnerText}`;
    }
}

// --- SECTION 7: UTILITY FUNCTIONS ---

/**
 * Converts a hex color code to an RGBA format.
 * @param {string} hex - The hex color (e.g., '#3498db').
 * @param {number} alpha - The desired opacity (0 to 1).
 * @returns {string} The RGBA color string.
 */
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- SECTION 8: EVENT LISTENERS ---
// This is where we connect our functions to user actions.

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', handleCanvasMouseMove);
canvas.addEventListener('mouseout', () => {
    // When the mouse leaves the canvas, clear the hover state
    if (hoveredLine) {
        hoveredLine = null;
        drawGame();
    }
});
restartButton.addEventListener('click', initGame);
window.addEventListener('resize', resizeCanvas); // Redraw the game if the window size changes

// --- START GAME ---
// The initial call to start the game when the page loads.
initGame();
