function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, tag => ( {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

class SudokuEngine {
    constructor() {
        this.size = 9;
    }

    createEmpty() {
        return Array.from({ length: this.size }, () => Array(this.size).fill(0));
    }

    isValid(grid, row, col, num) {
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        for (let i = 0; i < this.size; i++) {
            if (grid[row][i] === num) return false;
            if (grid[i][col] === num) return false;
            if (grid[boxRow + Math.floor(i / 3)][boxCol + i % 3] === num) return false;
        }
        return true;
    }

    isMoveValid(grid, row, col, num) {
        const temp = grid[row][col];
        grid[row][col] = 0;
        const valid = this.isValid(grid, row, col, num);
        grid[row][col] = temp;
        return valid;
    }

    solve(grid) {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (grid[row][col] === 0) {
                    const nums = this.shuffle([1,2,3,4,5,6,7,8,9]);
                    for (let num of nums) {
                        if (this.isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            if (this.solve(grid)) return true;
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    generate(difficulty) {
        const solution = this.createEmpty();
        for(let i = 0; i < 9; i+=3) {
            const nums = this.shuffle([1,2,3,4,5,6,7,8,9]);
            for(let r=0; r<3; r++) {
                for(let c=0; c<3; c++) {
                    solution[i+r][i+c] = nums[r*3+c];
                }
            }
        }
        this.solve(solution);

        const puzzle = solution.map(r => [...r]);
        let holes = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : 55;
        
        while (holes > 0) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (puzzle[row][col] !== 0) {
                puzzle[row][col] = 0;
                holes--;
            }
        }
        return { puzzle, solution };
    }
}

class GameTimer {
    constructor(displayEl, onZeroCallback) {
        this.displayEl = displayEl;
        this.onZeroCallback = onZeroCallback;
        this.interval = null;
        this.secondsLeft = 3600; 
    }

    start(initialSeconds = 3600) {
        this.stop();
        this.secondsLeft = initialSeconds;
        this.displayEl.classList.remove('danger');
        this.updateDisplay();
        this.interval = setInterval(() => this.tick(), 1000);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
    }

    tick() {
        this.secondsLeft--;
        this.updateDisplay();
        if (this.secondsLeft <= 0) {
            this.stop();
            this.displayEl.classList.add('danger');
            this.onZeroCallback();
        }
    }

    updateDisplay() {
        const m = Math.floor(this.secondsLeft / 60).toString().padStart(2, '0');
        const s = (this.secondsLeft % 60).toString().padStart(2, '0');
        this.displayEl.textContent = `${m}:${s}`;
    }

    getRemaining() { return this.secondsLeft; }
    getFormatted() { return this.displayEl.textContent; }
}

class ScoreManager {
    constructor(displayEl) {
        this.displayEl = displayEl;
        this.score = 0;
        this.multipliers = { easy: 1, medium: 1.5, hard: 2 };
    }

    reset(initialScore = 0) {
        this.score = initialScore;
        this.updateDisplay();
    }

    addPoints(isCorrect, difficulty) {
        const multi = this.multipliers[difficulty];
        const points = isCorrect ? (10 * multi) : (-5 * multi);
        this.score += points;
        if (this.score < 0) this.score = 0;
        this.updateDisplay();
    }

    addTimeBonus(secondsLeft, difficulty) {
        const multi = this.multipliers[difficulty];
        const bonus = Math.floor(secondsLeft * 0.5 * multi);
        this.score += bonus;
        this.updateDisplay();
    }

    updateDisplay() {
        this.displayEl.textContent = Math.floor(this.score);
    }
    
    getScore() { return Math.floor(this.score); }
}

class StorageManager {
    constructor() {
        this.highscoresKey = 'sudoku_highscores';
        this.saveGameStateKey = 'sudoku_save_state';
    }

    getScores() {
        const data = localStorage.getItem(this.highscoresKey);
        if (!data) return [];
        try {
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            return parsed;
        } catch (err) {
            localStorage.removeItem(this.highscoresKey);
            return [];
        }
    }

    saveScore(name, difficulty, score, timeStr) {
        const scores = this.getScores();
        const finalName = name && name.trim() ? name.trim() : 'Anônimo';
        scores.push({ name: finalName, difficulty, score, time: timeStr, date: Date.now() });
        scores.sort((a, b) => b.score - a.score);
        scores.splice(10);
        localStorage.setItem(this.highscoresKey, JSON.stringify(scores));
    }

    saveGameState(state) {
        localStorage.setItem(this.saveGameStateKey, JSON.stringify(state));
    }

    loadGameState() {
        const data = localStorage.getItem(this.saveGameStateKey);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch (err) {
            this.clearGameState();
            return null;
        }
    }

    clearGameState() {
        localStorage.removeItem(this.saveGameStateKey);
    }
}

class SudokuApp {
    constructor() {
        this.engine = new SudokuEngine();
        this.storage = new StorageManager();
        
        this.boardEl = document.getElementById('board');
        this.gameAreaEl = document.getElementById('game-area');
        this.diffSelect = document.getElementById('difficulty');
        this.modeBtn = document.getElementById('btn-mode');
        this.modeIcon = document.getElementById('mode-icon');
        this.modeText = document.getElementById('mode-text');
        this.playerNameInput = document.getElementById('player-name');
        
        this.cells = [];
        this.puzzle = [];
        this.solution = [];
        this.selectedCell = null;
        this.isPencilMode = false;
        this.currentDifficulty = 'medium';
        
        this.timer = new GameTimer(
            document.getElementById('timer'),
            () => this.handleGameOver()
        );
        this.scoreManager = new ScoreManager(document.getElementById('score'));

        this.bindEvents();
        this.initTheme();
        
        // Tenta carregar um jogo salvo, se não houver, inicia um novo
        this.startNewGame(false);

        // Auto-save a cada 2 segundos
        setInterval(() => this.saveCurrentState(), 2000);
    }

    bindEvents() {
        // Ao clicar em Novo Jogo, forçamos a limpeza do progresso (true)
        document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame(true));
        
        document.getElementById('btn-retry').addEventListener('click', () => {
            this.closeModals();
            this.startNewGame(true);
        });
        
        document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());
        document.getElementById('btn-scores').addEventListener('click', () => this.showRanking());
        document.getElementById('btn-close-ranking').addEventListener('click', () => this.closeModals());
        
        this.modeBtn.addEventListener('click', () => this.toggleMode());
        
        document.querySelectorAll('#numpad button').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleInput(parseInt(e.currentTarget.dataset.val)));
        });

        window.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            if (this.gameAreaEl.classList.contains('blurred')) return;

            if (e.code === 'Space' || (e.key && e.key.toLowerCase() === 'm')) {
                e.preventDefault();
                this.toggleMode();
                return;
            }
            
            if (e.key >= '1' && e.key <= '9') {
                this.handleInput(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                this.handleInput(0);
            } else if (e.key && e.key.startsWith && e.key.startsWith('Arrow')) {
                e.preventDefault();
                this.moveSelection(e.key);
            }
        });

        this.playerNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-save-score').click();
            }
        });

        document.getElementById('btn-save-score').addEventListener('click', () => {
            const name = this.playerNameInput.value;
            const diffName = this.diffSelect.options[this.diffSelect.selectedIndex].text;
            this.storage.saveScore(name, diffName, this.scoreManager.getScore(), this.timer.getFormatted());
            this.closeModals();
            this.showRanking();
        });
    }

    initTheme() {
        const saved = localStorage.getItem('sudoku_theme') || 'light';
        document.body.dataset.theme = saved;
        document.getElementById('btn-theme').textContent = saved === 'dark' ? '☀️' : '🌙';
    }

    toggleTheme() {
        const current = document.body.dataset.theme;
        const next = current === 'light' ? 'dark' : 'light';
        document.body.dataset.theme = next;
        document.getElementById('btn-theme').textContent = next === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('sudoku_theme', next);
    }

    toggleMode(forceValue = null) {
        this.isPencilMode = forceValue !== null ? forceValue : !this.isPencilMode;
        this.modeBtn.setAttribute('aria-pressed', String(this.isPencilMode));
        if (this.isPencilMode) {
            this.modeBtn.classList.add('active-pencil');
            this.modeIcon.textContent = '✏️';
            this.modeText.textContent = 'Lápis';
        } else {
            this.modeBtn.classList.remove('active-pencil');
            this.modeIcon.textContent = '✒️';
            this.modeText.textContent = 'Caneta';
        }
    }

    saveCurrentState() {
        if (!this.puzzle || this.puzzle.length === 0) return;
        
        const gridState = this.cells.map(row => 
            row.map(cell => ({
                val: cell.val,
                isFixed: cell.isFixed,
                isScored: cell.isScored,
                drafts: Array.from(cell.drafts)
            }))
        );

        const state = {
            difficulty: this.currentDifficulty,
            puzzle: this.puzzle,
            solution: this.solution,
            timer: this.timer.getRemaining(),
            score: this.scoreManager.getScore(),
            isPencilMode: this.isPencilMode,
            grid: gridState
        };
        
        this.storage.saveGameState(state);
    }

    startNewGame(forceNew = false) {
        const savedState = this.storage.loadGameState();

        if (!forceNew && savedState) {
            // Carrega estado salvo
            this.currentDifficulty = savedState.difficulty;
            this.diffSelect.value = this.currentDifficulty;
            this.puzzle = savedState.puzzle;
            this.solution = savedState.solution;
            this.toggleMode(savedState.isPencilMode);
            
            this.selectedCell = null;
            this.gameAreaEl.classList.remove('blurred');
            
            this.scoreManager.reset(savedState.score);
            this.timer.start(savedState.timer);
            
            this.renderBoard(savedState.grid);
        } else {
            // Inicia do zero
            this.storage.clearGameState();
            this.currentDifficulty = this.diffSelect.value;
            const data = this.engine.generate(this.currentDifficulty);
            this.puzzle = data.puzzle;
            this.solution = data.solution;
            this.toggleMode(false);
            
            this.selectedCell = null;
            this.gameAreaEl.classList.remove('blurred');
            
            this.scoreManager.reset(0);
            this.timer.start(3600);
            
            this.renderBoard();
        }
        
        this.updateNumpadState();
    }

    renderBoard(savedGrid = null) {
        this.boardEl.innerHTML = '';
        this.cells = [];

        for (let r = 0; r < 9; r++) {
            const rowCells = [];
            for (let c = 0; c < 9; c++) {
                const cellEl = document.createElement('div');
                cellEl.className = 'cell';
                cellEl.setAttribute('role', 'gridcell');
                cellEl.tabIndex = 0;
                cellEl.dataset.row = String(r);
                cellEl.dataset.col = String(c);
                cellEl.setAttribute('aria-label', `Linha ${r+1} Coluna ${c+1}`);
                
                cellEl.addEventListener('focus', () => this.selectCell(r, c));
                cellEl.addEventListener('click', () => this.selectCell(r, c));

                let val = this.puzzle[r][c];
                let isFixed = val !== 0;
                let isScored = false;
                let drafts = new Set();

                // Se houver um save, sobrescreve os valores padrão
                if (savedGrid) {
                    val = savedGrid[r][c].val;
                    isFixed = savedGrid[r][c].isFixed;
                    isScored = savedGrid[r][c].isScored;
                    drafts = new Set(savedGrid[r][c].drafts);
                }

                const cellData = { val, isFixed, isScored, drafts, row: r, col: c, el: cellEl };

                if (cellData.isFixed) cellEl.classList.add('fixed');

                this.boardEl.appendChild(cellEl);
                rowCells.push(cellData);
            }
            this.cells.push(rowCells);
        }
        this.updateBoardUI();
    }

    selectCell(r, c) {
        if (this.selectedCell) {
            const prev = this.cells[this.selectedCell.r][this.selectedCell.c].el;
            prev.classList.remove('selected');
            prev.setAttribute('aria-selected', 'false');
        }
        this.selectedCell = { r, c };
        const el = this.cells[r][c].el;
        el.classList.add('selected');
        el.setAttribute('aria-selected', 'true');
        try { el.focus(); } catch (e) {}
        this.highlightRelatives(r, c);
        this.updateNumpadState();
    }

    highlightRelatives(r, c) {
        this.cells.forEach(row => row.forEach(cell => cell.el.classList.remove('highlight')));
        
        const boxR = Math.floor(r / 3) * 3;
        const boxC = Math.floor(c / 3) * 3;

        for(let i=0; i<9; i++) {
            this.cells[r][i].el.classList.add('highlight');
            this.cells[i][c].el.classList.add('highlight');
            this.cells[boxR + Math.floor(i/3)][boxC + i%3].el.classList.add('highlight');
        }
    }

    moveSelection(key) {
        if (!this.selectedCell) {
            this.selectCell(0,0);
            return;
        }
        let { r, c } = this.selectedCell;
        if (key === 'ArrowUp') r = Math.max(0, r - 1);
        if (key === 'ArrowDown') r = Math.min(8, r + 1);
        if (key === 'ArrowLeft') c = Math.max(0, c - 1);
        if (key === 'ArrowRight') c = Math.min(8, c + 1);
        this.selectCell(r, c);
    }

    isNumberBlocked(r, c, num) {
        if (num === 0) return false;
        const boxR = Math.floor(r / 3) * 3;
        const boxC = Math.floor(c / 3) * 3;
        
        for (let i = 0; i < 9; i++) {
            if (i !== c && this.cells[r][i].val === num) return true;
            if (i !== r && this.cells[i][c].val === num) return true;
            
            const br = boxR + Math.floor(i / 3);
            const bc = boxC + (i % 3);
            if ((br !== r || bc !== c) && this.cells[br][bc].val === num) return true;
        }
        return false;
    }

    updateNumpadState() {
        if (!this.selectedCell) {
            document.querySelectorAll('#numpad button:not(.btn-erase)').forEach(btn => btn.disabled = false);
            return;
        }
        const { r, c } = this.selectedCell;
        document.querySelectorAll('#numpad button:not(.btn-erase)').forEach(btn => {
            const val = parseInt(btn.dataset.val);
            btn.disabled = this.isNumberBlocked(r, c, val);
        });
    }

    eraseDraftsInHouse(row, col, num) {
        const boxR = Math.floor(row / 3) * 3;
        const boxC = Math.floor(col / 3) * 3;
        
        for (let i = 0; i < 9; i++) {
            if (this.cells[row][i].drafts.has(num)) this.cells[row][i].drafts.delete(num);
            if (this.cells[i][col].drafts.has(num)) this.cells[i][col].drafts.delete(num);
            
            const br = boxR + Math.floor(i / 3);
            const bc = boxC + (i % 3);
            if (this.cells[br][bc].drafts.has(num)) this.cells[br][bc].drafts.delete(num);
        }
    }

    handleInput(num) {
        if (!this.selectedCell) return;
        const { r, c } = this.selectedCell;
        const cell = this.cells[r][c];

        if (cell.isFixed) return;

        if (num === 0) {
            cell.val = 0;
            cell.drafts.clear();
            cell.el.classList.remove('error');
        } else {
            if (this.isNumberBlocked(r, c, num)) return;

            if (this.isPencilMode) {
                cell.val = 0;
                if (cell.drafts.has(num)) cell.drafts.delete(num);
                else cell.drafts.add(num);
            } else {
                cell.val = num;
                cell.drafts.clear(); 
                
                // Lógica de Pontuação Justa e Anti-farming mantida do seu código final
                if (num === this.solution[r][c]) {
                    if (!cell.isScored) {
                        this.scoreManager.addPoints(true, this.currentDifficulty);
                        cell.isScored = true;
                    }
                } else {
                    this.scoreManager.addPoints(false, this.currentDifficulty);
                }
                
                this.eraseDraftsInHouse(r, c, num);
            }
        }

        this.updateBoardUI();
        this.saveCurrentState(); // Salva na hora que o usuário joga
        
        if (num !== 0 && !this.isPencilMode) {
            this.checkWinCondition();
        }
    }

    checkCompletedAreas() {
        this.cells.forEach(row => row.forEach(c => c.el.classList.remove('completed')));

        const isGroupComplete = (group) => {
            const vals = group.map(c => c.val).filter(v => v !== 0);
            const hasErrors = group.some(c => c.el.classList.contains('error'));
            return vals.length === 9 && new Set(vals).size === 9 && !hasErrors;
        };

        for (let i = 0; i < 9; i++) {
            const row = this.cells[i];
            if (isGroupComplete(row)) row.forEach(c => c.el.classList.add('completed'));

            const col = this.cells.map(r => r[i]);
            if (isGroupComplete(col)) col.forEach(c => c.el.classList.add('completed'));
        }

        for (let br = 0; br < 3; br++) {
            for (let bc = 0; bc < 3; bc++) {
                const box = [];
                for (let i = 0; i < 9; i++) {
                    box.push(this.cells[br * 3 + Math.floor(i / 3)][bc * 3 + (i % 3)]);
                }
                if (isGroupComplete(box)) box.forEach(c => c.el.classList.add('completed'));
            }
        }
    }

    updateBoardUI() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = this.cells[r][c];
                cell.el.innerHTML = '';

                if (cell.val !== 0) {
                    cell.el.textContent = cell.val;
                    if (!cell.isFixed) {
                        // Verificação de erro baseada no gabarito garantida
                        if (cell.val !== this.solution[r][c]) {
                            cell.el.classList.add('error');
                        } else {
                            cell.el.classList.remove('error');
                        }
                    }
                } else {
                    cell.el.classList.remove('error');
                    if (cell.drafts.size > 0) {
                        const draftGrid = document.createElement('div');
                        draftGrid.className = 'draft-grid';
                        for (let i = 1; i <= 9; i++) {
                            const span = document.createElement('span');
                            span.className = 'draft-item';
                            if (cell.drafts.has(i)) span.textContent = i;
                            draftGrid.appendChild(span);
                        }
                        cell.el.appendChild(draftGrid);
                    }
                }
            }
        }

        this.checkCompletedAreas();
        this.updateNumpadState();
    }

    checkWinCondition() {
        let complete = true;
        let hasErrors = false;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = this.cells[r][c];
                if (cell.val === 0) complete = false;
                if (cell.el.classList.contains('error')) hasErrors = true;
            }
        }

        if (complete && !hasErrors) {
            this.handleVictory();
        }
    }

    handleGameOver() {
        this.storage.clearGameState(); // Limpa o save se perdeu
        this.gameAreaEl.classList.add('blurred');
        document.getElementById('modal-gameover').classList.add('active');
    }

    handleVictory() {
        this.timer.stop();
        this.storage.clearGameState(); // Limpa o save se ganhou
        this.gameAreaEl.classList.add('blurred');
        this.scoreManager.addTimeBonus(this.timer.getRemaining(), this.currentDifficulty);
        
        document.getElementById('final-score').textContent = this.scoreManager.getScore();
        document.getElementById('modal-victory').classList.add('active');
        
        setTimeout(() => {
            this.playerNameInput.focus();
        }, 100);
    }

    showRanking() {
        this.closeModals();
        const tbody = document.getElementById('ranking-body');
        tbody.innerHTML = '';
        
        const scores = this.storage.getScores();
        if(scores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nenhuma pontuação salva.</td></tr>';
        } else {
            scores.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHTML(s.name)}</td>
                    <td>${escapeHTML(s.difficulty)}</td>
                    <td><strong>${escapeHTML(s.score)}</strong></td>
                    <td>${escapeHTML(s.time)}</td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        document.getElementById('modal-ranking').classList.add('active');
    }

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new SudokuApp();
});
