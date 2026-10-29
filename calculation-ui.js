(() => {
  const esc=escapeHtml;
  const example={weight:'10',base:'7',activity:'7',bcs:'10',ratio:'3'};
  let mode='example', input={...example};
  const source=(sheet)=>`<button class="secondary-button" data-c-source="${esc(sheet)}" aria-label="查看來源檔案：${esc(sheet)}">${sheet==='活動量加成'?'活動量來源':sheet==='BCS加成'?'BCS 來源':'查看來源檔案'}</button>`;
  const range=(values)=>values.map(v=>v.toLocaleString('en-US',{maximumFractionDigits:3})).join('–');
  const choice=(id,label,sheet,text)=>`<label>${label}<select id="c-${id}">${calculationData.sheets[sheet].slice(1).map(r=>`<option value="${r.row}" ${String(r.row)===input[id]?'selected':''}>${esc(text(r.values))}</option>`).join('')}</select></label>`;
  function result(values) {
    try {
      const r=petCalculation.calculate(calculationData,values);
      return `<div class="calc-trace calc-result-step"><h3>01 · RER 計算</h3><p>RER＝70 × 體重（kg）<sup>0.75</sup></p><p>70 × ${r.weight}<sup>0.75</sup> ＝ <strong>${r.rer.toFixed(1)} kcal／日</strong></p></div>
        <div class="calc-trace calc-result-step"><h3>02 · MER 係數</h3><p>基準係數 ＋ 活動量修正 ＋ BCS 修正</p><p>${range(String(r.base.values[2]).split('-').map(Number))} ＋ (${r.a}) ＋ (${r.b}) ＝ <strong>${range(r.factors)}</strong></p><details><summary>查看查表依據</summary><p>基準：${esc(r.base.values[1])} · 第 ${r.base.row} 列</p><p>活動：${esc(r.activity.values[1])}／${esc(r.activity.values[4])} · 第 ${r.activity.row} 列</p><p>BCS：${esc(r.bcs.values[0])}／${esc(r.bcs.values[3])} · 第 ${r.bcs.row} 列</p></details></div>
        <div class="calc-answer"><span>03 · 最終 MER＝RER × MER 係數</span><strong>${r.mer.map(v=>v.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})).join('–')} <small>kcal／日</small></strong><p>${r.rer.toFixed(1)} × ${r.factors.length>1?'('+range(r.factors)+')':range(r.factors)} ≈ ${r.mer.map(v=>v.toFixed(1)).join('–')} kcal／日</p><small>計算使用未四捨五入的 RER。</small></div>
        <div class="calc-water"><h3>飲水量建議</h3><p>${r.weight} kg · ${esc(calculationData.sheets['飲水量清單'][0].values[Number(values.ratio)].replace('飲水量（mL/day）',''))}</p><div class="calc-water-values"><div><span>每日總水分</span><strong>${r.totalWater===null?'—':r.totalWater+' mL'}</strong></div><div><span>額外飲水量</span><strong>${r.drinkingWater===null?'—':r.drinkingWater+' mL'}</strong></div></div>${r.waterMessage?`<p role="status">${r.waterMessage}</p>`:`<p>命中「飲水量清單」第 ${r.waterRow} 列。總水分與飲水量分開呈現，不重複相加。</p>`}${source('飲水量清單')}</div>`;
    }catch(e){return `<div class="nutrition-message" role="alert">${esc(e.message)}</div>`;}
  }
  function render() {
    return `${nutritionPriority.render()}<div class="calc-layout"><section class="calc-reference"><h2>計算公式與流程</h2>
      <article class="formula-step"><small>01 · 靜息能量需求</small><p class="formula">RER＝70 × 體重（kg）<sup>0.75</sup></p><small>固定公式</small></article>
      <article class="formula-step"><small>02 · 基準 MER 係數</small><p class="formula">基準係數＝查表（年齡與動物狀態）</p>${source('ＭＥＲ係數')}</article>
      <article class="formula-step"><small>03 · 活動量與 BCS 修正</small><p class="formula">最終係數＝基準係數＋活動量修正＋BCS 修正</p><div class="button-row">${source('活動量加成')}${source('BCS加成')}</div><small>依來源表的加成欄位作加法，並非百分比連乘。</small></article>
      <article class="formula-step"><small>04 · 本段計算終點</small><p class="formula">最終 MER＝RER × MER 係數</p><small>右側顯示每日能量與 MER 係數；本段不換算營養素或食譜。</small></article>
      <article class="formula-step"><small>平行分支 · 飲水量</small><p class="formula">飲水量＝查表（體重、乾濕食比例）</p>${source('飲水量清單')}<small>原表有 1–60 kg；未填值或非表列體重顯示缺資料，不自行推估。</small></article>
      </section><section class="calc-sandbox"><h2>計算驗證</h2><div class="nutrition-tabs" role="tablist" aria-label="試算模式"><button role="tab" id="c-example-tab" aria-controls="c-panel" aria-selected="${mode==='example'}" class="${mode==='example'?'active':''}" data-c-tab="example">固定範例</button><button role="tab" id="c-test-tab" aria-controls="c-panel" aria-selected="${mode==='test'}" class="${mode==='test'?'active':''}" data-c-tab="test">互動試算</button></div><div id="c-panel" role="tabpanel" aria-labelledby="c-${mode}-tab">${mode==='example'?`<p class="nutrition-footnote">10 kg 成犬、已絕育；中型犬中等活動量、BCS 5/9；75% 乾＋25% 濕。固定輸入由同一套計算邏輯產生結果。</p>${result(example)}`:
        `<p class="nutrition-footnote">目前來源只含犬。請直接選擇每張表的適用條件；尚未自動判斷條件間的相容性。</p><div class="calc-inputs"><label>體重（kg）<input id="c-weight" type="number" min="0.01" step="any" value="${esc(input.weight)}"></label>${choice('base','動物狀態／基準係數','ＭＥＲ係數',v=>v[1])}${choice('activity','活動等級／適用對象','活動量加成',v=>v[1]+'／'+v[4])}${choice('bcs','BCS／適用對象','BCS加成',v=>v[0]+' '+v[1]+'／'+v[3])}<label>乾濕食比例<select id="c-ratio">${calculationData.sheets['飲水量清單'][0].values.slice(2).map((h,i)=>`<option value="${i+2}" ${input.ratio===String(i+2)?'selected':''}>${esc(h.replace('飲水量（mL/day）',''))}${i>1?'（來源未填值）':''}</option>`).join('')}</select></label></div><div class="button-row"><button class="primary-button" data-c-run>計算結果</button><button class="secondary-button" data-c-reset>重設為範例</button></div><div id="c-result" aria-live="polite">${result(input)}</div>`}</div></section></div>`;
  }
  function capture(){for(const k in input)input[k]=document.querySelector('#c-'+k)?.value??input[k];}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.cTab){capture();mode=b.dataset.cTab;document.querySelector('#view-content').innerHTML=render();document.querySelector('#c-'+mode+'-tab').focus();}
    if(b.hasAttribute('data-c-run')){capture();document.querySelector('#c-result').innerHTML=result(input);}
    if(b.hasAttribute('data-c-reset')){input={...example};document.querySelector('#view-content').innerHTML=render();}
    if(b.dataset.cSource){const sheet=b.dataset.cSource,rows=calculationData.sheets[sheet];const d=document.createElement('dialog');d.className='nutrition-dialog';d.innerHTML=`<header><h2>${esc(sheet)}</h2><button class="secondary-button" data-c-close>關閉</button></header><p>來源：${esc(calculationData.file)} ／ ${esc(sheet)} · 本次試算快照</p><p>以下保留 Excel 原始值與列號；空白不代表零。</p>${table(['Excel 列號',...rows[0].values.map(esc)],rows.slice(1).map(r=>`<tr><td>${r.row}</td>${r.values.map(v=>`<td>${v==null?'—':esc(String(v))}</td>`).join('')}</tr>`),650)}`;document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove());}
    if(b.hasAttribute('data-c-close'))b.closest('dialog').close();
  });
  document.addEventListener('input',e=>{if(e.target.id?.startsWith('c-')&&mode==='test'){capture();document.querySelector('#c-result').innerHTML='<div class="nutrition-message">輸入已變更，請點擊「計算結果」更新。</div>';}});
  renderers['nutrition-rules']=render;
  Object.assign(modules.find(m=>m.id==='nutrition-rules'),{subtitle:'左側檢閱公式與來源，右側切換固定範例及互動試算，取得最終 MER、係數與飲水量。'});
})();


