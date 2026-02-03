import { Storage } from '../storage.js';
import { CONFIG } from '../config.js';

export const DiceGame = {
  state: Storage.load(),
  rolling: false,
  timerId: null,
  remaining: 0,
  playerPending: null, // {userId,choice,amount}
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
  stopRound(){
    if(this.timerId) clearInterval(this.timerId);
    this.rolling=false;
  },
  _decideOutcome(){
    const r = Math.random()*100;
    let label;
    const winRate = CONFIG.DICE.WIN_RATE;
    const loseRate = CONFIG.DICE.LOSE_RATE;
    if(r < winRate) label = 'PLAYER_WIN';
    else if(r < winRate + loseRate) label = 'PLAYER_LOSE';
    else label = 'TIE';
    // build dice to match label
    let dice = [1,1,1];
    if(label === 'TIE'){
      const v = 1 + Math.floor(Math.random()*6);
      dice = [v,v,v];
    } else {
      const wantTai = (label==='PLAYER_WIN'); // interpret PLAYER_WIN = player chose TAI and won
      let tries=0;
      while(true){
        tries++;
        dice = [1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
        const sum = dice[0]+dice[1]+dice[2];
        const isTriple = (dice[0]===dice[1] && dice[1]===dice[2]);
        const isTai = (sum>=11 && sum<=17) && !isTriple;
        if(wantTai===isTai) break;
        if(tries>500) break;
      }
    }
    return { dice, label };
  }
};
