import { Storage } from './storage.js';

export const Admin = {
  state: Storage.load(),
  createTopup(code, value, days){
    if(!code || value<=0) throw 'Code or value invalid';
    if(value > 200000) throw 'Giới hạn nạp 200k';
    const expiresAt = Date.now() + Math.max(1,days)*24*3600*1000;
    this.state.adminCodes[code] = { code, value, expiresAt, usedBy: [] };
    this._pushTx({ type:'admin-create-code', code, value, expiresAt });
    Storage.save(this.state);
  },
  cancelTopup(code){
    if(this.state.adminCodes[code]){ delete this.state.adminCodes[code]; this._pushTx({type:'admin-cancel', code}); Storage.save(this.state); }
  },
  applyTopup(userId, code){
    this.state = Storage.load();
    const entry = this.state.adminCodes[code];
    if(!entry) throw 'Mã không tồn tại';
    if(Date.now() > entry.expiresAt) throw 'Mã đã hết hạn';
    if(entry.usedBy.includes(userId)) throw 'Bạn đã sử dụng mã này';
    const user = this.state.users[userId];
    if(!user) throw 'Người dùng không hợp lệ';
    user.balance += entry.value;
    entry.usedBy.push(userId);
    this._pushTx({ type:'topup', user:userId, code, amount: entry.value });
    Storage.save(this.state);
  },
  _pushTx(tx){ this.state.transactions.push(Object.assign({time:Date.now()}, tx)); Storage.save(this.state); }
};
