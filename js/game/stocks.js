import { Storage } from '../storage.js';
import { CONFIG } from '../config.js';
import { AIManager } from './ai.js';

export const Stocks = {
  state: Storage.load(),
  updateAll(){
    this.state = Storage.load();
    this.state.stocks.forEach(s=>{
      const old = s.price;
      // change percent -20%..+20%
      const pct = (Math.random()*40 - 20)/100;
      const newPrice = Math.max(500_000_000, Math.floor(s.price * (1+pct)));
      s.lastChange = newPrice - s.price;
      // build OHLC around old->new
      const t = Date.now();
      const open = s.price;
      const close = newPrice;
      const high = Math.max(open, close) + Math.floor(Math.random()*20_000_000);
      const low = Math.max(500_000_000, Math.min(open, close) - Math.floor(Math.random()*20_000_000));
      const volume = Math.floor(Math.random()*1500)+200;
      s.price = newPrice;
      s.history = s.history || [];
      s.history.push({ time: t, open, high, low, close, volume });
      if(s.history.length > CONFIG.MAX_HISTORY_POINTS) s.history.shift();
    });
    // AI stock actions
    AIManager.aiStocksAction();
    Storage.save(this.state);
  },
  buy(userId, symbol, qty){
    this.state = Storage.load();
    const stock = this.state.stocks.find(s=>s.symbol===symbol);
    if(!stock) throw 'Không tìm thấy cổ phiếu';
    if(qty < 30) throw 'Phải mua tối thiểu 30 cổ phiếu';
    if(qty > stock.supply) throw 'Không đủ supply';
    const user = this.state.users[userId];
    if(!user) throw 'Người dùng không tồn tại';
    const cost = BigInt(qty) * BigInt(stock.price);
    if(BigInt(user.balance) < cost) throw 'Không đủ tiền';
    if(user.bannedBuys && user.bannedBuys.includes(symbol)) throw 'Đã mua rồi. Phải bán hết mới mua lại';
    // proceed
    user.balance -= Number(cost);
    user.holdings[symbol] = (user.holdings[symbol]||0) + qty;
    stock.supply -= qty;
    stock.owners[userId] = (stock.owners[userId]||0) + qty;
    user.bannedBuys.push(symbol);
    this.state.transactions.push({ time:Date.now(), type:'buy', user:userId, symbol, qty, amount:Number(cost) });
    Storage.save(this.state);
    return { cost:Number(cost) };
  },
  sell(userId, symbol, qty){
    this.state = Storage.load();
    const stock = this.state.stocks.find(s=>s.symbol===symbol);
    if(!stock) throw 'Không tìm thấy cổ phiếu';
    const user = this.state.users[userId];
    const owned = user.holdings[symbol] || 0;
    if(qty > owned) throw 'Không có đủ cổ phiếu';
    const gain = qty * stock.price;
    user.balance += gain;
    user.holdings[symbol] -= qty;
    stock.supply += qty;
    stock.owners[userId] = (stock.owners[userId]||0) - qty;
    if(user.holdings[symbol] <= 0){
      user.bannedBuys = (user.bannedBuys || []).filter(x => x !== symbol);
    }
    this.state.transactions.push({ time:Date.now(), type:'sell', user:userId, symbol, qty, amount:gain });
    Storage.save(this.state);
    return { gain };
  },
  forceAdjust(symbol, delta){
    this.state = Storage.load();
    const s = this.state.stocks.find(x=>x.symbol===symbol);
    if(!s) throw 'Không tìm thấy cổ phiếu';
    s.price = Math.max(0, s.price + delta);
    this.state.transactions.push({ time:Date.now(), type:'admin-adjust', detail: `${symbol} ${delta}` });
    Storage.save(this.state);
  },
  bankrupt(symbol){
    this.state = Storage.load();
    const s = this.state.stocks.find(x=>x.symbol===symbol);
    if(!s) throw 'Không tìm thấy cổ phiếu';
    s.price = 0;
    Object.keys(s.owners || {}).forEach(uid=>{
      const qty = s.owners[uid] || 0;
      if(qty>0){
        const user = this.state.users[uid];
        if(user) user.balance -= 200_000_000;
      }
    });
    this.state.transactions.push({ time:Date.now(), type:'admin-bankrupt', symbol });
    Storage.save(this.state);
  }
};
