document.addEventListener("DOMContentLoaded", () => {
    // --- 画面切り替え ---
    window.showPage = function(p) {
        const pages = ['home', 'dice', 'mines', 'crash', 'limbo', 'wheel', 'plinko', 'keno'];
        pages.forEach(id => {
            let el = document.getElementById(id + "Page");
            if (el) el.style.display = id === p ? 'block' : 'none';
        });
        document.querySelectorAll(".nav-btn").forEach(b => {
            b.classList.toggle("active", b.getAttribute("data-page") === p);
        });
        if(p === 'plinko') drawPlinkoBoard();
        if(p === 'keno') drawKenoGrid();
    };

    window.showPage('home');
    document.querySelectorAll(".nav-btn").forEach(el => {
        el.addEventListener("click", () => window.showPage(el.getAttribute("data-page")));
    });

    // --- 基本システム ---
    let balance = Number(localStorage.getItem("balance")) || 4000;
    let xp = Number(localStorage.getItem("xp")) || 0;
    let level = Number(localStorage.getItem("level")) || 1;

    function updateUI() {
        document.getElementById("balance").textContent = Math.floor(balance).toLocaleString();
        document.getElementById("level").textContent = level;
        document.getElementById("xp").textContent = xp;
        localStorage.setItem("balance", balance); 
        localStorage.setItem("xp", xp); 
        localStorage.setItem("level", level);
    }

    function showPopup(msg) {
        const p = document.getElementById("winPopup");
        p.textContent = msg; p.style.display = "block";
        setTimeout(() => p.style.display = "none", 2000);
    }

    function addHistory(game, status, amount) {
        const list = document.getElementById("historyList");
        const color = status === "WIN" ? "#22c55e" : "#ef4444";
        const div = document.createElement("div");
        div.className = "hist-item";
        div.innerHTML = `<span>${game}</span> <strong style="color:${color}">${status} ${amount}</strong>`;
        list.insertBefore(div, list.firstChild);
    }

    function gainXP(amount) {
        xp += amount;
        if(xp >= 100) { xp -= 100; level++; showPopup(`⭐ LEVEL UP! Lv.${level}`); }
        updateUI();
    }

    // --- HOME ---
    document.getElementById("claimBtn")?.addEventListener("click", () => {
        balance += 500; showPopup("🎁 Daily Bonus +¥500"); updateUI();
    });

    // --- DICE ---
    const chanceInput = document.getElementById("chance");
    if(chanceInput) {
        chanceInput.oninput = () => {
            document.getElementById("chanceText").textContent = chanceInput.value + ".00";
            document.getElementById("payoutText").textContent = (99 / chanceInput.value).toFixed(2);
            document.getElementById("barFill").style.width = chanceInput.value + "%";
            document.getElementById("pointer").style.left = chanceInput.value + "%";
        };
    }
    document.getElementById("rollBtn")?.addEventListener("click", () => {
        let bet = Number(document.getElementById("bet").value);
        let chance = Number(chanceInput.value);
        if(bet > balance || bet <= 0) return;
        balance -= bet;
        
        let roll = (Math.random() * 100).toFixed(2);
        document.getElementById("rollDisplay").textContent = roll;
        
        if(roll <= chance) {
            let win = Math.floor(bet * (99 / chance));
            balance += win;
            document.getElementById("rollDisplay").style.color = "#22c55e";
            addHistory("Dice", "WIN", `+¥${win}`);
            gainXP(10);
        } else {
            document.getElementById("rollDisplay").style.color = "#ef4444";
            addHistory("Dice", "LOSE", `-¥${bet}`);
        }
        updateUI();
    });

    // --- MINES ---
    const minesGrid = document.getElementById("minesGrid");
    let minesGameActive = false;
    let currentMinesBet = 0;
    
    function createMines() {
        minesGrid.innerHTML = '';
        for(let i=0; i<25; i++) {
            let tile = document.createElement("div");
            tile.className = "mine-tile";
            tile.onclick = () => {
                if(!minesGameActive) return;
                let isBomb = Math.random() < 0.2;
                if(isBomb) {
                    tile.classList.add("bomb"); tile.textContent = "💣";
                    minesGameActive = false;
                    addHistory("Mines", "LOSE", `-¥${currentMinesBet}`);
                    document.getElementById("cashoutBtn").style.display = 'none';
                    document.getElementById("startMinesBtn").style.display = 'block';
                } else {
                    tile.classList.add("gem"); tile.textContent = "💎";
                    let win = Math.floor(currentMinesBet * 1.5);
                    document.getElementById("currentMult").textContent = "1.50";
                    currentMinesBet = win; 
                }
            };
            minesGrid.appendChild(tile);
        }
    }
    createMines();
    
    document.getElementById("startMinesBtn")?.addEventListener("click", () => {
        let bet = Number(document.getElementById("minesBet").value);
        if(bet > balance || bet <= 0) return;
        balance -= bet; currentMinesBet = bet;
        minesGameActive = true;
        document.getElementById("startMinesBtn").style.display = 'none';
        document.getElementById("cashoutBtn").style.display = 'block';
        createMines(); updateUI();
    });
    
    document.getElementById("cashoutBtn")?.addEventListener("click", () => {
        if(!minesGameActive) return;
        minesGameActive = false;
        balance += currentMinesBet;
        addHistory("Mines", "WIN", `+¥${currentMinesBet}`);
        document.getElementById("startMinesBtn").style.display = 'block';
        document.getElementById("cashoutBtn").style.display = 'none';
        updateUI();
    });

    // --- CRASH ---
    let crashInterval;
    document.getElementById("startCrashBtn")?.addEventListener("click", () => {
        let bet = Number(document.getElementById("crashBet").value);
        if(bet > balance || bet <= 0) return;
        balance -= bet; updateUI();
        
        document.getElementById("startCrashBtn").style.display = "none";
        document.getElementById("crashCashoutBtn").style.display = "block";
        
        let mult = 1.00;
        let crashPoint = (Math.random() * 3) + 1.1;
        
        clearInterval(crashInterval);
        crashInterval = setInterval(() => {
            mult += 0.01;
            document.getElementById("crashDisplay").textContent = mult.toFixed(2) + "x";
            
            if(mult >= crashPoint) {
                clearInterval(crashInterval);
                document.getElementById("crashDisplay").style.color = "#ef4444";
                document.getElementById("startCrashBtn").style.display = "block";
                document.getElementById("crashCashoutBtn").style.display = "none";
                addHistory("Crash", "LOSE", `-¥${bet}`);
            }
        }, 50);
        
        document.getElementById("crashCashoutBtn").onclick = () => {
            clearInterval(crashInterval);
            let win = Math.floor(bet * mult);
            balance += win;
            document.getElementById("startCrashBtn").style.display = "block";
            document.getElementById("crashCashoutBtn").style.display = "none";
            document.getElementById("crashDisplay").style.color = "#22c55e";
            addHistory("Crash", "WIN", `+¥${win}`);
            updateUI();
        };
    });

    // --- LIMBO ---
    document.getElementById("limboTarget")?.addEventListener("input", (e) => {
        let target = Number(e.target.value);
        if(target >= 1.01) {
            document.getElementById("limboChanceText").textContent = (99 / target).toFixed(2);
        }
    });
    document.getElementById("startLimboBtn")?.addEventListener("click", () => {
        let bet = Number(document.getElementById("limboBet").value);
        let target = Number(document.getElementById("limboTarget").value);
        if(bet > balance || bet <= 0) return;
        balance -= bet;
        
        let result = (Math.random() * 5) + 1;
        document.getElementById("limboDisplay").textContent = result.toFixed(2) + "x";
        
        if(result >= target) {
            let win = Math.floor(bet * target);
            balance += win;
            document.getElementById("limboDisplay").style.color = "#22c55e";
            addHistory("Limbo", "WIN", `+¥${win}`);
            gainXP(15);
        } else {
            document.getElementById("limboDisplay").style.color = "#ef4444";
            addHistory("Limbo", "LOSE", `-¥${bet}`);
        }
        updateUI();
    });

    // --- WHEEL ---
    let wheelRotation = 0;
    document.getElementById("startWheelBtn")?.addEventListener("click", () => {
        let bet = Number(document.getElementById("wheelBet").value);
        if(bet > balance || bet <= 0) return;
        balance -= bet; updateUI();
        
        let wheel = document.getElementById("wheelElement");
        wheelRotation += 1000 + Math.random() * 1000;
        wheel.style.transform = `rotate(${wheelRotation}deg)`;
        
        setTimeout(() => {
            let win = Math.random() > 0.5 ? bet * 2 : 0;
            balance += win;
            addHistory("Wheel", win > 0 ? "WIN" : "LOSE", win > 0 ? `+¥${win}` : `-¥${bet}`);
            updateUI();
        }, 3000);
    });

    // --- PLINKO ---
    function drawPlinkoBoard() {
        const canvas = document.getElementById("plinkoCanvas");
        if(!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#334155";
        ctx.clearRect(0, 0, 400, 400);
        for (let r = 2; r <= 11; r++) {
            for (let i = 0; i < r; i++) {
                ctx.beginPath(); ctx.arc(200 - (r * 15) + (i * 30), r * 30, 3, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
    document.getElementById("startPlinkoBtn")?.addEventListener("click", () => {
        let bet = Number(document.getElementById("plinkoBet").value);
        if (bet > balance || bet <= 0) return;
        balance -= bet; updateUI();
        
        let canvas = document.getElementById("plinkoCanvas");
        let ctx = canvas.getContext("2d");
        let x = 200, y = 30;
        
        let drop = setInterval(() => {
            drawPlinkoBoard();
            y += 30;
            x += Math.random() < 0.5 ? -15 : 15;
            ctx.fillStyle = "#ef4444";
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
            
            if (y >= 330) {
                clearInterval(drop);
                let mult = [0.2, 1.2, 5, 10][Math.floor(Math.random()*4)];
                let win = Math.floor(bet * mult);
                balance += win; updateUI();
                showPopup(`Plinko: ${mult}x`);
                addHistory("Plinko", win>0?"WIN":"LOSE", win>0?`+¥${win}`:`-¥${bet}`);
                gainXP(5);
            }
        }, 100);
    });

    // --- KENO ---
    let kenoSelected = [];
    function drawKenoGrid() {
        const grid = document.getElementById("kenoGrid");
        if(!grid || grid.children.length > 0) return;
        for (let i = 1; i <= 40; i++) {
            let t = document.createElement("div"); 
            t.className = "keno-tile"; t.textContent = i;
            t.onclick = () => {
                if(kenoSelected.includes(i)) {
                    kenoSelected = kenoSelected.filter(n => n !== i);
                    t.classList.remove("selected");
                } else if(kenoSelected.length < 10) {
                    kenoSelected.push(i);
                    t.classList.add("selected");
                }
            };
            grid.appendChild(t);
        }
    }
    document.getElementById("startKenoBtn")?.addEventListener("click", () => {
        let bet = Number(document.getElementById("kenoBet").value);
        if (bet > balance || bet <= 0 || kenoSelected.length === 0) return;
        balance -= bet; updateUI();
        
        const tiles = document.querySelectorAll(".keno-tile");
        tiles.forEach(t => t.classList.remove("hit", "miss"));
        
        let drawn = [];
        while(drawn.length < 10) {
            let n = Math.floor(Math.random() * 40) + 1;
            if(!drawn.includes(n)) drawn.push(n);
        }
        
        let matches = 0;
        drawn.forEach(n => {
            if(kenoSelected.includes(n)) { tiles[n-1].classList.add("hit"); matches++; }
            else { tiles[n-1].classList.add("miss"); }
        });
        
        let mult = matches > 2 ? matches * 2 : 0;
        let win = Math.floor(bet * mult);
        balance += win; updateUI();
        
        document.getElementById("kenoMatched").textContent = matches;
        document.getElementById("kenoPayout").textContent = mult;
        
        if(mult > 0) {
            showPopup(`🎫 Keno ${matches} Hits! +¥${win}`);
            addHistory("Keno", "WIN", `+¥${win}`); gainXP(10);
        } else {
            addHistory("Keno", "LOSE", `-¥${bet}`);
        }
    });

    updateUI();
});
