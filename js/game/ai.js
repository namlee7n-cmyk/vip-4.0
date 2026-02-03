import { Storage } from '../storage.js';
import { CONFIG } from '../config.js';

export const AIManager = {
  state: Storage.load(),
  init(){
    if(Object.keys(this.state.aiState.players).length===0){
      for(let i=1;i<=6;i++){
        const id = 'ai_'+i;
        this.state.aiState.players[id] = { id, name: 'AI_'+i, balance: 5_000_000 + Math.floor(Math.random()*50_000_000), holdings:{}, pendingBet:null };
      }
      Storage.save(this.state);
    }
  },
  getAIs(){ return Object.values(Storage.load().aiState.players); },
  aiPlaceBets(){
    const st = Storage.load();
    Object.values(st.aiState.players).forEach(ai=>{
      if(ai.balance < 20000) return;
      const choices = [20000,50000,100000,200000,500000];
      const amt = choices[Math.floor(Math.random()*choices.length)];
      const choice = Math.random()>0.5 ? 'TAI' : 'XIU';
      ai.pendingBet = { amount: amt, choice };
      ai.balance -= amt; // deduct immediately like player
      st.transactions.push({ time: Date.now(), type:'ai-bet', user: ai.id, amount: amt, detail: choice });
    });
    Storage.save(st);
  },
  resolveAIBets(resultLabel){
    const st = Storage.load();
    Object.values(st.aiState.players).forEach(ai=>{
      const p = ai.pendingBet;
      if(!p) return;
      if(p.choice === resultLabel){
        // AI wins, payout 1:1
        ai.balance += p.amount*2;
        st.transactions.push({ time: Date.now(), type:'ai-win', user: ai.id, amount: p.amount, detail: resultLabel });
      } else {
        st.transactions.push({ time: Date.now(), type:'ai-lose', user: ai.id, amount: p.amount, detail: resultLabel });
      }
      ai.pendingBet = null;
    });
    Storage.save(st);
  },
  aiStocksAction(){
    const st = Storage.load();
    const stocks = st.stocks;
    Object.values(st.aiState.players).forEach(ai=>{
      // choose to buy or sell by simple heuristic
      if(Math.random() < 0.6){
        // buy attempt
        const candidate = stocks[Math.floor(Math.random()*stocks.length)];
        if(!candidate) return;
        const maxQty = Math.min(candidate.supply, 80);
        const qty = Math.max(30, Math.floor(Math.random()*maxQty));
        const cost = qty * candidate.price;
        if(ai.balance > cost && qty <= candidate.supply){
          ai.balance -= cost;
          ai.holdings[candidate.symbol] = (ai.holdings[candidate.symbol]||0) + qty;
          candidate.supply -= qty;
          candidate.owners[ai.id] = (candidate.owners[ai.id]||0) + qty;
          st.transactions.push({ time:Date.now(), type:'ai-buy', user:ai.id, symbol:candidate.symbol, qty, amount:cost });
        }
      } else {
        // sell attempt
        const ownedSymbols = Object.keys(ai.holdings || {});
        if(ownedSymbols.length===0) return;
        const sym = ownedSymbols[Math.floor(Math.random()*ownedSymbols.length)];
        const owned = ai.holdings[sym]||0;
        if(owned >= 30 && Math.random() > 0.4){
          const sellQty = Math.floor(owned/2);
          const stock = stocks.find(s=>s.symbol===sym);
          if(stock){
            const gain = sellQty * stock.price;
            ai.balance += gain;
            ai.holdings[sym] -= sellQty;
            stock.supply += sellQty;
            stock.owners[ai.id] = (stock.owners[ai.id]||0) - sellQty;
            st.transactions.push({ time:Date.now(), type:'ai-sell', user:ai.id, symbol:sym, qty:sellQty, amount:gain });
          }
        }
      }
    });
    Storage.save(st);
  }
};
