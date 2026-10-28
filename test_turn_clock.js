'use strict';
const assert=require('node:assert/strict');
const c=require('./turn_clock');
function room(accumulated=true){return {accumulated,mode:60,bank:{wei:60,shu:60,wu:60},ready:{wei:false,shu:false,wu:false}}}
const r=room();c.initialize(r,100000);assert.equal(r.sideDeadline.wei,160000);
c.stop(r,'wu',110000);r.ready.wu=true;c.stop(r,'wei',120000);r.ready.wei=true;c.stop(r,'shu',130000);r.ready.shu=true;
assert.deepEqual(r.bank,{wei:40,shu:30,wu:50});r.ready={wei:false,shu:false,wu:false};c.next(r,200000);
assert.deepEqual(r.bank,{wei:100,shu:90,wu:110});assert.equal(r.sideDeadline.wu,310000);
assert.deepEqual(c.expire(r,290000),['shu']);assert.equal(r.bank.shu,0);assert.equal(r.ready.shu,true);
assert.deepEqual(c.expire(r,310000).sort(),['wei','wu']);
const classic=room(false);c.initialize(classic,100000);assert.equal(classic.deadline,160000);assert.deepEqual(c.expire(classic,160000),['wei','shu','wu']);
console.log('turn_clock regression: PASS');
