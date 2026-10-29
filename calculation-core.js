const petCalculation = (() => {
  function number(value) {
    const n = Number(String(value).normalize('NFKC').replace(/−/g, '-').trim());
    if (!Number.isFinite(n)) throw Error('來源數值無法解析');
    return n;
  }
  function calculate(data, input) {
    const weight = Number(input.weight);
    if (!String(input.weight).trim() || !Number.isFinite(weight) || weight <= 0) throw Error('請輸入大於 0 的體重。');
    const row = (sheet, index) => {
      const entry = data.sheets[sheet].find(r => r.row === Number(index));
      if (!entry || entry.row === 1) throw Error('請選擇完整的查表條件。');
      return entry;
    };
    const base = row('ＭＥＲ係數',input.base), activity = row('活動量加成',input.activity), bcs = row('BCS加成',input.bcs);
    const baseRange = String(base.values[2]).normalize('NFKC').split('-').map(number);
    const a = number(activity.values[5]), b = number(bcs.values[4]);
    const factors = baseRange.map(v => Math.round((v+a+b)*1e8)/1e8);
    if (factors.some(v=>v<=0)) throw Error('此組合的最終係數不大於 0，請檢查來源條件。');
    const water = data.sheets['飲水量清單'].find(r=>r.row>1&&Number(r.values[0])===weight);
    const ratio = Number(input.ratio);
    if (![2,3,4,5].includes(ratio)) throw Error('請選擇來源提供的乾濕比例。');
    const rer = 70*weight**0.75;
    return {weight,rer,mer:factors.map(factor=>rer*factor),base,activity,bcs,a,b,factors,
      totalWater:water?.values[1]??null, drinkingWater:water?.values[ratio]??null,
      waterRow:water?.row??null, waterMessage:!water?'來源沒有此體重的資料；目前採精確查表，不插值。':water.values[ratio]==null?'此乾濕比例的飲水量尚未填寫。':''};
  }
  return {calculate};
})();
if(typeof module !== 'undefined') module.exports = petCalculation;
