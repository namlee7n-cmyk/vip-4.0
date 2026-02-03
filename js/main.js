import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { DiceGame } from './game/dice.js';
import { AIManager } from './game/ai.js';
import { Stocks } from './game/stocks.js';
import { Admin } from './admin.js';
import { createStockChart } from './ui/stockChart.js';
import { CONFIG } from './config.js';

const STATE = Storage.load();
AIManager.init();

const STOCK_CHART = createStockChart({ chartContainerId:'stock-chart', volumeContainerId:'stock-volume' });

const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));
function fmt(n){ return Number(n).toLocaleString('vi-VN') + ' ₫'; }

function renderTop(){
  const u = Auth.current();
  qs('#account-area').innerText = u ? `Người chơi: ${u.name}` : 'Khách';
  qs('#balance-area').innerText = u ? `Tiền: ${fmt(u.balance)}` : '';
  qs('#player-total').innerText = u ? fmt(u.balance) : '0 ₫';
  qs('#banker-total').innerText = fmt(Storage.load().aiState.bankerBalance || 0);
  // AI list
  const ais = AIManager.getAIs();
  qs('#ai-list').innerHTML = ais.map(a=>`<div>${a.name}: ${fmt(a.balance)}</div>`).join('');
  qs('#banker-info').innerText = `Nhà cái: ${fmt(Storage.load().aiState.bankerBalance)}`;
}

function showPage(name){
// thay thế hàm showPage cũ bằng hàm dưới
function showPage(name){
 // thay thế hàm showPage cũ bằng hàm dưới
function showPage(name){
  // remove active from nav buttons
  document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`#nav button[data-page="${name}"]`);
  if(btn) btn.classList.add('active');

  // hide all pages, show target with animation classes
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('visible');
    p.classList.add('hidden');
    // small delay allow CSS transition
    setTimeout(()=> {
      p.style.zIndex = 0;
    }, 260);
  });
  const target = document.getElementById('page-'+name);
  if(!target) return;
  target.classList.remove('hidden');
  target.classList.add('visible');
  target.style.zIndex = 10;
  // make sure page scroll top and no body scrollbar (centered card)
  window.scrollTo(0,0);
}
function initNav(){
  qs('#nav').addEventListener('click', e=>{
    const btn = e.target.closest('button'); if(!btn) return;
    showPage(btn.dataset.page);
  });
  showPage('play');
}

function initAuthUI(){
  qs('#btn-login').addEventListener('click', ()=>{
    const act = confirm('OK = Tạo tài khoản mới, Cancel = Đăng nhập');
    const name = prompt('Tên (unique):'); if(!name) return;
    const pass = prompt('Mật khẩu:'); if(!pass) return;
    try{
      if(act){ Auth.register(name, pass); alert('Tạo & đăng nhập thành công'); }
      else { Auth.login(name, pass); alert('Đăng nhập thành công'); }
      renderTop(); renderOwned(); renderHistory(); renderStockTable();
    }catch(err){ alert(err); }
  });
  qs('#btn-topup').addEventListener('click', ()=>{
    const code = prompt('Nhập mã nạp (admin tạo):'); if(!code) return;
    const u = Auth.current();
    if(!u) return alert('Đăng nhập để nạp');
    try{ Admin.applyTopup(u.id, code); alert('Nạp thành công'); renderTop(); renderHistory(); }catch(e){ alert(e); }
  });
}

function initDiceUI(){
  let selectedBet = 20000;
  qs('#bet-buttons').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    selectedBet = Number(b.dataset.value);
    qs('#messages').innerText = `Chọn cược: ${selectedBet.toLocaleString()} VNĐ`;
  });

  qs('#bet-tai').addEventListener('click', ()=> placeBet('TAI'));
  qs('#bet-xiu').addEventListener('click', ()=> placeBet('XIU'));

  function placeBet(choice){
    const u = Auth.current(); if(!u) return alert('Đăng nhập để cược');
    if(u.balance < selectedBet) return alert('Không đủ tiền');
    u.balance -= selectedBet;
    Storage.save(Storage.load());
    DiceGame.playerPending = { userId: u.id, choice, amount: selectedBet };
    Storage.load().transactions.push({ time:Date.now(), type:'player-bet', user:u.id, amount:selectedBet, detail:choice });
    Storage.save(Storage.load());
    qs('#messages').innerText = `Bạn đã đặt ${fmt(selectedBet)} - ${choice}. Đợi kết quả...`;
    // ensure round running
    if(!DiceGame.rolling) startRoundUI();
  }

  function startRoundUI(){
    DiceGame.startRound((remaining)=>{
      const mm = String(Math.floor(remaining/60)).padStart(2,'0');
      const ss = String(remaining%60).padStart(2,'0');
      qs('#timer').innerText = `${mm}:${ss}`;
      qs('#bowl').classList.add('covered');
      qs('#bowl').classList.remove('uncovered');
    }, (outcome)=>{
      qs('#die1').innerText = outcome.dice[0];
      qs('#die2').innerText = outcome.dice[1];
      qs('#die3').innerText = outcome.dice[2];
      qs('#messages').innerText = 'Xúc xong — bấm chén để mở và xem kết quả';
      qs('#bowl').classList.remove('covered'); qs('#bowl').classList.add('uncovered');
      // play sound on reveal when user clicks (handled below)
      // Resolve will occur when bowl clicked (so user must click)
      qs('#bowl').onclick = async ()=>{
        const dice = outcome.dice;
        const isTriple = dice[0]===dice[1] && dice[1]===dice[2];
        const sum = dice[0]+dice[1]+dice[2];
        const resultLabel = isTriple ? 'TIE' : (sum>=11 && sum<=17 ? 'TAI' : 'XIU');

        // Play sound
        const snd = document.getElementById('sound-bowl');
        try{ snd.currentTime = 0; snd.play(); }catch(e){}

        // Resolve player
        const st = Storage.load();
        if(DiceGame.playerPending){
          const p = DiceGame.playerPending;
          const user = st.users[p.userId];
          if(!user) { DiceGame.playerPending = null; Storage.save(st); }
          else {
            if(p.choice === resultLabel){
              // player wins
              user.balance += p.amount*2; // payout 1:1
              st.transactions.push({ time:Date.now(), type:'player-win', user:user.id, amount:p.amount, detail: resultLabel });
              qs('#messages').innerText = `Bạn THẮNG ${fmt(p.amount)}! Kết quả: ${resultLabel}`;
            } else {
              st.transactions.push({ time:Date.now(), type:'player-lose', user:user.id, amount:p.amount, detail: resultLabel });
              qs('#messages').innerText = `Bạn THUA ${fmt(p.amount)}. Kết quả: ${resultLabel}`;
            }
            DiceGame.playerPending = null;
            Storage.save(st);
            renderTop(); renderHistory();
          }
        }

        // Resolve AI bets
        AIManager.resolveAIBets(resultLabel);

        qs('#bowl').onclick = null;
      };
    });

    // Immediately also trigger AI to make/bet when round starts
    AIManager.aiPlaceBets();
  }

  // user can toggle bowl but only opens reveal if not rolling
  qs('#bowl').addEventListener('click', ()=>{
    if(DiceGame.rolling) return;
    qs('#bowl').classList.toggle('uncovered');
    qs('#bowl').classList.toggle('covered');
  });

  // start button
  qs('#btn-start-round').addEventListener('click', ()=> { if(!DiceGame.rolling) startRoundUI(); else alert('Đang xúc...'); });
}

function renderStockTable(){
  const st = Storage.load();
  const tbody = qs('#stock-table tbody'); tbody.innerHTML = '';
  st.stocks.forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.symbol}</td><td>${fmt(s.price)}</td><td>${s.supply}</td><td>${s.lastChange>0?'+':''}${fmt(s.lastChange||0)}</td><td><button class="select-stock" data-symbol="${s.symbol}">Xem</button></td>`;
    tbody.appendChild(tr);
  });
  qsa('.select-stock').forEach(b=> b.addEventListener('click', ()=> onSelectStock(b.dataset.symbol) ));
}

function onSelectStock(symbol){
  const st = Storage.load();
  const stock = st.stocks.find(x=>x.symbol===symbol);
  if(!stock) return;
  qs('#stock-title').innerText = symbol;
  qs('#stock-price').innerText = fmt(stock.price);
  const change = stock.lastChange || 0;
  const pct = ((change / (stock.price - change || 1)) * 100).toFixed(2);
  qs('#stock-change').innerText = (change>=0?'+':'') + fmt(change);
  qs('#stock-percent').innerText = (change>=0?'+':'') + pct + '%';
  const vol = (stock.history || []).slice(-20).reduce((a,b)=>a+b.volume,0);
  qs('#stock-vol').innerText = `Vol: ${vol}`;

  STOCK_CHART.setData(stock.history || []);
  qs('#selected-stock').innerText = symbol;
}

function renderOwned(){
  const u = Auth.current();
  const el = qs('#owned-list');
  if(!u){ el.innerHTML = 'Đăng nhập để xem'; return; }
  const user = Storage.load().users[u.id];
  const holdings = user.holdings || {};
  el.innerHTML = Object.keys(holdings).map(sym=>`<div>${sym}: ${holdings[sym]} <button class="sell" data-sym="${sym}">Bán</button></div>`).join('') || 'Không có cổ phiếu';
  qsa('#owned-list .sell').forEach(b=> b.addEventListener('click', ()=>{
    const qty = Number(prompt('Số lượng muốn bán?')); if(!qty) return;
    try{ const res = Stocks.sell(u.id, b.dataset.sym, qty); alert('Bán thành công: ' + fmt(res.gain)); renderTop(); renderOwned(); renderStockTable(); renderHistory(); }catch(e){ alert(e); }
  }));
}

function initStockUI(){
  qs('#buy-btn').addEventListener('click', ()=>{
    const sym = qs('#selected-stock').innerText;
    if(!sym || sym==='Chưa chọn') return alert('Chọn cổ phiếu trước');
    const qty = Number(qs('#buy-qty').value);
    const u = Auth.current(); if(!u) return alert('Đăng nhập');
    try{ const res = Stocks.buy(u.id, sym, qty); alert('Mua thành công: ' + fmt(res.cost)); renderTop(); renderOwned(); renderStockTable(); renderHistory(); }catch(e){ alert(e); }
  });
}

function renderHistory(){
  const st = Storage.load();
  const el = qs('#history-list'); el.innerHTML = '';
  el.innerHTML = st.transactions.slice().reverse().map(t=>`<div>${new Date(t.time).toLocaleString()} - ${t.type} - ${t.user||t.code||''} - ${t.amount?fmt(t.amount):''} ${t.symbol?(' - '+t.symbol):''} ${t.detail?(' - '+t.detail):''}</div>`).join('');
}

function initAdminUI(){
  // reveal admin secret by typing admindzvailon
  let buf = '';
  document.addEventListener('keydown', e=>{
    buf += e.key;
    if(buf.endsWith('admindzvailon')){
      qs('#admin-panel').classList.remove('hidden');
      bindAdminActions();
    }
    if(buf.length>30) buf = buf.slice(-30);
  });
}

function bindAdminActions(){
  qs('#admin-enter').addEventListener('click', ()=>{
    const p1 = qs('#admin-pass1').value;
    const p2 = qs('#admin-pass2').value;
    if(p1==='0987654321'){
      if(p2==='zxcvbnm'){
        qs('#admin-controls').classList.remove('hidden');
        alert('Đã cấp quyền admin');
      } else alert('Pass2 sai');
    } else alert('Pass1 sai');
  });
  qs('#admin-create-code').addEventListener('click', ()=>{
    const code = qs('#admin-code').value.trim(); const val = Number(qs('#admin-code-value').value); const days = Number(qs('#admin-code-days').value);
    try{ Admin.createTopup(code,val,days); alert('Tạo mã xong'); renderHistory(); }catch(e){ alert(e); }
  });
  qs('#admin-cancel-btn').addEventListener('click', ()=>{ const code = qs('#admin-cancel-code').value.trim(); Admin.cancelTopup(code); alert('Huỷ nếu tồn tại'); renderHistory(); });
  qs('#admin-inc').addEventListener('click', ()=>{ const sym = qs('#admin-stock-symbol').value.trim(); Stocks.forceAdjust(sym, Math.floor(Math.random()*50_000_000)); alert('Tăng xong'); renderStockTable(); });
  qs('#admin-dec').addEventListener('click', ()=>{ const sym = qs('#admin-stock-symbol').value.trim(); Stocks.forceAdjust(sym, -Math.floor(Math.random()*50_000_000)); alert('Giảm xong'); renderStockTable(); });
  qs('#admin-bankrupt').addEventListener('click', ()=>{ const sym = qs('#admin-stock-symbol').value.trim(); Stocks.bankrupt(sym); alert('Phá sản xong'); renderTop(); renderStockTable(); renderHistory(); });
}

function initMisc(){
  qs('#btn-reset-local').addEventListener('click', ()=> {
    if(confirm('Xoá toàn bộ dữ liệu demo và reset?')){
      Storage.reset();
      location.reload();
    }
  });
}

// periodic stock update loop (use fast intervals in DEV_MODE)
function startBackgroundLoops(){
  const stockInterval = CONFIG.DEV_MODE ? 10 : CONFIG.STOCK_INTERVAL_SECONDS;
  const aiActionInterval = CONFIG.DEV_MODE ? 15 : CONFIG.STOCK_AI_ACTION_SECONDS;
  // stock update
  setInterval(()=> {
    Stocks.updateAll();
    renderStockTable();
    // if a stock is currently selected, update chart
    const selected = qs('#selected-stock').innerText;
    if(selected && selected !== 'Chưa chọn'){
      const st = Storage.load(); const stock = st.stocks.find(s=>s.symbol===selected);
      if(stock) STOCK_CHART.setData(stock.history || []);
    }
    renderHistory();
  }, stockInterval*1000);

  // AI buy/sell action more frequently
  setInterval(()=> {
    AIManager.aiStocksAction();
    renderTop(); renderStockTable(); renderHistory();
  }, aiActionInterval*1000);
}

// Init all
function init(){
  initNav(); initAuthUI(); initDiceUI(); initStockUI(); initAdminUI(); initMisc();
  renderTop(); renderStockTable(); renderOwned(); renderHistory();
  startBackgroundLoops();
  // quick UI refresh
  setInterval(()=>{ renderTop(); renderStockTable(); }, 5000);
}

init();
