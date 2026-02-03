import { Storage } from './storage.js';

export const Auth = {
  state: Storage.load(),
  save(){ Storage.save(this.state); },
  register(name, pass){
    if(!name || !pass) throw 'Thiếu tên hoặc mật khẩu';
    // unique name
    const exists = Object.values(this.state.users).find(u=>u.name===name);
    if(exists) throw 'Tên đã tồn tại';
    const id = 'u_'+Date.now();
    this.state.users[id] = { id, name, pass, balance: 1_000_000, holdings:{}, bannedBuys:[], topupUsed:[] };
    this.state.currentUser = id;
    this.save();
    this._pushTx({type:'register', user:id, amount:0, detail:`Đăng ký ${name}`});
    return this.state.users[id];
  },
  login(name, pass){
    const user = Object.values(this.state.users).find(u=>u.name===name && u.pass===pass);
    if(!user) throw 'Sai tên hoặc mật khẩu';
    this.state.currentUser = user.id;
    this.save();
    return user;
  },
  logout(){
    this.state.currentUser = null;
    this.save();
  },
  current(){ return this.state.users[this.state.currentUser] || null; },
  addBalanceForId(id, amount){ this.state.users[id].balance += amount; Storage.save(this.state); },
  addBalance(amount){
    const u = this.current(); if(!u) throw 'Chưa đăng nhập'; u.balance += amount; this.save();
  },
  spend(amount){
    const u = this.current(); if(!u) throw 'Chưa đăng nhập';
    u.balance -= amount; this.save();
  },
  _pushTx(tx){ this.state.transactions.push(Object.assign({time:Date.now()}, tx)); Storage.save(this.state); }
};
