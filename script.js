document.addEventListener("DOMContentLoaded", () => {
    
    // 画面切り替えシステム
    window.showPage = function(p) {
        const pages = ['home', 'dice', 'mines', 'crash', 'limbo', 'wheel', 'plinko', 'keno'];
        pages.forEach(id => {
            let el = document.getElementById(id + "Page");
            if (el) el.style.display = id === p ? 'block' : 'none';
        });
        
        document.querySelectorAll(".nav-btn").forEach(b => {
            const pageAttr = b.getAttribute("data-page");
            if (pageAttr === p) b.classList.add("active");
            else b.classList.remove("active");
        });
        if(p === 'plinko') drawPlinkoBoard(); // Plinko画面ならボード描画
        if(p === 'keno') drawKenoGrid();      // Keno画面ならグリッド描画
    };


    window.showPage('home');


    document.querySelectorAll(".nav-btn, .game-item").forEach(el => {
        el.addEventListener("click", () => {
            let page = el.getAttribute("data-page");
            if (page) window.showPage(page);
        });
    });


    // --- 基本データ ---
    let balance = Number(localStorage.getItem("balance")) || 4000;
    let xp = Number(localStorage.getItem("xp")) || 0;
    let level = Number(localStorage.getItem("level")) || 1;
    let minesGame = { active: false, bet: 0, count: 0, bombs: [], gemsOpened: 0 };
    let crashGame = { active: false, bet: 0, multiplier: 1.00, interval: null, crashPoint: 0 };
    let wheelSpinning = false;
    let kenoSelected = [];


    function updateUI() {
        document.getElementById("balance").textContent = balance.toLocaleString();
        document.getElementById("level").textContent = level;
        document.getElementById("xp").textContent = xp;
        localStorage.setItem("balance", balance); localStorage.setItem("xp", xp); localStorage.setItem("level", level);
    }


    function showPopup(html) {
        const p = document.getElementById("winPopup");
        if(p) {
            p.innerHTML = html; p.style.display = "block";
            setTimeout(() => p.style.display = "none", 2000);
        }
    }


    function addHistory(game, status, amount) {
        const list = document.getElementById("historyList");
        if(!list) return;
        const color = status.includes("WIN") || status.includes("CASH") ? "#22c55e" : "#ef4444";
        const item = document.createElement("div");
        item.className = "hist-item";
        item.innerHTML = `<span>${game}</span> <strong style="color:${color}">${status} (${amount})</strong>`;
        list.insertBefore(item, list.firstChild);
    }


    function gainXP(amount) {
        xp += amount;
        if (xp >= 100) { xp -= 100; level++; showPopup(`⭐ LEVEL UP! Lv.${level}`); }
        updateUI();
    }


    function setGlobalLock(locked) {
        document.querySelectorAll(".nav-btn, .game-item").forEach(el => el.style.pointerEvents = locked ? "none" : "auto");
        const inputs = ["bet", "chance", "minesBet", "crashBet", "limboBet", "limboTarget", "wheelBet", "plinkoBet", "kenoBet", "rollBtn", "startMinesBtn", "startCrashBtn", "startLimboBtn", "startWheelBtn", "startPlinkoBtn", "startKenoBtn"];
        inputs.forEach(id => { let el = document.getElementById(id); if(el) el.disabled = locked; });
    }


    // --- HOME ---
    const claimBtn = document.getElementById("claimBtn");
    if(claimBtn) claimBtn.onclick = () => { balance += 500; showPopup("🎁 Daily Bonus +¥500"); updateUI(); };


    // --- DICE, MINES, CRASH, LIMBO, WHEEL は以前のロジックを保持 ---
    // (中略：以前のコードと同じため、全自動化スクリプトでIDを監視して動きます)
    // 既存の Dice / Mines / Crash / Limbo / Wheel のロジックをここに集約


    // --- 🎳 PLINKO ---
    const plinkoCanvas = document.getElementById("plinkoCanvas");
    const plinkoRows = 10;
    const plinkoMultipliers = {
        low: [5, 2, 1.2, 0.5, 0.2, 0.2, 0.5, 1.2, 2, 5],
        medium: [10, 5, 2, 0.5, 0.1, 0.1, 0.5, 2, 5, 10],
        high: [50, 10, 3, 0.2, 0, 0, 0.2, 3, 10, 50]
    };


    function drawPlinkoBoard() {
        if(!plinkoCanvas) return;
        const ctx = plinkoCanvas.getContext("2d");
        ctx.clearRect(0, 0, 400, 400);
        ctx.fillStyle = "#334155";
        for (let r = 2; r <= plinkoRows + 1; r++) {
            for (let i = 0; i < r; i++) {
                let x = 200 - (r * 15) + (i * 30);
                let y = r * 30;
                ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
            }
        }
    }


    const startPlinkoBtn = document.getElementById("startPlinkoBtn");
    if(startPlinkoBtn) {
        startPlinkoBtn.onclick = () => {
            let bet = Number(document.getElementById("plinkoBet").value);
            let risk = document.getElementById("plinkoRisk").value;
            if (bet > balance || bet <= 0) return;
            setGlobalLock(true); balance -= bet; updateUI();


            const ctx = plinkoCanvas.getContext("2d");
            let x = 200, y = 30;
            let currentColumn = 0;


            let dropInterval = setInterval(() => {
                drawPlinkoBoard();
                y += 30;
                let move = Math.random() < 0.5 ? -15 : 15;
                if(move > 0) currentColumn++;
                x += move;


                ctx.fillStyle = "#ef4444";
                ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();


                if (y >= (plinkoRows + 1) * 30) {
                    clearInterval(dropInterval);
                    let mults = plinkoMultipliers[risk];
                    let finalIdx = Math.max(0, Math.min(mults.length - 1, currentColumn));
                    let mult = mults[finalIdx];
                    let win = Math.floor(bet * mult); balance += win;
                    
                    if(mult > 0) {
                        showPopup(`🎳 ×${mult} WIN! +¥${win}`);
                        addHistory("Plinko", "WIN", `+¥${win}`); gainXP(5);
                    } else { addHistory("Plinko", "LOSE", `-¥${bet}`); }
                    
                    updateUI(); setGlobalLock(false);
                }
            }, 100);
        };
    }


    // --- 🎫 KENO ---
    function drawKenoGrid() {
        const grid = document.getElementById("kenoGrid");
        if(!grid || grid.children.length > 0) return;
        for (let i = 1; i <= 40; i++) {
            let t = document.createElement("div"); t.className = "keno-tile"; t.textContent = i;
            t.onclick = () => {
                if (kenoSelected.includes(i)) {
                    kenoSelected = kenoSelected.filter(n => n !== i); t.classList.remove("selected");
                } else if (kenoSelected.length < 10) {
                    kenoSelected.push(i); t.classList.add("selected");
                }
            };
            grid.appendChild(t);
        }
    }


    const startKenoBtn = document.getElementById("startKenoBtn");
    if(startKenoBtn) {
        const kenoPaytable = [0, 0, 1.5, 3, 10, 50, 100, 250, 500, 1000, 2000]; // マッチ数に応じた倍率
        startKenoBtn.onclick = async () => {
            let bet = Number(document.getElementById("kenoBet").value);
            if (bet > balance || bet <= 0 || kenoSelected.length === 0) return;
            setGlobalLock(true); balance -= bet; updateUI();


            let drawn = [];
            while(drawn.length < 10) {
                let n = Math.floor(Math.random() * 40) + 1;
                if(!drawn.includes(n)) drawn.push(n);
            }


            let matches = 0;
            const tiles = document.querySelectorAll(".keno-tile");
            for (let n of drawn) {
                await new Promise(r => setTimeout(r, 150));
                let tile = tiles[n-1];
                if (kenoSelected.includes(n)) { tile.classList.add("hit"); matches++; }
                else { tile.classList.add("miss"); }
            }


            let mult = kenoPaytable[matches];
            let win = Math.floor(bet * mult); balance += win;
            document.getElementById("kenoMatched").textContent = matches;
            document.getElementById("kenoPayout").textContent = mult;


            if(mult > 0) {
                showPopup(`🎫 Keno ${matches} Match! +¥${win}`);
                addHistory("Keno", "WIN", `+¥${win}`); gainXP(matches * 5);
            } else { addHistory("Keno", "LOSE", `-¥${bet}`); }


            setTimeout(() => {
                tiles.forEach(t => t.classList.remove("hit", "miss"));
                updateUI(); setGlobalLock(false);
            }, 2000);
        };
    }


    // --- 共通オートベットボタン & 破産防止 ---
    function modifyBet(inputId, multiplier) {
        const input = document.getElementById(inputId);
        let val = Math.floor((parseFloat(input.value) || 0) * multiplier);
        input.value = Math.min(balance, Math.max(0, val));
    }
    window.validateBet = (el) => { if(el.value > balance) el.value = Math.floor(balance); };


    (function setupUI() {
        const ids = ['bet', 'minesBet', 'crashBet', 'limboBet', 'wheelBet', 'plinkoBet', 'kenoBet'];
        ids.forEach(id => {
            const input = document.getElementById(id);
            if (!input || input.dataset.hacked) return;
            input.dataset.hacked = "true";
            const container = document.createElement('div');
            container.style.display = 'flex'; container.style.gap = '5px'; container.style.marginTop = '5px';
            input.parentNode.insertBefore(container, input);
            input.style.flex = '1'; input.addEventListener('input', function(){ validateBet(this); });
            container.appendChild(input);
            ['½', '2x'].forEach(t => {
                const b = document.createElement('button'); b.innerText = t;
                b.style.cssText = "background:#334155; color:white; border:none; padding:0 12px; border-radius:5px; cursor:pointer; font-weight:bold;";
                b.onclick = () => modifyBet(id, t === '½' ? 0.5 : 2);
                container.appendChild(b);
            });
        });
    })();


    updateUI();
});