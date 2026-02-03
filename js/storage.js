export const Storage = {
  key: 'tx_stock_game_v2',
  load(){
    const raw = localStorage.getItem(this.key);
    if(!raw){
      const base = this._defaultState();
      localStorage.setItem(this.key, JSON.stringify(base));
      return base;
    }
    try{ return JSON.parse(raw); } catch(e){ const base=this._defaultState(); localStorage.setItem(this.key, JSON.stringify(base)); return base; }
  },
  save(state){
    localStorage.setItem(this.key, JSON.stringify(state));
  },
  reset(){
    localStorage.removeItem(this.key);
    return this.load();
  },
  _defaultState(){
    const names = ['ALPHA','BETA','GAMMA','DELTA','EPS','ZETA','ETA','THETA','IOTA','KAPPA','LAMBDA','OMICRON'];
    const stocks = names.map((s,i)=>{
      const basePrice = 500_000_000 + Math.floor(Math.random()*500_000_000);
      return {
        symbol: s,
        price: basePrice,
        supply: 100,
        owners: {},
        lastChange: 0,
        history: [{ time: Date.now(), open: basePrice, high: basePrice, low: basePrice, close: basePrice, volume: Math.floor(Math.random()*800)+200 }]
      };
    });
    return {
      users: {},           // id->{id,name,pass,balance,holdings:{symbol:qty},bannedBuys:[],topupUsed:[]}
      currentUser: null,
      transactions: [],    // lịch sử events
      adminCodes: {},      // code -> {code,value,expiresAt,usedBy:[]}
      stocks,
      aiState: {
        bankerBalance: 10_000_000_000,
        players: {}        // aiId->{id,name,balance,holdings:{},pendingBet}
      }
    };
  }
};
