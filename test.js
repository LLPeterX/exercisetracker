// let s='2015-01-01';
// console.log(s<'9999-99-99');

const dArr = ['2015-01-01', '2016-06-06', '2021-04-17'];
const dFrom = '0000-00-00';
const dTo = '2016-07-01';
console.log(dArr.filter(s =>s>=dFrom && s<=dTo));
//console.log(dArr.filter(s => s<=dTo));