import { Storage } from '../storage.js';
import { CONFIG } from '../config.js';

// DiceGame now exposes get/set rates for house bias and uses internal rates
export const DiceGame = {
  state: Storage.load(),
  rolling: false,
  timerId: null,
  remaining: 0,
  playerPending: null,
  // internal rates (percent for player win / player lose). Initialize from config
  rates: {
    playerWin: CONFIG.DICE.WIN_RATE || 39,
    playerLose: CONFIG.DICE.LOSE_RATE || 51
  },

  startRound(onTick, onEnd){
    if(this.rolling) return;
    this.rolling = true;
    this.remaining = CONFIG.DEV_MODE ? 12 : CONFIG.ROLL_SECONDS;
    onTick(this.remaining);
    this.timerId = setInterval(()=>{
      this.remaining--;
      onTick(this.remaining);
      if(this.remaining<=0){
        clearInterval(this.timerId);
        this.rolling=false;
        const outcome = this._decideOutcome();
        onEnd(outcome);
      }
    },1000);
  },

  stopRound(){ if(this.timerId) clearInterval(this.timerId); this.rolling=false; },

  _decideOutcome(){
    // use internal rates
    const winRate = this.rates.playerWin;
    const loseRate = this.rates.playerLose;
    const r = Math.random()*100;
    let label;
    if(r < winRate) label = 'PLAYER_WIN';
    else if(r < winRate + loseRate) label = 'PLAYER_LOSE';
    else label = 'TIE';
    let dice = [1,1,1];
    if(label === 'TIE'){
      const v = 1 + Math.floor(Math.random()*6);
      dice = [v,v,v];
    } else {
      const wantTai = (label === 'PLAYER_WIN');
      let tries=0;
      while(true){
        tries++;
        dice = [1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
        const sum = dice[0]+dice[1]+dice[2];
        const isTriple = (dice[0]===dice[1] && dice[1]===dice[2]);
        const isTai = (sum>=11 && sum<=17) && !isTriple;
        if(wantTai === isTai) break;
        if(tries>500) break;
      }
    }
    // convert label into TAI/XIU/TIE as result
    let resultLabel;
    const isTriple = (dice[0]===dice[1] && dice[1]===dice[2]);
    const sum = dice[0]+dice[1]+dice[2];
    if(isTriple) resultLabel = 'TIE';
    else resultLabel = (sum>=11 && sum<=17) ? 'TAI' : 'XIU';

    // save round result to transactions (for AI to learn)
    const st = Storage.load();
    st.transactions.push({ time: Date.now(), type: 'round-result', detail: resultLabel, dice });
    Storage.save(st);

    return { dice, label: resultLabel };
  },

  // allow admin/house to set bias rates (playerWin/playerLose in percents)
  setRates({ playerWin, playerLose }){
    if(typeof playerWin === 'number') this.rates.playerWin = clampRate(playerWin);
    if(typeof playerLose === 'number') this.rates.playerLose = clampRate(playerLose);
  },

  getRates(){ return Object.assign({}, this.rates); }
};

function clampRate(v){
  v = Math.max(0, Math.min(100, Math.round(v)));
  return v;
}
