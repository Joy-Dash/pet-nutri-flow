/* Global nutrient-rule ordering, saved only in this browser prototype. */
window.nutritionPriority = (() => {
  const key='tp-rag-nutrition-priority-v1';
  const items=[
    {id:'owner-needs',name:'飼主需求',description:'參考飼主在問卷中選擇的需求。'},
    {id:'disease',name:'慢性病／遺傳性疾病',description:'檢查符合的慢性病與遺傳性疾病營養規則。'},
    {id:'stool',name:'排便狀況',description:'檢查符合的排便分類與營養調整規則。'},
    {id:'subhealth',name:'亞健康狀況',description:'檢查符合的亞健康觀察與營養調整規則。'}
  ];
  const defaults=items.map(x=>x.id);
  let saved=[...defaults],draft=null,message='',failed=false;
  const valid=order=>Array.isArray(order)&&order.length===defaults.length&&new Set(order).size===defaults.length&&order.every(id=>defaults.includes(id));
  try{const value=JSON.parse(localStorage.getItem(key));if(valid(value?.order))saved=value.order;}catch{}
  const esc=escapeHtml;
  const button=(text,attr,primary=false)=>`<button type="button" class="${primary?'primary-button':'secondary-button'}" ${attr}>${text}</button>`;
  function render(){
    const order=draft||saved,editing=!!draft;
    return `<section class="panel np-panel" id="nutrition-priority"><div class="panel-head"><div><h2>營養規則優先序</h2><p>設定最終營養元素判斷時的參考順序，數字越小越優先。</p></div><div class="button-row">${editing?button('取消','data-np-cancel')+button('儲存優先序','data-np-save',true):button('編輯優先序','data-np-edit')}</div></div><div class="np-body">${message?`<p class="np-message ${failed?'np-error':''}" role="${failed?'alert':'status'}">${esc(message)}</p>`:''}<ol class="${editing?'np-editor':'np-summary'}">${order.map((id,i)=>{const item=items.find(x=>x.id===id);return `<li><span class="np-rank" aria-hidden="true">${i+1}</span><div><strong>${esc(item.name)}</strong>${editing?`<p>${esc(item.description)}</p>`:''}</div>${editing?`<div class="np-moves">${button('↑',`data-np-move="${i}" data-np-direction="-1" aria-label="上移${esc(item.name)}" ${i===0?'disabled':''}`)}${button('↓',`data-np-move="${i}" data-np-direction="1" aria-label="下移${esc(item.name)}" ${i===order.length-1?'disabled':''}`)}</div>`:''}</li>`;}).join('')}</ol><p class="nutrition-footnote">飼主需求也可調整順位；未符合的項目略過。此設定用於營養元素判斷，不改變 RER／MER 計算。</p>${editing?'<p class="nutrition-footnote">調整後請儲存；取消會保留原本順序。</p>':''}<p class="nutrition-footnote">此為本機設定示範，尚未接入正式營養判斷流程。</p></div></section>`;
  }
  function redraw(){const panel=document.querySelector('#nutrition-priority');if(panel)panel.outerHTML=render();}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-np-edit')){draft=[...saved];message='';redraw();}
    if(b.hasAttribute('data-np-cancel')){draft=null;message='';redraw();}
    if(b.hasAttribute('data-np-move')&&draft){const from=Number(b.dataset.npMove),to=from+Number(b.dataset.npDirection);if(to<0||to>=draft.length)return;[draft[from],draft[to]]=[draft[to],draft[from]];message='';redraw();document.querySelector(`[data-np-move="${to}"][data-np-direction="${b.dataset.npDirection}"]`)?.focus();}
    if(b.hasAttribute('data-np-save')&&draft){
      if(!valid(draft)){message='順序資料不完整，請重新整理後再試。';failed=true;redraw();return;}
      try{localStorage.setItem(key,JSON.stringify({schema:1,order:draft,updatedAt:new Date().toISOString()}));saved=[...draft];draft=null;message='已儲存優先序（此瀏覽器）。';failed=false;}catch{message='儲存失敗，請重試；目前調整尚未儲存。';failed=true;}redraw();
    }
  });
  return {render};
})();
