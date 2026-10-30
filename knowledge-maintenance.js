/* Customer review prototype: workbook snapshot + browser-local maintenance. */
(() => {
  const esc = v => escapeHtml(String(v ?? ''));
  const key = 'tp-rag-meeting-knowledge-v1';
  let db = structuredClone(knowledgeSeed);
  try { const saved = JSON.parse(localStorage.getItem(key)); if (saved?.schema === 1) db = saved.data; } catch {}
  db.logs ||= []; db.imports ||= [];
  if(!db.datasets.some(d=>d.id===breedSizeSeed.id))db.datasets.push(structuredClone(breedSizeSeed));
  let tab = 'data', type = 'templates', templateId = db.templates[0].id, query = '', status = '全部', notice = '';
  let pending = null, dirty = false, templateDraft = null, importMode = 'create';
  const names = {templates:'營養標準模板',elements:'營養元素',...Object.fromEntries(db.datasets.map(d=>[d.id,d.name]))};
  const button = (label, attrs, primary=false) => `<button type="button" class="${primary?'primary-button':'secondary-button'}" ${attrs}>${esc(label)}</button>`;
  const options = (entries, selected) => entries.map(([v,n])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(n)}</option>`).join('');
  const valueInput = (label, value, attr, numeric=false) => `<label>${esc(label)}<${numeric?'input':'textarea'} ${attr} ${numeric?`type="number" step="any" value="${esc(value)}"`:'rows="2"'}>${numeric?'':esc(value)}</${numeric?'input':'textarea'}></label>`;
  function persist(before, action, target, after) {
    db.logs.unshift({time:new Date().toLocaleString('zh-TW'),actor:'示範管理員',action,target,before:structuredClone(before),after:structuredClone(after),context:{type,templateId:after?.items?after.id:templateId,recordId:after?.id||null,headers:selectedDataset()?.headers||null}});
    try { localStorage.setItem(key,JSON.stringify({schema:1,data:db})); notice='已儲存至本機示範資料。'; }
    catch { notice='本機儲存失敗；變更僅保留於本次畫面，重新整理後可能遺失。'; }
  }
  function redraw() { document.querySelector('#view-content').innerHTML = renderers.rag(); document.querySelectorAll('[data-km-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.kmNav===tab);b.setAttribute('aria-current',b.dataset.kmNav===tab?'page':'false');}); }
  const selectedTemplate = () => db.templates.find(t=>t.id===templateId) || db.templates[0];
  const selectedDataset = () => db.datasets.find(d=>d.id===type);
  const matches = r => (status==='全部'||r.status===status)&&(!query||JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
  function rowsTable(headers, rows) { return rows.length ? table(headers,rows, Math.max(650,headers.length*140)) : '<div class="nutrition-empty">沒有符合條件的資料。</div>'; }
  function short(v) { const s=String(v??'');return `<span title="${esc(s)}">${esc(s.length>65?s.slice(0,65)+'…':s)}</span>`; }
  function tools() {
    return `<fieldset class="km-filter" ${templateDraft?'disabled':''}><div class="km-toolbar"><label>資料類型<select id="km-type">${options(Object.entries(names),type)}</select></label>${type==='templates'?`<label>營養模板<select id="km-template">${options(db.templates.map(t=>[t.id,t.name]),templateId)}</select></label>`:''}<label class="km-search">搜尋<input id="km-query" value="${esc(query)}" placeholder="搜尋名稱、條件或數值"></label><label>狀態<select id="km-status">${options(['全部','啟用','停用'].map(x=>[x,x]),status)}</select></label>${button('搜尋','data-km-search')}${button('匯出','data-km-export')}${button(type==='templates'?'新增模板':type==='elements'?'新增元素':'新增資料','data-km-new',true)}</div></fieldset>`;
  }
  function templateContent() {
    const t=templateDraft||selectedTemplate(),editing=!!templateDraft;
    const actions=editing?button('取消','data-km-template-cancel')+button('儲存變更','data-km-template-save',true):button('編輯','data-km-template-edit',true);
    const head=editing ? `<div class="km-template-editor"><div class="km-editor-top"><label>模板名稱<input data-km-draft-name value="${esc(t.name)}"></label><label>狀態<select data-km-draft-status>${options(['啟用','停用'].map(x=>[x,x]),t.status)}</select></label><div class="km-edit-actions">${actions}</div></div><div class="km-editor-fields"><label>適用對象<input data-km-draft-meta="適用對象" value="${esc(t.meta.適用對象)}"></label><label>計量基準<input data-km-draft-meta="計量基準" value="${esc(t.meta.計量基準)}"></label><label>常見犬種<textarea data-km-draft-meta="常見犬種" rows="2">${esc(t.meta.常見犬種)}</textarea></label><label>備註<textarea data-km-draft-meta="備註" rows="2">${esc(t.meta.備註)}</textarea></label></div></div>` : `<div class="km-template-head"><div><h3>${esc(t.name)} ${badge(t.status)}</h3><dl class="km-meta">${Object.entries(t.meta).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl></div><div class="km-edit-actions">${actions}</div></div>`;

    const rows=t.items.map((r,i)=>({r,i,e:db.elements.find(e=>e.id===r.elementId)})).filter(({r,e})=>editing||e&&matches({...e,value:r.value})).map(({r,i,e})=>{
      const choices=db.elements.filter(x=>x.status==='啟用'||x.id===r.elementId);
      return `<tr><td><code>${esc(e?.id||'待選擇')}</code></td><td>${editing?`<select aria-label="第 ${i+1} 列營養元素" data-km-draft-element="${i}"><option value="">選擇營養元素</option>${options(choices.map(x=>[x.id,x.name]),r.elementId)}</select>`:esc(e.name)}</td><td>${esc(e?.english||'—')}</td><td>${esc(e?.unit||'—')}</td><td>${editing?`<input aria-label="第 ${i+1} 列標準值" data-km-draft-value="${i}" value="${esc(r.value)}">`:esc(r.value===''?'未提供':r.value)}</td><td>${e?badge(e.status):'—'}</td>${editing?`<td>${button('移除',`data-km-remove-reference="${i}"`)}</td>`:''}</tr>`;
    });
    return head+`<div class="km-section-actions"><span>${editing?'編輯中：可一次調整模板資料、引用元素及標準值，儲存後才生效。':'引用營養元素，數值依模板分別設定。'}</span>${editing?button('加入營養元素','data-km-add-reference'):''}</div><p id="km-template-error" role="alert"></p>`+rowsTable(['元素代碼','營養元素','英文名稱','單位','標準值','元素狀態',...(editing?['操作']:[])],rows)+(editing?`<div class="km-edit-footer">${button('取消','data-km-template-cancel')}${button('儲存變更','data-km-template-save',true)}</div>`:'');
  }
  function templateScopeFields(t,inline=false){
    const life=db.datasets.find(d=>d.id==='犬生命階段判斷表'),scope=t.applicability||{};
    return `<div class="km-template-scope"><label>適用體型規則<select ${inline?'data-km-template-life':'name="lifeRuleId"'}>${options([['','待確認'],['all','不限體型'],...life.records.map(r=>[r.id,r.cells[0]+(r.reviewState==='confirmed'?'':'（規則待確認）')])],scope.lifeRuleId||'')}</select></label><label>生命階段<select ${inline?'data-km-template-stage':'name="lifeStage"'}>${options([['','待確認'],['puppy','幼犬'],['adult','成犬'],['senior','高齡犬']],scope.stage||'')}</select></label><p>適用對象文字作為說明；實際條件引用體型規則與生命階段。來源規則未確認時，不標示為可供程式使用。</p></div>`;
  }
  function saveTemplateDraft() {
    try {
      const next=structuredClone(templateDraft);if(next.applicability){const a=next.applicability,life=db.datasets.find(d=>d.id==='犬生命階段判斷表').records.find(r=>r.id===a.lifeRuleId);next.executionEligible=next.status==='啟用'&&!!a.stage&&(a.lifeRuleId==='all'||life?.reviewState==='confirmed');}next.name=next.name.trim();if(!next.name)throw Error('請填寫模板名稱。');
      if(db.templates.some(t=>t.id!==next.id&&t.name===next.name))throw Error('模板名稱已存在。');
      const seen=new Set();
      next.items.forEach((r,i)=>{
        if(!r.elementId||seen.has(r.elementId))throw Error('第 '+(i+1)+' 列：請選擇元素，且不可重複引用。');seen.add(r.elementId);
        const e=db.elements.find(e=>e.id===r.elementId);if(!e)throw Error('元素不存在。');
        if(e.status!=='啟用'&&!selectedTemplate().items.some(x=>x.elementId===r.elementId))throw Error('不可加入停用元素。');
        const raw=String(r.value).trim();
        if(raw!==''&&Number.isFinite(Number(raw))){r.value=Number(raw);if(r.value<0)throw Error('第 '+(i+1)+' 列：數值不可小於零。');}
        else if(raw!==''&&!/^(ND|N\/A|-)$/i.test(raw)&&!/^\d+(?:\.\d+)?(?:\s*[-–:：]\s*\d+(?:\.\d+)?)+$/.test(raw))throw Error('第 '+(i+1)+' 列：請填寫有效數值、ND 或比例／範圍。');else r.value=raw;
      });
      const old=selectedTemplate(),before=structuredClone(old);Object.assign(old,next);persist(before,'整頁編輯模板',next.name,structuredClone(next));templateDraft=null;redraw();
    }catch(err){document.querySelector('#km-template-error').textContent=err.message;document.querySelector('#km-template-error').scrollIntoView({block:'center'});}
  }
  document.addEventListener('input',e=>{
    if(!templateDraft)return;
    if(e.target.hasAttribute('data-km-draft-name'))templateDraft.name=e.target.value;
    if(e.target.hasAttribute('data-km-draft-meta'))templateDraft.meta[e.target.dataset.kmDraftMeta]=e.target.value;
    if(e.target.hasAttribute('data-km-draft-value'))templateDraft.items[Number(e.target.dataset.kmDraftValue)].value=e.target.value;
  });
  document.addEventListener('change',e=>{
    if(!templateDraft)return;
    if(e.target.hasAttribute('data-km-draft-status'))templateDraft.status=e.target.value;if(e.target.hasAttribute('data-km-template-life')){templateDraft.applicability||={};templateDraft.applicability.lifeRuleId=e.target.value;}if(e.target.hasAttribute('data-km-template-stage')){templateDraft.applicability||={};templateDraft.applicability.stage=e.target.value;}
    if(e.target.hasAttribute('data-km-draft-element')){templateDraft.items[Number(e.target.dataset.kmDraftElement)].elementId=e.target.value;redraw();}
  });
  document.addEventListener('click',e=>{
    if(templateDraft&&e.target.closest('[data-view],[data-km-nav],[data-open-rag]')){
      if(!confirm('尚有未儲存的模板修改，確定放棄並離開？')){e.preventDefault();e.stopImmediatePropagation();return;}templateDraft=null;
    }
    if(!e.target.closest('.km-transfer')){const menu=document.querySelector('#km-transfer-menu');if(menu){menu.hidden=true;document.querySelector('[data-km-transfer]').setAttribute('aria-expanded','false');}}
  },true);
  window.addEventListener('beforeunload',e=>{if(templateDraft){e.preventDefault();e.returnValue='';}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.querySelector('#km-transfer-menu');if(menu&&!menu.hidden){menu.hidden=true;const b=document.querySelector('[data-km-transfer]');b.setAttribute('aria-expanded','false');b.focus();}}});
  function dataView() {
    let content='';
    if(type==='templates') {
      content=templateContent();
    } else if(type===breedSizeSeed.id) {
      content=breedContent();
    } else if(type==='elements') {
      content=rowsTable(['元素代碼','中文名稱','英文名稱','單位','別名','使用位置數','狀態','操作'],db.elements.filter(matches).map(e=>`<tr><td><code>${esc(e.id)}</code></td><td>${esc(e.name)}</td><td>${esc(e.english)}</td><td>${esc(e.unit)}</td><td>${esc(e.aliases||'—')}</td><td>${elementUsage(e.id).length}</td><td>${badge(e.status)}</td><td>${button('檢視／編輯',`data-km-element="${esc(e.id)}"`)}</td></tr>`));
    } else {
      const d=selectedDataset(); const indexes=({'活動量加成':[0,1,4,5],'BCS加成':[0,1,3,4],'飲水量清單':[0,1,2,3,4,5],'過敏原清單':[0,1,2,8],'慢性病與遺傳性疾病營養':[0,1,2,4],'排便分類法':[0,1,2],'亞健康觀察清單':[0,1,2]})[d.id]||d.headers.map((_,i)=>i).filter(i=>i<5);
      content=rowsTable([...indexes.map(i=>esc(d.headers[i])),'明細',...(d.id==='犬生命階段判斷表'?['範圍確認']:[]),'狀態','操作'],d.records.filter(matches).sort((a,b)=>d.id==='BCS加成'?parseInt(a.cells[0],10)-parseInt(b.cells[0],10):0).map(r=>`<tr>${indexes.map(i=>`<td>${short(r.cells[i])}</td>`).join('')}<td>${r.rules?.length?r.rules.length+' 項營養規則'+(r.rules.some(x=>!x.elementId)?'／含待確認元素':''):r.children.length?'含 '+r.children.length+' 列適用條件':'—'}</td>${d.id==='犬生命階段判斷表'?`<td>${r.reviewState==='confirmed'?'格式完整':'待補齊'}</td>`:''}<td>${badge(r.status)}</td><td>${button('檢視／編輯',`data-km-record="${esc(r.id)}"`)}</td></tr>`));
    }
    return section('資料維護','依資料類型切換欄位；固定欄位結構，支援新增資料與明細項目。',tools()+content);
  }
  function importView() {
    const upload=`<div class="km-import-flow"><h3>檔案匯入</h3><p>使用固定範本匯入，檢查必填欄位、數值格式與範圍；更新既有資料才進行比對。</p><ol><li>選擇範圍與檔案</li><li>${importMode==='create'?'資料格式檢查':'資料比對與衝突確認'}</li><li>確認處理結果</li><li>查看結果</li></ol><div class="km-toolbar"><label>匯入資料類型<select id="km-import-type">${options(Object.entries(names),type)}</select></label><label>匯入方式<select id="km-import-mode">${options([['create','建立全新資料'],['update','更新既有資料']],importMode)}</select></label>${type==='templates'&&importMode==='update'?`<label>目標營養模板<select id="km-import-template">${options(db.templates.map(t=>[t.id,t.name]),templateId)}</select></label>`:''}${importMode==='create'?'<label>示範結果<select id="km-demo-outcome"><option value="success">匯入成功</option><option value="error">資料格式錯誤</option></select></label>':''}${button('下載匯入範本','data-km-import-template')}${button(importMode==='create'?'選擇檔案並匯入':'選擇檔案並預覽','data-km-import',true)}</div><p class="nutrition-footnote">此版點擊後直接顯示示範結果，不選取真實檔案，也不寫入資料。新資料不顯示既有資料比對與衝突。</p></div>`;
    const rows=db.imports.map((r,i)=>`<tr><td>${esc(r.time)}</td><td>${esc(r.file)}</td><td>${esc(r.scope||'Excel 元素對應示範')}</td><td>${esc(r.count)}</td><td>${esc(r.type?'已匯入本機':'對應確認完成（示範）')}</td><td>${r.type?button('前往資料維護',`data-km-import-result="${i}"`):'—'}</td></tr>`);
    return section('檔案匯入與紀錄','集中處理批次建立／更新資料；手動維護與匯出請至資料維護。',upload)+section('匯入紀錄','查看檔案、處理範圍與結果；欄位前後差異請至異動明細。',rowsTable(['時間','來源檔案','匯入範圍','處理筆數','結果','操作'],rows));
  }
  function logView() {
    const shown=logsForDisplay(),demo=shown.length>0&&shown[0].demo;
    const rows=shown.flatMap((r,i)=>{
      const ctx=logContext(r),changes=changedFields(r.before,r.after).filter(c=>!(ctx?.type==='犬生命階段判斷表'&&(r.after?.conditions||r.after?.lifeProfile)&&c.path[0]==='cells'&&[1,2,3,4].includes(Number(c.path[1]))));
      if(!changes.length)return [];
      const side=which=>`<div class="km-change-list">${changes.map(c=>`<div class="km-change-item"><strong>${esc(fieldLabel(c.path,ctx))}</strong><code class="km-change-key">${esc(c.path.join('.'))}</code><div class="km-change-value">${esc(changeValue(c[which]))}</div></div>`).join('')}</div>`;
      return [`<tr class="km-log-summary"><td class="km-disclosure-cell"><button type="button" data-km-log-toggle="${i}" aria-label="展開異動明細" title="展開異動明細" aria-expanded="false" aria-controls="km-log-detail-${i}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></td><td>${esc(r.time)}<br><small>${esc(r.actor)}</small></td><td>${esc(r.action)}<br><small>${esc(r.target)}</small></td><td>${changes.length} 個欄位<br><small>${esc(changes.slice(0,3).map(c=>fieldLabel(c.path,ctx)).join("、")+(changes.length>3?'，另 '+(changes.length-3)+' 項':''))}</small></td><td><div class="km-log-actions">${ctx?button("前往修改",`data-km-log-edit="${i}" data-km-log-path="${esc(JSON.stringify(changes[0].path))}"`):"來源已無法定位"}</div></td></tr><tr id="km-log-detail-${i}" class="km-log-detail" hidden><td colspan="5"><div class="km-log-comparison"><section><h3>修改前</h3>${side("before")}</section><section><h3>修改後</h3>${side("after")}</section></div></td></tr>`];
    });
    return section('異動明細','每列為一次修改，展開查看本次變更的欄位、Key 與前後值。前往修改會開啟目前資料，不會自動還原舊值。',rowsTable(['<span class="km-sr-only">展開明細</span>','時間／操作者','動作／資料','異動摘要','操作'],rows));
  }
  function logsForDisplay(){
    if(db.logs.some(r=>changedFields(r.before,r.after).length))return db.logs;
    // Presentation-only examples; never insert fabricated history into localStorage.
    const t=db.templates[0],e=db.elements[0],d=db.datasets[0],r=d?.records[0],examples=[];
    if(t){const after=structuredClone(t),before=structuredClone(t);before.meta.備註='調整前的模板備註（示範）';before.meta.適用對象='調整前的適用對象（示範）';before.status=after.status==='啟用'?'停用':'啟用';if(before.items.length)before.items[0].value=typeof after.items[0].value==='number'?after.items[0].value+5:'調整前標準值（示範）';examples.push({demo:true,time:'示範紀錄',actor:'示範管理員',action:'修改模板（示範）',target:t.name,before,after,context:{type:'templates',templateId:t.id}});}
    if(e){const after=structuredClone(e),before=structuredClone(e);before.aliases='調整前別名（示範）';examples.push({demo:true,time:'示範紀錄',actor:'示範管理員',action:'修改元素（示範）',target:e.name,before,after,context:{type:'elements',recordId:e.id}});}
    if(r){const after=structuredClone(r),before=structuredClone(r);before.cells[2]='調整前數值（示範）';examples.push({demo:true,time:'示範紀錄',actor:'示範管理員',action:'修改資料（示範）',target:d.name+' / '+r.cells[0],before,after,context:{type:d.id,recordId:r.id,headers:d.headers}});}
    return examples;
  }
  function changedFields(before,after,path=[]) {
    if(Object.is(before,after))return [];
    if(Array.isArray(before)||Array.isArray(after)) {
      const a=Array.isArray(before)?before:[],b=Array.isArray(after)?after:[];
      const identity=[...a,...b].every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&(x.id||x.elementId));
      if(identity){const id=x=>x.id||x.elementId,am=new Map(a.map(x=>[id(x),x])),bm=new Map(b.map(x=>[id(x),x]));return [...new Set([...am.keys(),...bm.keys()])].flatMap(k=>changedFields(am.get(k),bm.get(k),[...path,String(k)]));}
      return Array.from({length:Math.max(a.length,b.length)},(_,i)=>i).flatMap(i=>changedFields(a[i],b[i],[...path,String(i)]));
    }
    if((before&&typeof before==='object')||(after&&typeof after==='object')) {
      const a=before&&typeof before==='object'?before:{},b=after&&typeof after==='object'?after:{};
      return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&k!=='sourceRows'&&k!=='canonical'&&k!=='decisionBranches'&&k!=='label'&&k!=='source'&&k!=='sourceColumn'&&k!=='sourceNotes'&&k!=='sourceRanges'&&k!=='executionEligible').flatMap(k=>changedFields(a[k],b[k],[...path,k]));
    }
    return [{path,before,after}];
  }
  function changeValue(v){return v===undefined?'（不存在）':v===null?'（未提供）':v===''?'（空白）':typeof v==='boolean'?(v?'是（true）':'否（false）'):String(v);}
  function logContext(r){
    if(r.context)return r.context;
    const value=r.after||r.before;
    if(value?.items)return {type:'templates',templateId:value.id};
    if(value?.english!==undefined)return {type:'elements',recordId:value.id};
    const d=db.datasets.find(d=>d.records.some(x=>x.id===value?.id));return d?{type:d.id,recordId:value.id,headers:d.headers}:null;
  }
  function fieldLabel(path,ctx){
    if(path[0]==='weightStandards'){const w=db.datasets.find(d=>d.id===breedSizeSeed.id)?.weightStandards.find(w=>w.id===path[1]);return (w?.size||'體重分類')+'／'+({min:'體重下限（kg）',max:'體重上限（kg）',minIncluded:'包含下限',maxIncluded:'包含上限'}[path.at(-1)]||path.at(-1));}
    const labels={lifeProfile:'生命階段範圍',weightMinKg:'體重下限（kg）',weightMaxKg:'體重上限（kg）',growthMinMonths:'幼犬月齡下限',growthMaxMonths:'幼犬月齡上限',adultMinMonths:'成年月齡下限',adultMaxMonths:'成年月齡上限',seniorMinMonths:'高齡月齡下限',seniorMaxMonths:'高齡月齡上限',merProfile:'動物狀態',ageBand:'月齡區間',neutered:'結紮狀態',physiology:'生理狀態',gestationWeeks:'懷孕週數',pupCountBand:'哺乳幼犬數',min:'係數下限',max:'係數上限',score:'得分',scale:'滿分',conditionJoin:'條件組合',reviewState:'判斷狀態',executionEligible:'是否可供程式使用',field:'判斷資料',operator:'比較方式',lower:'下限／比較值',upper:'上限',lowerInclusive:'包含下限',upperInclusive:'包含上限',confirmed:'人工確認',choice:'條件值',lifeRuleId:'體型規則',stage:'生命階段',elementId:'營養元素',sourceName:'來源名稱',phase:'生命階段',method:'調整方式',overridable:'允許覆寫',name:'名稱',english:'英文名稱',unit:'單位',aliases:'別名',status:'狀態',value:'標準值'};
    if(path[0]==='meta')return path.slice(1).join('／');
    const cell=path.indexOf('cells');if(cell>=0)return ctx?.headers?.[Number(path[cell+1])]||'欄位 '+(Number(path[cell+1])+1);
    const child=path.indexOf('children');if(child>=0)return '明細第 '+(Number(path[child+1])+1)+' 列／'+(ctx?.headers?.[Number(path[child+2])]||'欄位 '+(Number(path[child+2])+1));
    const cond=path.indexOf('conditions');if(cond>=0){const r=db.datasets.find(d=>d.id===ctx?.type)?.records.find(r=>r.id===ctx?.recordId),c=r?.conditions?.find(c=>c.id===path[cond+1]);return (c?.label||'判斷條件')+'／'+(labels[path.at(-1)]||path.at(-1));}
    const rule=path.indexOf('rules');if(rule>=0){const r=db.datasets.find(d=>d.id===ctx?.type)?.records.find(r=>r.id===ctx?.recordId);const item=r?.rules?.find(x=>x.id===path[rule+1]);const e=db.elements.find(e=>e.id===item?.elementId);return (e?.name||item?.sourceName||'營養規則')+'／'+(path.at(-1)==='value'?'調整值':labels[path.at(-1)]||path.at(-1));}
    const item=path.indexOf('items');if(item>=0){const e=db.elements.find(e=>e.id===path[item+1]);return (e?.name||path[item+1])+'／'+(labels[path.at(-1)]||path.at(-1));}
    return labels[path.at(-1)]||path.at(-1)||'資料';
  }
  function editFromLog(index,path){
    const r=logsForDisplay()[index],ctx=logContext(r);if(!ctx)return;type=ctx.type;tab='data';query='';status='全部';
    if(type===breedSizeSeed.id&&r.after?.weightStandards){redraw();editWeightStandards();return;}
    if(type==='templates'){
      const t=db.templates.find(t=>t.id===ctx.templateId);if(!t){notice='找不到目前模板，請確認資料是否仍存在。';redraw();return;}
      templateId=t.id;templateDraft=structuredClone(t);redraw();
      let field=path[0]==='meta'?document.querySelector(`[data-km-draft-meta="${CSS.escape(path[1])}"]`):path[0]==='name'?document.querySelector('[data-km-draft-name]'):path[0]==='status'?document.querySelector('[data-km-draft-status]'):null;
      const item=path.indexOf('items');if(item>=0){const pos=t.items.findIndex(x=>x.elementId===path[item+1]);if(pos>=0)field=document.querySelector(`[data-km-draft-value="${pos}"]`);}
      field?.scrollIntoView({block:'center'});field?.focus({preventScroll:true});
    }else if(type==='elements'){
      redraw();if(db.elements.some(e=>e.id===ctx.recordId)){editElement(ctx.recordId);document.querySelector(`#km-dialog [name="${CSS.escape(path.at(-1))}"]`)?.focus();}
      else {notice='此元素已不存在，請確認目前資料。';redraw();}
    }else{
      const d=selectedDataset();redraw();const id=ctx.recordId||path.find(k=>d.records.some(x=>x.id===k));
      if(id&&d.records.some(x=>x.id===id)){editRecord(id);const c=path.indexOf('cells'),child=path.indexOf('children');const name=c>=0?'c'+path[c+1]:child>=0?'r'+path[child+1]+'-'+path[child+2]:path.at(-1);let field=document.querySelector(`#km-dialog [name="${CSS.escape(name)}"]`);if(path[0]==='lifeProfile')field=document.querySelector(`#km-dialog [name="life-${CSS.escape(path.at(-1))}"]`);const conditionIndex=path.indexOf('conditions');if(conditionIndex>=0){const record=d.records.find(x=>x.id===id),n=record.conditions?.findIndex(x=>x.id===path[conditionIndex+1]);if(n>=0){const card=document.querySelector(`[data-condition-index="${n}"]`);card.open=true;field=card.querySelector(`[name="condition${n}-${CSS.escape(path.at(-1))}"]`);}}const pos=path.indexOf('rules');if(pos>=0){const record=d.records.find(x=>x.id===id),n=record.rules?.findIndex(x=>x.id===path[pos+1]);if(n>=0){const card=document.querySelectorAll('[data-rule-row]')[n];card.open=true;const suffix={value:'value',elementId:'element',phase:'phase',method:'method',overridable:'override'}[path.at(-1)];field=card.querySelector(`[name="rule${n}-${suffix}"]`);}}field?.scrollIntoView({block:'center'});field?.focus({preventScroll:true});}
      else {notice='請從目前資料清單選擇要修正的項目。';redraw();}
    }
  }
  renderers.rag = () => `<div class="nutrition-library km-library">${notice?`<div class="nutrition-message" role="status">${esc(notice)}</div>`:''}${tab==='data'?dataView():tab==='imports'?importView():logView()}<p class="nutrition-footnote">資料來自假資料 Excel，操作僅儲存在此瀏覽器；尚未串接正式資料庫、推薦計算或 RAG 索引。</p></div>`;
  Object.assign(modules.find(m=>m.id==='rag'),{subtitle:'維護營養模板、共用元素與各類規則，查詢匯入來源及異動明細。'});
  const oldRenderNav=renderNav;
  renderNav=()=>{oldRenderNav();const nav=document.querySelector('[data-view="rag"]');const group=document.createElement('details');group.className='km-nav';group.open=true;nav.before(group);group.innerHTML='<summary class="nav-item"><span class="nav-index">01</span><span class="nav-label">知識庫與檔案匯入管理</span><span class="km-caret" aria-hidden="true">▾</span></summary>'+[['data','資料維護'],['imports','檔案匯入與紀錄'],['logs','異動明細']].map(([id,n])=>`<button type="button" data-km-nav="${id}">${n}</button>`).join('');nav.remove();};
  function closeDialog(force=false) {
    if(!force&&dirty&&!confirm('尚有未儲存的修改，確定放棄？'))return;
    document.querySelector('#km-dialog')?.remove(); dirty=false;
  }
  function dialog(title, body, onSave) {
    closeDialog(true);const d=document.createElement('dialog');d.id='km-dialog';d.className='km-dialog';
    d.innerHTML=`<form><header><h2>${esc(title)}</h2>${button('關閉','data-km-close')}</header>${body}<p id="km-error" role="alert"></p><footer>${button('取消','data-km-close')}<button class="primary-button" type="submit">儲存</button></footer></form>`;
    document.body.append(d);d.showModal();d.addEventListener('input',()=>dirty=true);d.addEventListener('change',()=>dirty=true);d.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
    d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();try{onSave(new FormData(e.target));closeDialog(true);redraw();}catch(err){d.querySelector('#km-error').textContent=err.message;}});
  }
  const statusField=s=>`<label>狀態<select name="status">${options(['啟用','停用'].map(x=>[x,x]),s)}</select></label>`;
  const ruleTypes={
    '慢性病與遺傳性疾病營養':{target:5,phase:6,prop:7,value:8,base:[0,1,2,3,4,9,10,11,12]},
    '排便分類法':{target:4,prop:5,value:6,base:[0,1,2,3,7,8]},
    '亞健康觀察清單':{target:6,prop:7,value:8,base:[0,1,2,3,4,5]}
  };
  const numericCols={'ＭＥＲ係數':[2],'活動量加成':[5],'BCS加成':[4],'飲水量清單':[0,1,2,3,4,5],'排便分類法':[0]};
  const longCols={'活動量加成':[3,4],'BCS加成':[2],'過敏原清單':[4,5,6,7,8],'慢性病與遺傳性疾病營養':[3,4,9,10,11,12],'排便分類法':[1,3,7,8],'亞健康觀察清單':[2,3,4,5]};
  function findElement(raw){
    const norm=v=>String(v||'').replace(/[\s＋：]/g,c=>c==='＋'?'+':c==='：'?':':'').toLowerCase();
    const formula=String(raw||'').match(/^(.+?)[：:]\s*x\s*\*/i);const n=norm(formula?formula[1]:raw),hits=db.elements.filter(e=>{
      const aliases=[e.name,e.english,...String(e.aliases||'').split(/[,，]/),...e.english.split(',').map(x=>x.trim())];
      if(e.english==='Vitamin B-12')aliases.push('B-12');const vitamin=e.name.match(/維生素\s*([ABDEK](?:\d+)?)/i);if(vitamin)aliases.push('Vitamin '+vitamin[1]);
      if(e.name.includes('EPA')&&e.name.includes('DHA')&&e.unit==='g')aliases.push('EPA+DHA');
      if(e.unit==='ratio'&&e.name.includes('LA'))aliases.push('LA+AA:ALA+EPA+DHA','LA+AA:ALA+EPA+DHA ratio');
      return aliases.some(a=>norm(a)===n);
    });return hits.length===1?hits[0]:null;
  }
  function ensureNutritionRules(){
    for(const d of db.datasets)if(d.id!=='犬生命階段判斷表')for(const r of d.records)for(const key of ['conditions','conditionJoin','reviewState','executionEligible','decisionBranches'])delete r[key];
    const bcs=db.datasets.find(d=>d.id==='BCS加成');if(bcs){const extra=[];for(const r of bcs.records){r.children.forEach((row,i)=>{const id=r.id+'-variant-'+i;if(!bcs.records.some(x=>x.id===id)){const v={...structuredClone(r),id,cells:structuredClone(row),children:[]};for(const k of ['conditions','reviewState','executionEligible','decisionBranches'])delete v[k];extra.push(v);}});r.children=[];}bcs.records.push(...extra);for(const r of bcs.records){r.bcsScore={score:parseInt(r.cells[0],10),scale:9};if(r.conditions?.some(c=>c.field==='bcs'||c.sourceColumn===0)){r.conditions=r.conditions.filter(c=>c.field!=='bcs'&&c.sourceColumn!==0);r.reviewState='pending';r.executionEligible=false;r.decisionBranches=[];}}bcs.records.sort((a,b)=>a.bcsScore.score-b.bcsScore.score);}
    const life=db.datasets.find(d=>d.id==='犬生命階段判斷表');for(const r of life.records){const notes=r.children.filter(row=>!row[0]);if(notes.length){r.sourceNotes=notes;r.children=r.children.filter(row=>row[0]);}}
    for(const d of db.datasets){const cfg=ruleTypes[d.id];if(!cfg)continue;
      for(const r of d.records){if(r.rules){for(const rule of r.rules)if(!rule.elementId){const element=findElement(rule.sourceName);if(element)rule.elementId=element.id;}continue;}
        const rows=[r.cells,...r.children],rules=[];let last;
        cfg.base.forEach(i=>{if(r.cells[i]===''||r.cells[i]==null){const row=rows.find(x=>x[i]!==''&&x[i]!=null);if(row)r.cells[i]=row[i];}});
        for(const row of rows){const prop=String(row[cfg.prop]||'').trim(),raw=String(row[cfg.target]||'').trim();
          if(prop==='multiplier'&&raw&&raw!=='pass'){
            const e=findElement(raw);last={id:r.id+'-rule-'+rules.length,elementId:e?.id||'',sourceName:raw,phase:cfg.phase!=null&&['Puppy','Adult'].includes(row[cfg.phase])?row[cfg.phase]:'',method:String(row[cfg.value]||'').includes(':')?'ratio':'multiplier',value:row[cfg.value]??'',overridable:null};rules.push(last);
          }else if(prop==='isOverridable'&&last)last.overridable=row[cfg.value]===true||String(row[cfg.value]).toLowerCase()==='true';
        }
        r.rules=rules;r.sourceRows=structuredClone(rows);r.children=[];
      }
    }
  }
  function elementUsage(id){return [...db.templates.filter(t=>t.items.some(r=>r.elementId===id)).map(t=>'模板／'+t.name),...db.datasets.flatMap(d=>d.records.filter(r=>r.rules?.some(rule=>rule.elementId===id)).map(r=>d.name+'／'+(r.cells[1]||r.cells[0])))];}
  function recordControl(d,i,value,name){
    const label=d.headers[i].trim(),numeric=numericCols[d.id]?.includes(i),long=longCols[d.id]?.includes(i),wide=long&&((d.id==='亞健康觀察清單'&&i===2)||(d.id==='過敏原清單'&&i===8));
    let control;
    if(d.id==='BCS加成'&&i===0)control=`<select name="${name}" required><option value="">請選擇分數</option>${options(Array.from({length:9},(_,n)=>[String(n+1)+'/9',String(n+1)+' 分（滿分 9 分）']),String(value||''))}</select>`;
    else if(d.id==='慢性病與遺傳性疾病營養'&&i===2)control=`<select name="${name}">${options([...new Set(['慢性病','遺傳性疾病',String(value||'')])].filter(Boolean).map(x=>[x,x]),String(value||'慢性病'))}</select>`;
    else if(numeric)control=`<input type="${d.id==='ＭＥＲ係數'?'text':'number'}" step="any" name="${name}" value="${esc(value===''||value==null?'':(d.id==='ＭＥＲ係數'?value:Number(String(value).replace(/＋/g,'+').replace(/−/g,'-'))))}" ${d.id==='飲水量清單'?'min="0"':''}>`;
    else if(long)control=`<textarea name="${name}" rows="3">${esc(value)}</textarea>`;
    else control=`<input type="text" name="${name}" value="${esc(value)}" ${i===0?'required':''}>`;
    return `<label class="${wide?'km-field-wide':''}">${esc(label)}${control}</label>`;
  }
  function ruleCard(rule,index){
    const selected=db.elements.find(e=>e.id===rule.elementId),choices=db.elements.filter(e=>e.status==='啟用'||e.id===rule.elementId);
    return `<details class="km-rule-card" data-rule-row ${!rule.sourceName?'open':''}><summary><span>規則 ${index+1} · ${esc(selected?.name||rule.sourceName||'新增營養調整')}</span><small>${esc(rule.phase||'不限階段')} · ${rule.method==='ratio'?'比例':'倍率'} ${esc(rule.value)}${!selected&&rule.sourceName?' · 待確認元素':''}</small></summary><input type="hidden" name="rule${index}-id" value="${esc(rule.id)}"><div class="km-record-grid"><label>營養元素<select name="rule${index}-element" data-rule-element><option value="">${esc(rule.sourceName?'待確認：'+rule.sourceName:'請選擇營養元素')}</option>${options(choices.map(e=>[e.id,e.name+(e.unit?'（'+e.unit+'）':'')]),rule.elementId)}</select>${!selected&&rule.sourceName?`<small class="km-unresolved">保留來源「${esc(rule.sourceName)}」，請人工確認對應，不自動合併。</small>`:''}</label><label>適用生命階段<select name="rule${index}-phase">${options([['','不指定'],['Puppy','幼犬'],['Adult','成犬']],rule.phase)}</select></label><label>調整方式<select name="rule${index}-method">${options([['multiplier','倍率'],['ratio','指定比例']],rule.method)}</select></label><label>調整值<input name="rule${index}-value" value="${esc(rule.value)}" placeholder="例如 1.2 或 1:1"></label><label>允許其他規則覆寫<select name="rule${index}-override">${options([['','未指定'],['true','允許'],['false','不允許']],rule.overridable==null?'':String(rule.overridable))}</select></label></div><div class="km-rule-actions">${button('移除此規則','data-rule-remove')}</div></details>`;
  }
  const conditionFields={estimatedAdultWeight:{label:'預估成犬體重',unit:'kg'},weight:{label:'目前體重',unit:'kg'},age:{label:'目前年齡',unit:'month'},bcs:{label:'BCS 評分',unit:'score'},activityMinutes:{label:'每日活動時間',unit:'minute'},stage:{label:'生命階段',unit:'enum',values:[['puppy','幼犬'],['adult','成犬'],['senior','高齡犬']]},neutered:{label:'結紮狀態',unit:'enum',values:[['true','已結紮'],['false','未結紮']]},species:{label:'物種',unit:'enum',values:[['dog','犬'],['cat','貓']]}};
  function sourceConditions(d,r){
    if(d.id!=='犬生命階段判斷表')return [];
    if(r.conditions)return structuredClone(d.id==='BCS加成'?r.conditions.filter(c=>c.field!=='bcs'&&c.sourceColumn!==0):r.conditions);
    const indexes=d.id==='犬生命階段判斷表'?[1,2,3,4]:d.id==='ＭＥＲ係數'?[1]:d.id==='活動量加成'?[3,4]:d.id==='BCS加成'?[3]:[];
    return indexes.map((col,n)=>{
      const source=String(r.cells[col]??'').trim(),field=d.id==='犬生命階段判斷表'?(col===1?'estimatedAdultWeight':'age'):d.id==='BCS加成'&&col===0?'bcs':'';
      const c={id:'condition-'+n,label:d.headers[col],source,sourceColumn:col,field,operator:'between',lower:'',upper:'',lowerInclusive:'',upperInclusive:'',unit:field==='age'?(/歲/.test(source)?'year':'month'):conditionFields[field]?.unit||'',confirmed:false};
      const text=source.replace(/\s/g,'');let match;
      if((match=text.match(/^(≤|<=|≥|>=|<|>)(\d+(?:\.\d+)?)/))){c.operator={'≤':'lte','<=':'lte','≥':'gte','>=':'gte','<':'lt','>':'gt'}[match[1]];if(['lt','lte'].includes(c.operator))c.upper=Number(match[2]);else c.lower=Number(match[2]);}
      else if((match=text.match(/^(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)/))&&!text.includes('以上')){c.lower=Number(match[1]);c.upper=Number(match[2]);}
      else if((match=text.match(/^(\d+(?:\.\d+)?)(?:月齡|個月|歲)(以上|後)$/))){c.lower=Number(match[1]);c.operator=match[2]==='以上'?'gte':'gt';}
      else if(field==='bcs'&&(match=text.match(/^(\d+)\/9$/))){c.operator='eq';c.lower=Number(match[1]);}
      return c;
    });
  }
  const merChoices={stage:[['','未指定'],['puppy','幼犬'],['adult','成犬']],ageBand:[['','不適用'],['under4','4 個月以下'],['from4ToAdult','4 個月以上至成犬前'],['from4To12','4 個月以上、12 個月以下'],['from12','12 個月以上']],neutered:[['','不限定'],['false','未絕育'],['true','已絕育']],physiology:[['normal','一般'],['pregnant','懷孕'],['lactating','哺乳']],gestationWeeks:[['','請選擇'],['1to6','第 1–6 週'],['7to9','第 7–9 週']],pupCountBand:[['','請選擇'],['1to2','1–2 隻幼犬'],['3to4','3–4 隻幼犬'],['5to6','5–6 隻幼犬'],['7to8','7–8 隻幼犬']]};
  function merProfile(r){
    if(r.merProfile)return structuredClone(r.merProfile);
    const raw=String(r.cells[1]||'').replace(/\s/g,''),p={stage:'',ageBand:'',neutered:'',physiology:'normal',gestationWeeks:'',pupCountBand:''};
    const source=knowledgeSeed.datasets.find(d=>d.id==='ＭＥＲ係數').records.find(x=>String(x.cells[1]).replace(/\s/g,'')===raw);
    const n=source?Number(String(source.cells[0]).split('_').at(-1)):0;
    if(n>=1&&n<=6){p.stage=n<=4?'puppy':'adult';p.ageBand=n<=2?'under4':n===3?'from4ToAdult':n===4?'from4To12':'from12';p.neutered=n%2===1?'false':'true';}
    if(n===7||n===8){p.physiology='pregnant';p.gestationWeeks=n===7?'1to6':'7to9';}
    if(n>=9&&n<=12){p.physiology='lactating';p.pupCountBand=['1to2','3to4','5to6','7to8'][n-9];}
    return p;
  }
  function merFields(r){
    const p=merProfile(r),labels={stage:'生命階段',ageBand:'月齡區間',neutered:'結紮狀態',physiology:'生理狀態',gestationWeeks:'懷孕週數',pupCountBand:'哺乳幼犬數'};
    const value=String(r.cells[2]??''),parts=value.split(/[-–]/),lo=parts[0]||'',hi=parts[1]||lo;
    return `<section class="km-record-section km-mer-fields"><h3>動物狀態</h3><p class="nutrition-footnote">固定欄位與選項，匯入時填入對應欄位即可。</p><div class="km-record-grid">${['physiology','stage','ageBand','neutered','gestationWeeks','pupCountBand'].map(k=>`<label data-mer-field="${k}">${labels[k]}<select name="mer-${k}">${options(merChoices[k],p[k])}</select></label>`).join('')}</div><details class="km-source-notes"><summary>查看來源文字</summary><p>${esc(r.cells[1]||'無')}</p></details></section><section class="km-record-section"><h3>MER 係數</h3><div class="km-record-grid"><label>係數下限<input name="mer-min" type="number" min="0" step="any" value="${esc(lo)}" required></label><label>係數上限<input name="mer-max" type="number" min="0" step="any" value="${esc(hi)}" required></label></div><p class="nutrition-footnote">固定係數時，上下限填相同數值。</p></section>`;
  }
  function updateMerFields(){
    const physiology=document.querySelector('[name="mer-physiology"]')?.value;
    document.querySelectorAll('[data-mer-field]').forEach(label=>{const k=label.dataset.merField,visible=k==='physiology'||(physiology==='normal'?['stage','ageBand','neutered'].includes(k):physiology==='pregnant'?k==='gestationWeeks':k==='pupCountBand');label.hidden=!visible;label.querySelector('select').disabled=!visible;});
  }
  function conditionCard(c,i){
    return `<details class="km-condition-card" data-condition-index="${i}" ${i===0?'open':''}><summary><strong>${esc(c.label||'判斷條件 '+(i+1))}</strong><span data-condition-state>${c.confirmed?'已確認':'待確認'}</span><small>${esc(c.source||'手動設定')}</small></summary><p class="km-condition-source">來源原文：${esc(c.source||'手動新增，無來源文字')}</p><div class="km-record-grid"><label>判斷資料<input type="hidden" name="condition${i}-field" value="${esc(c.field)}"><input readonly value="${esc(conditionFields[c.field]?.label||c.label)}"></label><label>比較方式<select name="condition${i}-operator">${options([['between','介於兩值'],['lt','小於 ＜'],['lte','小於等於 ≤'],['gt','大於 ＞'],['gte','大於等於 ≥'],['eq','等於 ＝']],c.operator)}</select></label><label data-condition-choice hidden>條件值<select name="condition${i}-choice"><option value="">請選擇</option>${options((conditionFields[c.field]?.values||[]),c.choice||'')}</select></label><label>下限／比較值<input type="number" step="any" min="0" name="condition${i}-lower" value="${esc(c.lower)}"></label><label>上限<input type="number" step="any" min="0" name="condition${i}-upper" value="${esc(c.upper)}"></label><label>下限邊界<select name="condition${i}-lowerInclusive">${options([['','請確認'],['true','包含下限'],['false','不包含下限']],String(c.lowerInclusive))}</select></label><label>上限邊界<select name="condition${i}-upperInclusive">${options([['','請確認'],['true','包含上限'],['false','不包含上限']],String(c.upperInclusive))}</select></label><label>單位<select name="condition${i}-unit">${options(c.field==='age'?[['month','月齡'],['year','歲']]:[['kg','公斤 kg']],c.unit)}</select></label></div><label class="km-condition-confirm"><input type="checkbox" name="condition${i}-confirmed" ${c.confirmed?'checked':''}>已確認這個條件的對象、單位與邊界</label><p data-condition-hint class="nutrition-footnote"></p></details>`;
  }
  function updateConditionControls(card){
    const i=card.dataset.conditionIndex,op=card.querySelector(`[name="condition${i}-operator"]`).value;
    const get=k=>card.querySelector(`[name="condition${i}-${k}"]`);
    get('lower').disabled=['lt','lte'].includes(op);get('upper').disabled=['gt','gte','eq'].includes(op);
    get('lowerInclusive').disabled=op!=='between';get('upperInclusive').disabled=op!=='between';
    card.querySelector('[data-condition-state]').textContent=card.querySelector('input[type=checkbox]').checked?'已確認':'待確認';
    const field=get('field').value,expected=conditionFields[field]?.unit,enumMode=expected==='enum';const choice=get('choice'),choiceBox=card.querySelector('[data-condition-choice]');if(choice.dataset.field!==field){choice.innerHTML='<option value="">請選擇</option>'+options(conditionFields[field]?.values||[],choice.value);choice.dataset.field=field;}choiceBox.hidden=!enumMode;choice.disabled=!enumMode;for(const k of ['lower','upper','lowerInclusive','upperInclusive','unit']){get(k).closest('label').hidden=enumMode;if(enumMode)get(k).disabled=true;}get('lower').closest('label').hidden=enumMode||['lt','lte'].includes(op);get('upper').closest('label').hidden=enumMode||['gt','gte','eq'].includes(op);get('lowerInclusive').closest('label').hidden=enumMode||op!=='between';get('upperInclusive').closest('label').hidden=enumMode||op!=='between';get('operator').disabled=enumMode;if(enumMode)get('operator').value='eq';else get('unit').disabled=false;
    card.querySelector('[data-condition-hint]').textContent=enumMode?'以固定選項保存，供程式精確比對。':op==='between'?'範圍兩端是否包含必須明確指定；來源有歧義時，先儲存為待確認。':`只填寫${['lt','lte'].includes(op)?'上限':'下限／比較值'}，包含邊界由比較方式決定。${expected?'請使用'+(field==='age'?'月齡或歲':expected)+'。':''}`;
  }
  function readConditions(form,original){
    return [...document.querySelectorAll('[data-condition-index]')].map(card=>{
      const i=Number(card.dataset.conditionIndex),base=original[i]||{id:'condition-'+Date.now()+'-'+i,source:'',label:'手動條件',sourceColumn:null};
      const get=k=>form.get('condition'+i+'-'+k),op=conditionFields[get('field')]?.unit==='enum'?'eq':get('operator'),confirmed=get('confirmed')==='on',number=k=>get(k)==null||get(k)===''?'':Number(get(k));
      const next={...base,field:get('field'),operator:op,unit:get('unit'),lower:['lt','lte'].includes(op)?'':number('lower'),upper:['gt','gte','eq'].includes(op)?'':number('upper'),lowerInclusive:op==='between'?get('lowerInclusive'):['gte','eq'].includes(op)?'true':'false',upperInclusive:op==='between'?get('upperInclusive'):['lte','eq'].includes(op)?'true':'false',confirmed};
      const enumMode=conditionFields[next.field]?.unit==='enum';if(enumMode){next.unit='enum';next.choice=get('choice');next.lower='';next.upper='';}
      const missing=enumMode?!next.choice:!next.field||!next.unit||(op==='between'&&(next.lower===''||next.upper===''||next.lowerInclusive===''||next.upperInclusive===''))||(['lt','lte'].includes(op)?next.upper==='':next.lower==='');
      const invalid=[next.lower,next.upper].some(v=>v!==''&&(!Number.isFinite(v)||v<0))||(op==='between'&&next.lower!==''&&next.upper!==''&&(next.lower>next.upper||(next.lower===next.upper&&(next.lowerInclusive!=='true'||next.upperInclusive!=='true'))));
      const unitMismatch=enumMode?false:next.field==='age'?!['year','month'].includes(next.unit):next.field&&conditionFields[next.field].unit!==next.unit;
      if(invalid)throw Error('條件 '+(i+1)+' 的上下限不正確。');
      if(confirmed&&(missing||unitMismatch))throw Error('條件 '+(i+1)+' 尚缺判斷資料、數值、邊界或相符單位，請補齊或取消確認。');
      next.canonical=confirmed&&enumMode?{field:next.field,operator:'eq',value:next.choice}:confirmed?{field:next.field==='age'?'ageMonths':next.field,operator:op,lower:next.lower===''?null:next.lower*(next.unit==='year'?12:1),upper:next.upper===''?null:next.upper*(next.unit==='year'?12:1),lowerInclusive:next.lowerInclusive==='true',upperInclusive:next.upperInclusive==='true',unit:next.unit==='year'?'month':next.unit}:null;
      return next;
    });
  }
  function conditionSummary(c){
    if(!c.confirmed||!c.canonical)return '待確認：'+(c.source||c.label);
    if(c.unit==='enum')return conditionFields[c.field].label+' = '+(conditionFields[c.field].values.find(x=>x[0]===c.choice)?.[1]||c.choice);
    const units={kg:'kg',month:'月齡',year:'歲',score:'分',minute:'分鐘／日'},label=conditionFields[c.field]?.label||c.field;
    return c.operator==='between'?`${label} ${c.lowerInclusive==='true'?'≥':'>'}${c.lower} 且 ${c.upperInclusive==='true'?'≤':'<'}${c.upper} ${units[c.unit]}`:`${label} ${{lt:'<',lte:'≤',gt:'>',gte:'≥',eq:'='}[c.operator]}${['lt','lte'].includes(c.operator)?c.upper:c.lower} ${units[c.unit]}`;
  }
  function validateLifeBranches(conditions,excludeId){
    const weight=conditions.find(c=>c.sourceColumn===1),ages=[2,3,4].map(i=>conditions.find(c=>c.sourceColumn===i));
    if(weight?.field!=='estimatedAdultWeight'||ages.some(c=>c?.field!=='age'))throw Error('生命階段的體重條件須使用預估成犬體重，三個階段須使用目前年齡。');
    const interval=c=>{const r=c.canonical;return {lo:['lt','lte'].includes(r.operator)?0:r.lower,hi:['gt','gte'].includes(r.operator)?Infinity:r.operator==='eq'?r.lower:r.upper,li:['lt','lte'].includes(r.operator)?true:r.lowerInclusive,ui:r.operator==='eq'?true:r.upperInclusive};};
    const ranges=ages.map(interval);const w=interval(weight);for(const other of db.datasets.find(d=>d.id==='犬生命階段判斷表').records){if(other.id===excludeId||other.reviewState!=='confirmed')continue;const condition=other.conditions?.find(c=>c.sourceColumn===1);if(!condition?.canonical)continue;const b=interval(condition),lo=Math.max(w.lo,b.lo),hi=Math.min(w.hi,b.hi);if(lo<hi||(lo===hi&&(lo!==w.lo||w.li)&&(lo!==b.lo||b.li)&&(hi!==w.hi||w.ui)&&(hi!==b.hi||b.ui)))throw Error('體重範圍與 '+other.cells[0]+' 的已確認規則重疊，請檢查邊界。');}
    for(let i=0;i<2;i++){
      const a=ranges[i],b=ranges[i+1];
      if(a.hi>b.lo||(a.hi===b.lo&&a.ui&&b.li))throw Error(ages[i].label+' 與 '+ages[i+1].label+' 的年齡範圍重疊，請調整端點。');
      if(a.hi<b.lo||(a.hi===b.lo&&!a.ui&&!b.li))throw Error(ages[i].label+' 與 '+ages[i+1].label+' 之間有年齡空缺，請確認銜接方式。');
    }
  }
  const breedSizes=['超小型犬','小型犬','中型犬','大型犬','超大型犬'];
  function breedContent(){
    const d=selectedDataset();
    const breeds=rowsTable(['犬種／尺寸','判定方式','預設體型','例外／備援','狀態','操作'],d.records.filter(matches).map(r=>`<tr><td><strong>${esc(r.cells[0])}</strong>${r.cells[1]?`<small class="km-breed-sub">${esc(r.cells[1])}</small>`:''}</td><td>${esc(r.cells[2])}</td><td>${esc(r.cells[3]||'依體重標準')}</td><td>${r.cells[4]?'公犬 → '+esc(r.cells[4]):r.cells[5]?'缺少體重 → '+esc(r.cells[5]):'—'}</td><td>${badge(r.status)}</td><td>${button('檢視／編輯',`data-km-record="${esc(r.id)}"`)}</td></tr>`));
    const edge=(v,included,lower)=>v===''?'不限':(included==='待確認'?'邊界待確認：':included==='包含'?(lower?'≥ ':'≤ '):(lower?'> ':'< '))+v+' kg';
    return `<div class="km-section-actions"><div><h3>犬種對應與例外</h3><span>先查犬種與尺寸，套用性別例外或體重標準後，取得最終體型。</span></div></div>${breeds}<details class="km-breed-standards" open><summary>體重分類標準 <small>僅供「依體重判定」引用</small></summary><div class="km-section-actions"><span>成年理想體重參考；邊界待確認時，不自動判定該端點。</span>${button('編輯體重標準','data-km-weight-standards')}</div>${rowsTable(['體型','體重下限','體重上限'],d.weightStandards.map(w=>`<tr><td>${esc(w.size)}</td><td>${esc(edge(w.min,w.minIncluded,true))}</td><td>${esc(edge(w.max,w.maxIncluded,false))}</td></tr>`))}</details>`;
  }
  function editBreed(id){
    const d=selectedDataset(),old=d.records.find(r=>r.id===id),r=old||{id:'breed-'+Date.now(),cells:['','','直接指定','','','',''],children:[],status:'啟用'};
    const select=(label,name,items,value)=>`<label>${label}<select name="${name}">${options(items.map(x=>[x,x]),value)}</select></label>`;
    dialog(old?'犬種與體型 · 檢視／編輯':'新增犬種與體型',`<section class="km-record-section"><h3>犬種資料</h3><div class="km-record-grid"><label>犬種<input name="breed" value="${esc(r.cells[0])}" required></label><label>尺寸<input name="size" value="${esc(r.cells[1])}" placeholder="如玩具、迷你、標準；無區分可留白"></label>${select('判定方式','mode',['直接指定','依體重判定'],r.cells[2])}${statusField(r.status)}</div></section><section class="km-record-section"><h3>體型判定</h3><div class="km-record-grid"><div data-breed-direct>${select('預設體型','defaultSize',['',...breedSizes],r.cells[3])}</div><div data-breed-direct>${select('公犬例外體型','maleSize',['',...breedSizes],r.cells[4])}</div><div data-breed-weight>${select('缺少體重時暫用體型','fallbackSize',['',...breedSizes],r.cells[5])}</div></div><p class="nutrition-footnote" data-breed-direct>有設定公犬例外時，公犬採用例外體型，其餘採用預設體型。</p><p class="nutrition-footnote" data-breed-weight>引用下方共用體重標準；無體重且未設定暫用體型時，需補齊資料。</p></section><section class="km-record-section"><label>備註<textarea rows="2" name="note">${esc(r.cells[6])}</textarea></label></section>`,f=>{
      const mode=f.get('mode'),breed=f.get('breed').trim(),size=f.get('size').trim();
      if(!breed)throw Error('請填寫犬種。');
      if(d.records.some(x=>x.id!==r.id&&x.cells[0]===breed&&x.cells[1]===size))throw Error('相同犬種與尺寸已存在。');
      if(mode==='直接指定'&&!f.get('defaultSize'))throw Error('請選擇預設體型。');
      const next={...r,cells:[breed,size,mode,mode==='直接指定'?f.get('defaultSize'):'',mode==='直接指定'?f.get('maleSize'):'',mode==='依體重判定'?f.get('fallbackSize'):'',f.get('note').trim()],status:f.get('status')};
      const before=old?structuredClone(old):null;if(old)Object.assign(old,next);else d.records.push(next);persist(before,old?'修改犬種體型':'新增犬種體型',breed+(size?'／'+size:''),next);
    });
    document.querySelector('#km-dialog').classList.add('km-record-dialog');
    const update=()=>{const weight=document.querySelector('[name="mode"]').value==='依體重判定';document.querySelectorAll('[data-breed-direct]').forEach(el=>el.hidden=weight);document.querySelectorAll('[data-breed-weight]').forEach(el=>el.hidden=!weight);};update();document.querySelector('[name="mode"]').addEventListener('change',update);
  }
  function editWeightStandards(){
    const d=selectedDataset(),standards=d.weightStandards;
    const boundary=(name,value,unlimited)=>`<select aria-label="邊界是否包含" name="${name}" ${unlimited?'disabled':''}>${options((unlimited?['不適用']:['待確認','包含','不包含']).map(x=>[x,x]),value)}</select>`;
    dialog('編輯體重分類標準',`<p class="nutrition-footnote">固定五種體型，單位為 kg。上限留白表示不限；相鄰區間不得重疊或留空缺。</p><div class="km-weight-editor">${standards.map((w,i)=>`<section class="km-record-section"><h3>${esc(w.size)}</h3><div class="km-record-grid"><label>下限（kg）<input type="number" min="0" step="any" name="w${i}-min" value="${w.min}" required>${boundary('w'+i+'-minIncluded',w.minIncluded,false)}</label><label>上限（kg）<input type="number" min="0" step="any" name="w${i}-max" value="${w.max}" placeholder="不限">${boundary('w'+i+'-maxIncluded',w.maxIncluded,w.max==='')}</label></div></section>`).join('')}</div>`,f=>{
      const next=standards.map((w,i)=>({...w,min:Number(f.get('w'+i+'-min')),max:f.get('w'+i+'-max').trim()===''?'':Number(f.get('w'+i+'-max')),minIncluded:f.get('w'+i+'-minIncluded'),maxIncluded:f.get('w'+i+'-max').trim()===''?'不適用':f.get('w'+i+'-maxIncluded')||'待確認'}));
      next.forEach((w,i)=>{if(!Number.isFinite(w.min)||w.min<0||w.max!==''&&(!Number.isFinite(w.max)||w.max<=w.min))throw Error(w.size+' 的上下限不正確。');if(i<4&&w.max==='')throw Error('只有最後一個體型的上限可留白。');if(i){const prev=next[i-1];if(prev.max!==w.min)throw Error('相鄰體型的上下限需銜接。');if(prev.maxIncluded!=='待確認'&&w.minIncluded!=='待確認'&&prev.maxIncluded===w.minIncluded)throw Error('相鄰邊界必須一邊包含、一邊不包含。');}});
      if(next[0].min!==0||next[0].minIncluded!=='包含')throw Error('第一個體型須從 0 kg 開始且包含下限。');
      const before={id:d.id,weightStandards:structuredClone(standards)};d.weightStandards=next;persist(before,'修改體重分類標準',d.name,{id:d.id,weightStandards:next});
    });
    document.querySelector('#km-dialog').classList.add('km-record-dialog');
    document.querySelectorAll('.km-weight-editor input').forEach(el=>el.addEventListener('input',()=>{const i=el.name.match(/^w(\d+)-max$/)?.[1];if(i===undefined)return;const select=document.querySelector(`[name="w${i}-maxIncluded"]`);if(select.disabled&&el.value!==''){select.disabled=false;select.innerHTML=options(['待確認','包含','不包含'].map(x=>[x,x]),'待確認');}}));
  }
  function editRecord(id) {
    if(type===breedSizeSeed.id){editBreed(id);return;}
    const d=selectedDataset(),cfg=ruleTypes[d.id],old=d.records.find(r=>r.id===id),r=old||{id:d.id+'-'+Date.now(),cells:d.headers.map(()=>''),children:[],rules:cfg?[]:undefined,status:'啟用'};
    const conditions=[],conditionCols=d.id==='犬生命階段判斷表'?[1,2,3,4]:[];
    const base=(cfg?cfg.base:d.headers.map((_,i)=>i)).filter(i=>!conditionCols.includes(i)&&(d.id!=='ＭＥＲ係數'||i===0)),rules=structuredClone(r.rules||[]);
    const long=base.filter(i=>longCols[d.id]?.includes(i)),numbers=base.filter(i=>i!==0&&numericCols[d.id]?.includes(i)),short=base.filter(i=>!long.includes(i)&&!numbers.includes(i));
    const renderFields=indices=>indices.map(i=>recordControl(d,i,r.cells[i],'c'+i)).join('');
    const baseFields=`<div class="km-form-group"><h4>識別與分類</h4><div class="km-record-grid">${recordControl(d,short[0],r.cells[short[0]],'c'+short[0])}${statusField(r.status)}${renderFields(short.slice(1))}</div></div>`+(long.length?`<div class="km-form-group"><h4>說明與適用條件</h4><div class="km-record-grid km-description-grid">${renderFields(long)}</div></div>`:'')+(numbers.length?`<div class="km-form-group"><h4>數值設定</h4><div class="km-record-grid km-number-grid">${renderFields(numbers)}</div></div>`:'');
    const children=!cfg&&r.children.length?`<section class="km-record-section"><h3>其他適用條件</h3><div id="km-variant-rows">${r.children.map((row,n)=>`<fieldset><legend>條件 ${n+1}</legend><div class="km-record-grid">${d.headers.map((_,i)=>i).filter(i=>d.id!=='BCS加成'||[3,4].includes(i)).map(i=>recordControl(d,i,row[i],'variant'+n+'-'+i)).join('')}</div></fieldset>`).join('')}</div></section>`:'';
    dialog(old?d.name+' · 檢視／編輯':'新增'+d.name,`<section class="km-record-section"><h3>基本資料</h3>${baseFields}</section>${d.id==='ＭＥＲ係數'?merFields(r):''}${d.id==='犬生命階段判斷表'?lifeFields(r):''}${children}${r.sourceNotes?.length?`<details class="km-source-notes"><summary>來源補充說明</summary>${r.sourceNotes.map(row=>`<p>${esc(row.filter(Boolean).join('；'))}</p>`).join('')}</details>`:''}${cfg?`<section class="km-record-section"><div class="km-section-title"><div><h3>營養調整規則</h3><p>引用共用營養元素，每項規則分別設定調整方式與數值。</p></div>${button('新增調整規則','data-rule-add')}</div><div id="km-rules">${rules.map(ruleCard).join('')}</div><p id="km-rule-empty" ${rules.length?'hidden':''}>目前沒有調整規則，可保留原標準或新增規則。</p></section>`:''}`,f=>{
      const read=(name,previous,i)=>{const value=f.get(name);if(value===null)return previous;const str=String(value).trim();if(str===String(previous??'').trim())return previous;if(numericCols[d.id]?.includes(i)){if(d.id==='ＭＥＲ係數'&&/^\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?$/.test(str))return str;if(str==='')return previous==null||previous===''?previous:'';if(previous!==''&&previous!=null&&Number(str)===Number(String(previous).replace(/＋/g,'+').replace(/−/g,'-')))return previous;const n=Number(str);if(!Number.isFinite(n)||(d.id==='飲水量清單'&&n<0))throw Error(d.headers[i]+' 格式不正確。');return n;}return str;};
      const cells=[...r.cells];base.forEach(i=>cells[i]=read('c'+i,r.cells[i],i));if(!String(cells[0]??'').trim())throw Error('請填寫'+d.headers[0]+'。');
      if(d.records.some(x=>x.id!==r.id&&String(x.cells[0])===String(cells[0])&&(d.id!=='BCS加成'||String(x.cells[3])===String(cells[3]))))throw Error('識別值已存在，請勿建立重複資料。');
      const next={...r,cells,status:f.get('status')};if(d.id==='BCS加成'){const score=Number(String(cells[0]).split('/')[0]);if(!Number.isInteger(score)||score<1||score>9)throw Error('BCS 分數必須為 1–9 分。');next.bcsScore={score,scale:9};}
      if(d.id==='ＭＥＲ係數'){
        const p=Object.fromEntries(Object.keys(merChoices).map(k=>[k,f.get('mer-'+k)||''])),lo=Number(f.get('mer-min')),hi=Number(f.get('mer-max'));
        if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo<0||hi<lo)throw Error('MER 係數上下限不正確。');
        if(p.physiology==='normal'&&(!p.stage||!p.ageBand))throw Error('請選擇生命階段與月齡區間。');
        if(p.physiology==='pregnant'&&!p.gestationWeeks||p.physiology==='lactating'&&!p.pupCountBand)throw Error('請選擇對應的懷孕週數或哺乳幼犬數。');
        next.merProfile=p;next.coefficient={min:lo,max:hi};next.sourceAnimalState=r.sourceAnimalState||r.cells[1];
        const text=k=>merChoices[k].find(x=>x[0]===p[k])?.[1];next.cells[1]=(p.physiology==='normal'?[text('stage'),text('ageBand'),text('neutered')]:p.physiology==='pregnant'?['懷孕',text('gestationWeeks')]:['哺乳',text('pupCountBand')]).filter(Boolean).join('，');next.cells[2]=lo===hi?lo:lo+'–'+hi;
      }
      if(d.id!=='犬生命階段判斷表'){for(const key of ['conditions','conditionJoin','reviewState','executionEligible','decisionBranches'])delete next[key];}
      if(d.id==='犬生命階段判斷表'){const result=readLifeProfile(f),p=result.profile;next.lifeProfile=p;next.reviewState=result.complete?'confirmed':'pending';next.executionEligible=result.complete&&next.status==='啟用';for(const key of ['conditions','conditionJoin','decisionBranches'])delete next[key];next.sourceRanges=r.sourceRanges||r.cells.slice(1,5);lifeColumns.forEach(([lo,hi,label,unit],i)=>{next.cells[i+1]=p[lo]===''?'待補齊':p[hi]===''?'≥'+p[lo]+' '+unit:p[lo]+'–'+p[hi]+' '+unit;});}

      if(cfg){next.rules=[...document.querySelectorAll('[data-rule-row]')].map((el,n)=>{
        const k=el.dataset.ruleIndex,oldRule=rules.find(x=>x.id===f.get('rule'+k+'-id')),elementId=f.get('rule'+k+'-element')||'',method=f.get('rule'+k+'-method'),raw=String(f.get('rule'+k+'-value')||'').trim(),o=f.get('rule'+k+'-override');
        if(!elementId&&!oldRule?.sourceName)throw Error('規則 '+(n+1)+' 請選擇營養元素。');
        const e=db.elements.find(e=>e.id===elementId);if(e?.status==='停用'&&oldRule?.elementId!==elementId)throw Error('不可新增引用停用元素。');
        let value=raw;if(method==='multiplier'){if(raw===''||!Number.isFinite(Number(raw))||Number(raw)<0)throw Error('規則 '+(n+1)+' 倍率需為非負數字。');value=Number(raw);}else if(!/^\d+(?:\.\d+)?(?:\s*[:：]\s*\d+(?:\.\d+)?)+$/.test(raw))throw Error('規則 '+(n+1)+' 請填寫比例，例如 1:1。');
        return {id:f.get('rule'+k+'-id'),elementId,sourceName:oldRule?.sourceName||e?.name||'',phase:f.get('rule'+k+'-phase'),method,value,overridable:o===''?null:o==='true'};
      });}else next.children=r.children.map((row,n)=>row.map((v,i)=>read('variant'+n+'-'+i,v,i)));
      const before=old?structuredClone(old):null;if(old){for(const key of d.id==='犬生命階段判斷表'?['conditions','conditionJoin','decisionBranches']:['conditions','conditionJoin','reviewState','executionEligible','decisionBranches'])delete old[key];Object.assign(old,next);}else d.records.push(next);persist(before,old?'修改資料':'新增資料',d.name+' / '+cells[0],structuredClone(next));
    });
    document.querySelector('#km-dialog').classList.add('km-record-dialog');
    if(d.id==='ＭＥＲ係數'){updateMerFields();document.querySelector('[name="mer-physiology"]').addEventListener('change',updateMerFields);}
    document.querySelectorAll('[data-condition-index]').forEach(card=>{updateConditionControls(card);card.addEventListener('change',e=>{if(e.target.name?.endsWith('-confirmed')){updateConditionControls(card);return;}const check=card.querySelector('input[type=checkbox]');if(check)check.checked=false;updateConditionControls(card);});});
    document.querySelectorAll('[data-rule-row]').forEach((el,i)=>el.dataset.ruleIndex=i);
    const addCondition=document.querySelector('[data-condition-add]');if(addCondition)addCondition.onclick=()=>{const i=conditions.length,c={id:'condition-'+Date.now(),label:'新增判斷條件',source:'',sourceColumn:null,field:'',operator:'eq',lower:'',upper:'',lowerInclusive:'',upperInclusive:'',unit:'',confirmed:false};conditions.push(c);document.querySelector('#km-conditions').insertAdjacentHTML('beforeend',conditionCard(c,i));const card=document.querySelector(`[data-condition-index="${i}"]`);card.open=true;updateConditionControls(card);card.addEventListener('change',e=>{if(!e.target.name?.endsWith('-confirmed'))card.querySelector('input[type=checkbox]').checked=false;updateConditionControls(card);});dirty=true;card.scrollIntoView({block:'nearest'});};
    if(cfg){let counter=rules.length;document.querySelector('[data-rule-add]').onclick=()=>{const i=counter++;document.querySelector('#km-rules').insertAdjacentHTML('beforeend',ruleCard({id:r.id+'-rule-'+Date.now()+'-'+i,elementId:'',sourceName:'',phase:'',method:'multiplier',value:'',overridable:null},i));document.querySelector('#km-rules').lastElementChild.dataset.ruleIndex=i;document.querySelector('#km-rule-empty').hidden=true;dirty=true;document.querySelector('#km-rules').lastElementChild.scrollIntoView({block:'nearest'});};}
  }
  const lifeColumns=[['weightMinKg','weightMaxKg','參考成犬體重','kg'],['growthMinMonths','growthMaxMonths','幼犬期','月'],['adultMinMonths','adultMaxMonths','成年期','月'],['seniorMinMonths','seniorMaxMonths','高齡期','月']];
  function lifeProfile(r){
    if(r.lifeProfile)return structuredClone(r.lifeProfile);
    const p={};for(const [i,cols] of lifeColumns.entries()){
      const c=sourceConditions(db.datasets.find(d=>d.id==='犬生命階段判斷表'),r).find(c=>c.sourceColumn===i+1),scale=c?.unit==='year'?12:1;
      p[cols[0]]=c?.lower!==''&&c?.lower!=null?Number(c.lower)*scale:'';p[cols[1]]=c?.upper!==''&&c?.upper!=null?Number(c.upper)*scale:'';
    }return p;
  }
  function lifeFields(r){const p=lifeProfile(r);return `<section class="km-record-section"><h3>生命階段月齡</h3><p class="nutrition-footnote">依已判定的體型，使用月齡判斷幼犬、成犬或高齡犬；成犬體重僅供參考，不參與階段判斷。</p><div class="km-life-ranges"><div class="km-life-range-head"><span>項目</span><span>下限</span><span>上限</span></div>${lifeColumns.map(([lo,hi,label,unit])=>`<div class="km-life-range"><strong>${label}<small>（${unit}）</small></strong><label><span>下限（${unit}）</span><input type="number" min="0" step="any" name="life-${lo}" value="${esc(p[lo])}" placeholder="請填下限"></label><label><span>上限（${unit}）</span><input type="number" min="0" step="any" name="life-${hi}" value="${esc(p[hi])}" placeholder="留白表示不限"></label></div>`).join('')}</div><p class="nutrition-footnote">月齡範圍採「包含下限、不包含上限」；上限留白表示不限。月齡尚未補齊可先保存，系統會標示待補齊。</p></section>`;}
  function readLifeProfile(f){
    const p={};for(const [lo,hi,label] of lifeColumns){for(const k of [lo,hi]){const raw=String(f.get('life-'+k)||'').trim();p[k]=raw===''?'':Number(raw);if(p[k]!==''&&(!Number.isFinite(p[k])||p[k]<0))throw Error(label+' 請填寫非負數字。');}if(p[lo]!==''&&p[hi]!==''&&p[lo]>=p[hi])throw Error(label+' 上限必須大於下限。');}
    const complete=lifeColumns.slice(1).every(([lo])=>p[lo]!=='')&&p.growthMaxMonths!==''&&p.adultMaxMonths!=='';
    if(complete){if(p.growthMaxMonths!==p.adultMinMonths||p.adultMaxMonths!==p.seniorMinMonths)throw Error('幼犬、成年與高齡的月齡範圍須連續銜接，不能重疊或留空缺。');}
    return {profile:p,complete};
  }
  function editElement(id) {
    const old=db.elements.find(e=>e.id===id);const e=old||{id:'N'+Date.now(),name:'',english:'',unit:'',aliases:'',status:'啟用'};
    const used=elementUsage(id);
    dialog(old?'營養元素 · 檢視／編輯':'新增營養元素',`<div class="km-element-id"><span>元素代碼</span><code>${esc(e.id)}</code><small>建立後固定</small></div><div class="km-element-fields">${['name','english','unit','aliases'].map((k,i)=>`<label>${['中文名稱','英文名稱','單位','別名'][i]}<input type="text" name="${k}" value="${esc(e[k])}" ${['name','unit'].includes(k)?'required':''} ${k==='unit'&&used.length?'readonly':''}>${k==='aliases'?'<small>多個別名以逗號分隔</small>':''}${k==='unit'&&used.length?'<small>已被資料引用，單位已鎖定</small>':''}</label>`).join('')}${statusField(e.status)}</div><section class="km-element-usage"><h3>使用位置 <span>${used.length}</span></h3>${used.length?`<ul>${used.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:'<p>尚無資料引用，可供模板及營養規則選用。</p>'}<p class="nutrition-footnote">模板標準值與各營養規則分別維護；停用後保留既有引用，禁止新增引用。</p></section>`,f=>{
      const next={...e,...Object.fromEntries(f)};for(const k of ['name','english','unit','aliases'])next[k]=next[k].trim();
      if(!next.name||!next.unit)throw Error('請填寫名稱與單位。');
      if(db.elements.some(x=>x.id!==e.id&&(x.name.toLowerCase()===next.name.toLowerCase()||(next.english&&x.english.toLowerCase()===next.english.toLowerCase()))))throw Error('已有相同名稱或英文名稱的元素，請使用既有元素或維護別名。');
      persist(old?structuredClone(old):null,old?'修改元素':'新增元素',next.name,next);if(old)Object.assign(old,next);else db.elements.push(next);
      // Persist again after mutation, without a duplicate log.
      store();
    });
  }
  function store(){try{localStorage.setItem(key,JSON.stringify({schema:1,data:db}));}catch{notice='本機儲存失敗，變更僅保留於本次畫面。';}}
  function editTemplate(isNew=false) {
    const old=isNew?null:selectedTemplate();const t=old||{id:'T'+Date.now(),name:'',meta:{適用對象:'',常見犬種:'',備註:'',計量基準:'Units per 1000 kcal ME'},items:[],status:'啟用'};
    dialog(isNew?'新增營養模板':'模板基本資料',`<div class="km-record-grid"><label>模板名稱<input name="name" value="${esc(t.name)}" required></label>${statusField(t.status)}${Object.entries(t.meta).map(([k,v],i)=>`<label class="${['常見犬種','備註'].includes(k)?'km-field-wide':''}">${esc(k)}${['常見犬種','備註'].includes(k)?`<textarea name="m${i}" rows="3">${esc(v)}</textarea>`:`<input name="m${i}" value="${esc(v)}">`}</label>`).join('')}</div>`,f=>{
      const next=structuredClone(t);next.name=f.get('name').trim();if(!next.name)throw Error('請填寫模板名稱。');if(db.templates.some(x=>x.id!==t.id&&x.name===next.name))throw Error('模板名稱已存在。');Object.keys(next.meta).forEach((k,i)=>next.meta[k]=f.get('m'+i));next.status=f.get('status');
      persist(old?structuredClone(old):null,isNew?'新增模板':'修改模板',next.name,next);if(old)Object.assign(old,next);else db.templates.push(next);templateId=next.id;store();
    });
  }
  function editReference(index) {
    const t=selectedTemplate(),old=index===null?null:t.items[index];
    const eligible=db.elements.filter(e=>e.status==='啟用'&&!t.items.some(r=>r.elementId===e.id));
    if(!old&&!eligible.length){notice='沒有可加入的啟用元素，請先到營養元素建立或啟用項目。';redraw();return;}
    const e=old?db.elements.find(e=>e.id===old.elementId):eligible[0];
    dialog(old?'模板元素 · 檢視／編輯':'加入營養元素',`<p>${esc(t.name)} · ${esc(t.meta.計量基準)}</p><div class="form-grid"><label>營養元素<select name="elementId" ${old?'disabled':''}>${options((old?[e]:eligible).map(x=>[x.id,x.name+'（'+x.unit+'）']),e.id)}</select></label>${valueInput('標準值（保留來源的 ND、比例或範圍）',old?.value??'','name="value"')}</div><p class="nutrition-footnote">空白代表未提供，零為有效數值。此處僅修改本模板數值，共用元素名稱與單位請至「營養元素」維護。</p>`,f=>{
      const raw=f.get('value').trim();let value=raw;
      if(raw!==''&&Number.isFinite(Number(raw))){value=Number(raw);if(value<0)throw Error('數值須為大於或等於零的數字。');}
      else if(raw!==''&&!/^(ND|N\/A|-)$/i.test(raw)&&!/^\d+(?:\.\d+)?(?:\s*[-–:：]\s*\d+(?:\.\d+)?)+$/.test(raw))throw Error('請輸入非負數值、比例／範圍（例如 1–1.4:1）、ND，或留白。');
      const next={elementId:old?old.elementId:f.get('elementId'),value};persist(old?structuredClone(old):null,old?'修改模板數值':'加入元素',t.name+' / '+db.elements.find(e=>e.id===next.elementId).name,next);if(old)Object.assign(old,next);else t.items.push(next);store();
    });
  }
  const scopeName = () => names[type]+(type==='templates'?' / '+selectedTemplate().name:'');
  function exportCurrent() {
    const data=type==='templates'?structuredClone(selectedTemplate()):type==='elements'?structuredClone(db.elements):type===breedSizeSeed.id?structuredClone(selectedDataset()):structuredClone(selectedDataset().records);
    const payload={format:'tp-rag-maintenance-v1',type,scope:scopeName(),data};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=scopeName().replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice='已匯出「'+scopeName()+'」完整資料（包含停用項目，不受搜尋條件限制）。';redraw();
  }
  function downloadImportTemplate(){
    const headers=type==='犬生命階段判斷表'?['體型','體重下限（kg）','體重上限（kg）','幼犬月齡下限','幼犬月齡上限','成年月齡下限','成年月齡上限','高齡月齡下限','高齡月齡上限','狀態']:type==='ＭＥＲ係數'?['編號','生命階段','月齡區間','結紮狀態','生理狀態','懷孕週數','哺乳幼犬數','MER係數下限','MER係數上限','狀態']:type==='templates'?['模板名稱','適用對象','常見犬種','備註','計量基準','元素代碼','標準值','狀態']:type==='elements'?['元素代碼','中文名稱','英文名稱','單位','別名','狀態']:ruleTypes[type]?[...ruleTypes[type].base.map(i=>selectedDataset().headers[i]),'營養元素代碼','適用生命階段','調整方式','調整值','允許其他規則覆寫','狀態']:[...selectedDataset().headers,'狀態'];
    const content='\uFEFF'+headers.map(h=>'"'+h.replaceAll('"','""')+'"').join(',')+'\r\n',url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=names[type]+'_匯入範本.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice='已下載 '+names[type]+' 固定欄位範本（CSV，可用 Excel 開啟）。';redraw();
  }
  function importDemoPreview() {
    const dataset=selectedDataset();
    
    if(importMode==='create') {
      const failed=document.querySelector('#km-demo-outcome')?.value==='error',label=names[type];
      const count=type==='templates'?selectedTemplate().items.length:type==='elements'?db.elements.length:selectedDataset().records.length;
      const required=type==='templates'?'模板名稱、適用對象、營養元素、單位與標準值':type==='elements'?'中文名稱與單位':selectedDataset().headers.slice(0,2).join('、');
      dialog(failed?'資料格式錯誤':'匯入成功',`<div class="km-import-result ${failed?'is-error':'is-success'}" role="status"><strong>${failed?'資料格式錯誤，未匯入任何資料':'匯入成功'}</strong><p>${esc(label)} · 建立全新資料</p>${failed?`<p>請修正檔案格式後重新上傳。</p>`:`<p>已建立 ${count} 筆資料（示範）。</p>`}</div>${failed?rowsTable(['位置','格式問題','修正方式'],[`<tr><td>標題列</td><td>必要欄位缺漏（模擬）</td><td>請核對：${esc(required)}</td></tr>`,`<tr><td>資料第 2 列</td><td>欄位值格式不符（模擬）</td><td>依指定欄位格式填寫，不填入不符型別的文字。</td></tr>`]):''}<p class="nutrition-footnote">此為客戶確認用結果示範，未選取真實檔案，也未新增任何本機資料。</p>`,()=>{});
      document.querySelector('#km-dialog button[type=submit]').textContent=failed?'返回重新選擇':'完成';return;
    }
    const label=names[type],template=selectedTemplate();
    const headers=type==='templates'?['中文名稱','英文名稱','單位','標準值']:type==='elements'?['元素代碼','中文名稱','英文名稱','單位','別名']:selectedDataset().headers;
    const fields=rowsTable(['來源欄位','系統欄位','檢查結果'],headers.map(h=>`<tr><td>${esc(h)}</td><td><select aria-label="${esc(h)} 對應欄位">${options(headers.map(x=>[x,x]),h)}<option value="">不匯入此欄位</option></select></td><td>${badge('已對應')}</td></tr>`));
    let samples;
    if(type==='templates'||type==='elements') {
      samples=db.elements.slice(0,3).map((e,i)=>({name:e.name,source:i===1?e.english:e.name,current:e.name,unit:e.unit,value:type==='templates'?(template.items.find(r=>r.elementId===e.id)?.value??'未提供'):'—'}));
    }else samples=selectedDataset().records.slice(0,3).map(r=>({name:String(r.cells[1]||r.cells[0]),source:String(r.cells[0]),current:String(r.cells[0]),unit:'—',value:r.cells[2]??'—'}));
    const items=rowsTable(['來源項目','現有資料','檢查結果','處理方式'],samples.map((r,i)=>`<tr><td>${esc(r.source)}<br><small>${esc(r.unit)} · ${esc(r.value)}</small></td><td>${esc(r.current)}</td><td>${i===0?'識別資料重複':i===1?'名稱／別名待確認':'單位或內容差異（模擬）'}</td><td><select data-km-demo-resolve aria-label="${esc(r.name)} 處理方式"><option value="">請選擇處理方式</option>${options([['skip','略過此筆'],...(importMode==='update'?[['update','更新既有資料']]:[]),['review','確認對應後保留現有資料']], '')}</select></td></tr>`));
    dialog('匯入預覽與比對 · '+label,`<div class="nutrition-message">畫面示範：直接使用已載入的假資料呈現比對情境，未讀取任何新檔案。下方衝突是模擬情境，不代表來源 Excel 已確認有這些問題。</div><div class="km-preview-scope"><strong>${esc(importMode==='create'?'建立全新資料':'更新既有資料')}</strong><span>${esc(label)}${type==='templates'&&importMode==='update'?' / '+esc(template.name):''}</span></div><div class="km-preview-steps"><span>01 欄位對應</span><span>02 資料比對與衝突</span><span>03 確認處理方式</span></div>${section('欄位對應','系統預先對應同名欄位，可在此調整。',fields)}${section('資料比對與衝突','既有資料比對示範；建立模式不提供直接覆蓋。',items)}<p id="km-demo-count" role="status">尚有 ${samples.length} 筆待確認。</p><p class="nutrition-footnote">正式流程還會包含無衝突的新資料，以及未知元素的建立／對應。這次僅供畫面確認，不會更新模板、元素、匯入紀錄或異動明細。</p>`,()=>{notice='已結束匯入比對預覽，未寫入任何資料。';});
    const d=document.querySelector('#km-dialog');d.classList.add('km-import-preview-dialog');d.querySelector('button[type=submit]').textContent='完成預覽';
    d.querySelectorAll('[data-km-demo-resolve]').forEach(select=>select.addEventListener('change',()=>{const n=[...d.querySelectorAll('[data-km-demo-resolve]')].filter(s=>!s.value).length;d.querySelector('#km-demo-count').textContent=n?'尚有 '+n+' 筆待確認。':'示範衝突已完成選擇；完成預覽不會寫入資料。';}));
  }
  function importCurrent() {
    const currentType=type,isNew=importMode==='create',currentTemplate=isNew&&type==='templates'?{id:'T'+Date.now(),name:'',meta:{適用對象:'',常見犬種:'',備註:'',計量基準:'Units per 1000 kcal ME'},items:[],status:'啟用'}:selectedTemplate();let scope=names[type]+(type==='templates'?' / '+(isNew?'新模板':currentTemplate.name):'');let incoming=null;
    dialog('匯入 · '+scope,`<div class="nutrition-message">匯入範圍：${esc(scope)}。${isNew?'建立全新資料，不覆蓋既有資料。':'相同識別碼更新，不同識別碼新增；未包含的既有項目保留。'}</div><label class="km-file">選擇此類型的 JSON 資料檔案<input id="km-import-file" type="file" accept=".json,application/json"></label><p class="nutrition-footnote">本機操作版支援 JSON 匯入／匯出。客戶原始 Excel 的欄位與元素對應流程仍待正式開發，不會自動讀取或覆寫原始 Excel。</p><div id="km-import-preview">選擇檔案後顯示預覽，確認後才寫入。</div>`,()=>{
      if(!incoming)throw Error('請先選擇有效檔案並確認預覽。');
      let before,after;
      if(currentType==='templates'){
        before=isNew?null:structuredClone(currentTemplate);after=structuredClone(currentTemplate);if(isNew){after.name=incoming.name;scope=names[currentType]+' / '+after.name;}Object.assign(after.meta,incoming.meta);
        incoming.items.forEach(item=>{const existing=after.items.find(r=>r.elementId===item.elementId);if(existing)Object.assign(existing,item);else after.items.push(item);});Object.assign(currentTemplate,after);if(isNew)db.templates.push(currentTemplate);
      } else {
        const list=currentType==='elements'?db.elements:db.datasets.find(d=>d.id===currentType).records;
        before=structuredClone(list);incoming.forEach(item=>{const existing=list.find(r=>r.id===item.id);if(existing)Object.assign(existing,item);else list.push(item);});after=structuredClone(list);
      }
      db.imports.unshift({time:new Date().toLocaleString('zh-TW'),file:document.querySelector('#km-import-file').files[0].name,count:currentType==='templates'?incoming.items.length:incoming.length,scope,type:currentType,templateId:currentType==='templates'?currentTemplate.id:null});
      persist(before,'匯入資料',scope,after);notice='已匯入「'+scope+'」，可前往資料維護查看結果，或至異動明細查詢修改前後內容。';tab='imports';
    });
    document.querySelector('#km-dialog button[type=submit]').textContent='確認匯入';
    document.querySelector('#km-import-file').addEventListener('change',async e=>{
      incoming=null;const box=document.querySelector('#km-import-preview');
      try{
        const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024)throw Error('檔案不可超過 3 MB。');
        const payload=JSON.parse(await file.text());if(payload.type&&payload.type!==currentType)throw Error('檔案資料類型不符。');
        const data=Object.hasOwn(payload,'data')?payload.data:payload;const seen=new Set();const isText=v=>typeof v==='string';
        if(currentType==='templates'){
          if(!data||!data.meta||!Array.isArray(data.items))throw Error('模板檔案需包含 meta 基本資料與 items 元素明細。');
          if(isNew&&(!isText(data.name)||!data.name.trim()))throw Error('全新模板需提供 name 模板名稱。');
          if(isNew&&db.templates.some(t=>t.name===data.name.trim()))throw Error('模板名稱已存在，請改名或使用更新模式。');
          if(Object.keys(data.meta).some(k=>!Object.hasOwn(currentTemplate.meta,k))||Object.values(data.meta).some(v=>!isText(v)))throw Error('模板固定欄位不符。');
          for(const r of data.items){if(!r||!isText(r.elementId)||!db.elements.some(e=>e.id===r.elementId)||seen.has(r.elementId))throw Error('元素代碼不存在或重複，請先維護元素主檔。');seen.add(r.elementId);if(!['number','string'].includes(typeof r.value)||(typeof r.value==='number'&&(!Number.isFinite(r.value)||r.value<0)))throw Error('模板數值格式不符。');}
          incoming={name:isNew?data.name.trim():currentTemplate.name,meta:structuredClone(data.meta),items:data.items.map(r=>({elementId:r.elementId,value:r.value}))};
        }else{
          if(!Array.isArray(data))throw Error('資料必須為清單。');
          const d=db.datasets.find(d=>d.id===currentType);
          for(const r of data){
            if(!r||!isText(r.id)||!r.id.trim()||seen.has(r.id)||!['啟用','停用'].includes(r.status))throw Error('識別碼重複、空白或狀態錯誤。');seen.add(r.id);
            if(isNew&&(currentType==='elements'?db.elements:db.datasets.find(d=>d.id===currentType).records).some(x=>x.id===r.id))throw Error('識別碼已存在，建立模式不可覆蓋；請使用新識別碼或更新模式。');
            if(currentType==='elements'){
              if(!['name','english','unit','aliases'].every(k=>isText(r[k]))||!r.name.trim()||!r.unit.trim())throw Error('元素名稱、單位或欄位格式不符。');
              const existing=db.elements.find(x=>x.id===r.id);if(existing&&existing.unit!==r.unit&&db.templates.some(t=>t.items.some(i=>i.elementId===r.id)))throw Error('已引用元素不可透過匯入變更單位。');
              const others=[...db.elements.filter(x=>!data.some(y=>y.id===x.id)),...data].filter(x=>x.id!==r.id);
              if(others.some(x=>x.name.trim().toLowerCase()===r.name.trim().toLowerCase()||(r.english.trim()&&x.english.trim().toLowerCase()===r.english.trim().toLowerCase())))throw Error('元素名稱重複，請先確認代碼與別名。');
            }else{
              const validRow=row=>Array.isArray(row)&&row.length===d.headers.length&&row.every(v=>v===null||['string','number','boolean'].includes(typeof v));
              if(!validRow(r.cells)||!Array.isArray(r.children)||!r.children.every(validRow))throw Error('固定欄位數量或明細資料格式不符。');
            }
          }
          incoming=data.map(r=>currentType==='elements'?Object.fromEntries(['id','name','english','unit','aliases','status'].map(k=>[k,r[k]])):{id:r.id,cells:r.cells,children:r.children,status:r.status});
        }
        box.innerHTML=`<h3>匯入預覽</h3><p>${esc(scope)} · ${currentType==='templates'?incoming.items.length:incoming.length} 筆</p><pre class="km-import-json">${esc(JSON.stringify(incoming,null,2))}</pre>`;
      }catch(err){incoming=null;box.textContent=err.message;}
    });
  }
  function previewImport() {
    pending=knowledgeSeed.elements.map(e=>{
      const normalize=x=>String(x||'').trim().toLowerCase();
      const byCode=db.elements.find(x=>x.id===e.id);
      const hits=byCode?[byCode]:db.elements.filter(x=>[x.name,x.english,...x.aliases.split(',')].map(normalize).some(n=>n&&[normalize(e.name),normalize(e.english)].includes(n)));
      const hit=hits.length===1?hits[0]:null;
      return {source:e,target:hit?.unit===e.unit?hit.id:'',reason:hit?(hit.unit===e.unit?(byCode?'代碼相符':'名稱／別名相符'):'單位不一致，須人工確認'):'未唯一對應，須人工確認'};
    });
    dialog('匯入預覽 · 元素對應',`<p>${esc(db.source)}</p><div class="nutrition-message">範例快照預覽：確認後記錄對應結果，不覆寫模板或共用元素。實際檔案解析與批次更新待正式開發。</div>${rowsTable(['來源元素／單位','比對結果','對應系統元素'],pending.map((r,i)=>`<tr><td>${esc(r.source.name)} / ${esc(r.source.unit)}</td><td>${esc(r.reason)}</td><td><select required name="map${i}"><option value="">請選擇</option>${options(db.elements.filter(e=>e.unit===r.source.unit).map(e=>[e.id,e.name+' / '+e.unit]),r.target)}<option value="new">建立新元素（待正式匯入流程）</option></select></td></tr>`))}<p class="nutrition-footnote">單位不同不直接覆蓋。需建立新元素時，請先回資料維護新增，再重新預覽。</p>`,f=>{
      const maps=pending.map((r,i)=>({source:r.source.id,target:f.get('map'+i)}));if(maps.some(r=>!r.target||r.target==='new'))throw Error('請先完成既有元素對應；新增元素請回資料維護建立後重新預覽。');
      const record={time:new Date().toLocaleString('zh-TW'),file:db.source,count:maps.length,mappings:maps};db.imports.unshift(record);persist(null,'確認匯入對應（示範）',db.source,record);tab='imports';
    });
  }
  ensureNutritionRules();
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-rule-remove')){b.closest('[data-rule-row]').remove();const empty=document.querySelector('#km-rule-empty');if(empty)empty.hidden=!!document.querySelector('[data-rule-row]');dirty=true;return;}
    if(b.hasAttribute('data-km-close')){closeDialog();return;}
    if(b.dataset.kmNav){tab=b.dataset.kmNav;setView('rag');redraw();return;}
    if(b.dataset.kmTab){tab=b.dataset.kmTab;redraw();return;}
    if(b.hasAttribute('data-km-search')){query=document.querySelector('#km-query').value;status=document.querySelector('#km-status').value;redraw();}
    if(b.hasAttribute('data-km-new')){if(type==='elements')editElement();else if(type==='templates')editTemplate(true);else editRecord();}
    if(b.dataset.kmElement)editElement(b.dataset.kmElement);
    if(b.dataset.kmRecord)editRecord(b.dataset.kmRecord);
    if(b.hasAttribute('data-km-weight-standards'))editWeightStandards();
    if(b.hasAttribute('data-km-template-edit')){templateDraft=structuredClone(selectedTemplate());query='';status='全部';redraw();}
    if(b.hasAttribute('data-km-add-reference')){templateDraft.items.push({elementId:'',value:''});redraw();const field=document.querySelector('[data-km-draft-element="'+(templateDraft.items.length-1)+'"]');field.closest('tr').classList.add('km-new-reference');field.scrollIntoView({block:'center'});field.focus({preventScroll:true});}
    if(b.hasAttribute('data-km-ref'))editReference(Number(b.dataset.kmRef));
    if(b.hasAttribute('data-km-preview'))previewImport();
    if(b.hasAttribute('data-km-transfer')){const menu=document.querySelector('#km-transfer-menu');menu.hidden=!menu.hidden;b.setAttribute('aria-expanded',String(!menu.hidden));}
    if(b.hasAttribute('data-km-template-save'))saveTemplateDraft();
    if(b.hasAttribute('data-km-template-cancel')){if(confirm('確定取消本次模板修改？')){templateDraft=null;redraw();}}
    if(b.hasAttribute('data-km-remove-reference')){templateDraft.items.splice(Number(b.dataset.kmRemoveReference),1);redraw();}
    if(b.hasAttribute('data-km-export'))exportCurrent();
    if(b.hasAttribute('data-km-import'))importDemoPreview();if(b.hasAttribute('data-km-import-template'))downloadImportTemplate();
    if(b.hasAttribute('data-km-log-toggle')){const detail=document.getElementById('km-log-detail-'+b.dataset.kmLogToggle);detail.hidden=!detail.hidden;b.setAttribute('aria-expanded',String(!detail.hidden));const label=detail.hidden?'展開異動明細':'收合異動明細';b.setAttribute('aria-label',label);b.title=label;}
    if(b.hasAttribute('data-km-log-edit'))editFromLog(Number(b.dataset.kmLogEdit),JSON.parse(b.dataset.kmLogPath));
    if(b.hasAttribute('data-km-import-result')){const r=db.imports[Number(b.dataset.kmImportResult)];type=r.type;if(r.templateId)templateId=r.templateId;query='';status='全部';tab='data';redraw();}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='km-import-mode'){importMode=e.target.value;redraw();}
    if(e.target.id==='km-import-type'){type=e.target.value;redraw();}
    if(e.target.id==='km-import-template'){templateId=e.target.value;redraw();}
    if(e.target.id==='km-type'){type=e.target.value;query='';status='全部';redraw();}
    if(e.target.id==='km-template'){templateId=e.target.value;redraw();}
    if(e.target.id==='km-status'){status=e.target.value;redraw();}
  });
  document.addEventListener('keydown',e=>{if(e.target.id==='km-query'&&e.key==='Enter'){e.preventDefault();document.querySelector('[data-km-search]').click();}});
})();
