class SudokuGenerator {
  constructor(size) {
    this.size = size;
    this.boxRows = size === 4 ? 2 : size === 6 ? 2 : 3;
    this.boxCols = size === 4 ? 2 : size === 6 ? 3 : 3;
    this.symbols = Array.from({ length: size }, (_, i) => i + 1);
  }

  generatePuzzle() {
    const solution = this.createSolvedBoard();
    const puzzle = solution.map((r) => [...r]);

    const clues = this.getClueCount();
    const cellsToRemove = this.size * this.size - clues;
    const positions = this.shuffle(
      Array.from({ length: this.size * this.size }, (_, i) => i)
    );

    let removed = 0;
    let attempts = 0;

    while (removed < cellsToRemove && attempts < positions.length * 3) {
      const pos = positions[attempts % positions.length];
      const row = Math.floor(pos / this.size);
      const col = pos % this.size;
      const backup = puzzle[row][col];
      if (backup === 0) {
        attempts++;
        continue;
      }

      puzzle[row][col] = 0;
      const copy = puzzle.map((r) => [...r]);
      const count = this.countSolutions(copy, 2);

      if (count !== 1) {
        puzzle[row][col] = backup;
      } else {
        removed++;
      }
      attempts++;
    }

    return { puzzle, solution };
  }

  getClueCount() {
    if (this.size === 4) return 8;
    if (this.size === 6) return 18;
    return 34;
  }

  createSolvedBoard() {
    const board = Array.from({ length: this.size }, () =>
      Array(this.size).fill(0)
    );
    this.fillBoard(board);
    return board;
  }

  fillBoard(board) {
    const empty = this.findEmpty(board);
    if (!empty) return true;

    const [row, col] = empty;
    const nums = this.shuffle([...this.symbols]);
    for (const num of nums) {
      if (this.isValid(board, row, col, num)) {
        board[row][col] = num;
        if (this.fillBoard(board)) return true;
        board[row][col] = 0;
      }
    }

    return false;
  }

  countSolutions(board, limit = 2) {
    const empty = this.findEmpty(board);
    if (!empty) return 1;

    const [row, col] = empty;
    let count = 0;

    for (const num of this.symbols) {
      if (this.isValid(board, row, col, num)) {
        board[row][col] = num;
        count += this.countSolutions(board, limit);
        if (count >= limit) {
          board[row][col] = 0;
          return count;
        }
        board[row][col] = 0;
      }
    }

    return count;
  }

  findEmpty(board) {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (board[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  isValid(board, row, col, num) {
    for (let i = 0; i < this.size; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }

    const startRow = Math.floor(row / this.boxRows) * this.boxRows;
    const startCol = Math.floor(col / this.boxCols) * this.boxCols;

    for (let r = 0; r < this.boxRows; r++) {
      for (let c = 0; c < this.boxCols; c++) {
        if (board[startRow + r][startCol + c] === num) return false;
      }
    }
    return true;
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

class SudokuGame {
  constructor(size) {
    this.setSize(size);
    this.elapsed = 0;
    this.timerId = null;
    this.notesMode = false;
    this.selected = null;
  }

  setSize(size) {
    this.size = Number(size);
    this.boxRows = this.size === 4 ? 2 : this.size === 6 ? 2 : 3;
    this.boxCols = this.size === 4 ? 2 : this.size === 6 ? 3 : 3;
  }

  startNew(size) {
    this.setSize(size);
    const generator = new SudokuGenerator(this.size);
    const { puzzle, solution } = generator.generatePuzzle();

    this.puzzle = puzzle;
    this.solution = solution;
    this.userGrid = puzzle.map((row) => [...row]);
    this.initialGrid = puzzle.map((row) => [...row]);
    this.notes = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => new Set())
    );

    this.selected = null;
    this.notesMode = false;
    this.resetTimer();
    this.startTimer();
  }

  restart() {
    this.userGrid = this.initialGrid.map((row) => [...row]);
    this.notes = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => new Set())
    );
    this.selected = null;
    this.notesMode = false;
    this.resetTimer();
    this.startTimer();
  }

  isFixed(r, c) {
    return this.initialGrid[r][c] !== 0;
  }

  inputNumber(num) {
    if (!this.selected) return;
    const { row, col } = this.selected;
    if (this.isFixed(row, col)) return;

    if (this.notesMode) {
      const notes = this.notes[row][col];
      if (notes.has(num)) notes.delete(num);
      else notes.add(num);
      return;
    }

    this.userGrid[row][col] = num;
    this.notes[row][col].clear();
  }

  clearSelected() {
    if (!this.selected) return;
    const { row, col } = this.selected;
    if (this.isFixed(row, col)) return;
    this.userGrid[row][col] = 0;
    this.notes[row][col].clear();
  }

  isCorrect(r, c) {
    if (this.userGrid[r][c] === 0) return true;
    return this.userGrid[r][c] === this.solution[r][c];
  }

  isComplete() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.userGrid[r][c] !== this.solution[r][c]) return false;
      }
    }
    return true;
  }

  startTimer() {
    this.stopTimer();
    this.timerId = setInterval(() => {
      this.elapsed += 1;
      document.dispatchEvent(new CustomEvent("timerTick", { detail: this.elapsed }));
    }, 1000);
  }

  stopTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
  }

  resetTimer() {
    this.elapsed = 0;
    document.dispatchEvent(new CustomEvent("timerTick", { detail: this.elapsed }));
  }
}

class SudokuUI {
  constructor() {
    this.boardEl = document.getElementById("board");
    this.numpadEl = document.getElementById("numpad");
    this.timerEl = document.getElementById("timer");
    this.statusEl = document.getElementById("status");
    this.notesBtn = document.getElementById("notes-btn");
    this.sizeSelect = document.getElementById("size-select");
    this.winModal = document.getElementById("win-modal");
    this.winMessage = document.getElementById("win-message");
    this.themeBtn = document.getElementById("theme-toggle");
    this.confettiCanvas = document.getElementById("confetti-canvas");

    this.game = new SudokuGame(Number(this.sizeSelect.value));

    this.bindEvents();
    this.game.startNew(Number(this.sizeSelect.value));
    this.renderAll();
    this.buildNumpad();
    this.applyTheme(localStorage.getItem("sudoku_theme") || "system");
  }

  bindEvents() {
    document.getElementById("new-game-btn").addEventListener("click", () => {
      this.winModal.classList.add("hidden");
      this.game.startNew(Number(this.sizeSelect.value));
      this.buildNumpad();
      this.renderAll();
      this.pulseStatus("New puzzle generated!");
    });

    document.getElementById("restart-btn").addEventListener("click", () => {
      this.game.restart();
      this.renderAll();
      this.pulseStatus("Puzzle restarted.");
    });

    document.getElementById("clear-btn").addEventListener("click", () => {
      this.game.clearSelected();
      this.renderBoard();
      this.vibrateFlash();
    });

    this.notesBtn.addEventListener("click", () => {
      this.game.notesMode = !this.game.notesMode;
      this.notesBtn.textContent = `Notes: ${this.game.notesMode ? "On" : "Off"}`;
      this.notesBtn.setAttribute("aria-pressed", String(this.game.notesMode));
      this.notesBtn.classList.toggle("primary", this.game.notesMode);
    });

    document.getElementById("play-again-btn").addEventListener("click", () => {
      this.winModal.classList.add("hidden");
      this.game.startNew(Number(this.sizeSelect.value));
      this.buildNumpad();
      this.renderAll();
    });

    this.themeBtn.addEventListener("click", () => {
      const html = document.documentElement;
      const current = html.dataset.theme || "system";
      const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
      this.applyTheme(next);
      localStorage.setItem("sudoku_theme", next);
    });

    document.addEventListener("timerTick", (e) => {
      this.timerEl.textContent = this.formatTime(e.detail);
    });
  }

  applyTheme(mode) {
    const html = document.documentElement;
    html.dataset.theme = mode;
    if (mode === "light") {
      html.style.colorScheme = "light";
      this.themeBtn.textContent = "☀️";
    } else if (mode === "dark") {
      html.style.colorScheme = "dark";
      this.themeBtn.textContent = "🌙";
    } else {
      html.style.colorScheme = "light dark";
      this.themeBtn.textContent = "🌓";
    }
  }

  renderAll() {
    this.renderBoard();
    this.notesBtn.textContent = "Notes: Off";
    this.notesBtn.setAttribute("aria-pressed", "false");
    this.notesBtn.classList.remove("primary");
    this.timerEl.textContent = this.formatTime(this.game.elapsed);
  }

  buildNumpad() {
    this.numpadEl.innerHTML = "";
    const row = document.createElement("div");
    row.className = "numpad-row";
    row.style.gridTemplateColumns = `repeat(${this.game.size}, 1fr)`;

    for (let n = 1; n <= this.game.size; n++) {
      const btn = document.createElement("button");
      btn.className = "numpad-btn";
      btn.textContent = String(n);
      btn.addEventListener("click", () => {
        this.game.inputNumber(n);
        this.renderBoard();
        this.vibrateFlash();
        this.playTone(540, 0.035);
        this.checkWin();
      });
      row.appendChild(btn);
    }

    this.numpadEl.appendChild(row);
  }

  renderBoard() {
    const { size, boxCols, boxRows, userGrid, notes, selected } = this.game;
    this.boardEl.innerHTML = "";
    this.boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement("button");
        cell.className = "cell";
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `Row ${r + 1} Column ${c + 1}`);

        const value = userGrid[r][c];
        const isFixed = this.game.isFixed(r, c);
        const isSelected = selected && selected.row === r && selected.col === c;
        const inRelated =
          selected &&
          (selected.row === r ||
            selected.col === c ||
            this.inSameBox(selected.row, selected.col, r, c));

        if (isFixed) cell.classList.add("fixed");
        if (inRelated) cell.classList.add("related");
        if (isSelected) cell.classList.add("selected");
        if (!this.game.isCorrect(r, c)) cell.classList.add("error");

        if (value !== 0) {
          cell.textContent = value;
        } else if (notes[r][c].size > 0) {
          const notesWrap = document.createElement("div");
          notesWrap.className = "notes";
          notesWrap.style.gridTemplateColumns = `repeat(${boxCols}, 1fr)`;

          for (let i = 1; i <= size; i++) {
            const n = document.createElement("span");
            n.className = "note-item";
            n.textContent = notes[r][c].has(i) ? i : "";
            notesWrap.appendChild(n);
          }
          cell.appendChild(notesWrap);
        }

        if (c > 0 && c % boxCols === 0) {
          cell.style.borderLeft = "2px solid var(--line-strong)";
        }
        if (r > 0 && r % boxRows === 0) {
          cell.style.borderTop = "2px solid var(--line-strong)";
        }

        cell.addEventListener("click", () => {
          this.game.selected = { row: r, col: c };
          this.renderBoard();
        });

        this.boardEl.appendChild(cell);
      }
    }
  }

  inSameBox(r1, c1, r2, c2) {
    const br = this.game.boxRows;
    const bc = this.game.boxCols;
    return (
      Math.floor(r1 / br) === Math.floor(r2 / br) &&
      Math.floor(c1 / bc) === Math.floor(c2 / bc)
    );
  }

  checkWin() {
    if (!this.game.isComplete()) return;
    this.game.stopTimer();
    this.winMessage.textContent = `You completed ${this.game.size}x${this.game.size} in ${this.formatTime(this.game.elapsed)}.`;
    this.winModal.classList.remove("hidden");
    this.statusEl.textContent = "Amazing solve!";
    this.playTone(820, 0.13);
    this.launchConfetti();
  }

  formatTime(total) {
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  pulseStatus(text) {
    this.statusEl.textContent = text;
    this.statusEl.animate(
      [{ opacity: 0.6, transform: "translateY(-2px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 220, easing: "ease-out" }
    );
  }

  vibrateFlash() {
    this.boardEl.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.003)" }, { transform: "scale(1)" }],
      { duration: 90 }
    );
  }

  playTone(freq, duration) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.02;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      osc.onended = () => ctx.close();
    } catch {
      // Intentionally silent if sound API fails.
    }
  }

  launchConfetti() {
    const canvas = this.confettiCanvas;
    const ctx = canvas.getContext("2d");
    const colors = ["#ff5d73", "#ffd166", "#06d6a0", "#7f5af0", "#4cc9f0"];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight,
      size: 4 + Math.random() * 6,
      speedY: 2 + Math.random() * 4,
      sway: -1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      rotSpeed: -0.2 + Math.random() * 0.4,
    }));

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let frames = 0;
    const step = () => {
      frames++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach((p) => {
        p.y += p.speedY;
        p.x += p.sway;
        p.rot += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      });

      if (frames < 180) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    requestAnimationFrame(step);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new SudokuUI();
});
