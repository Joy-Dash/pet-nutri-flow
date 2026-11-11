/* Customer review prototype: workbook snapshot + browser-local maintenance. */
(() => {
  const esc = v => escapeHtml(String(v ?? ''));
  const key = 'tp-rag-meeting-knowledge-v1';
  let db = structuredClone(knowledgeSeed);
  try { const saved = JSON.parse(localStorage.getItem(key)); if (saved?.schema === 1) db = saved.data; } catch {}
  db.logs ||= []; db.imports ||= [];
  if(!db.datasets.some(d=>d.id===breedSizeSeed.id))db.datasets.push(structuredClone(breedSizeSeed));
  const lifeType = '犬生命階段判斷表';
  const merType = 'ＭＥＲ係數';
  const activityType = '活動量加成';
  const bcsType = 'BCS加成';
  const allergenType = '過敏原清單';
  const diseaseType = '慢性病與遺傳性疾病營養';
  const functionalType = '亞健康觀察清單';
  const stoolType = '排便分類法';
  const hasProcessingPriority = id => id===diseaseType||id===functionalType;
  const healthMatrixTypes = new Set([diseaseType,stoolType,functionalType]);
  const matrixColumns=['營養素','成犬','高齡犬','幼犬生長前期','幼犬生長後期'];
  const healthColumns=id=>[...matrixColumns,...(id===diseaseType?['建議營養調整數值（每 1000 kcal ME）','優先鎖定']:id===stoolType?['優先鎖定']:['備註','優先鎖定'])];
  const healthLockIndex=id=>id===stoolType?5:6;
  const breedData = db.datasets.find(d=>d.id===breedSizeSeed.id);
  const lifeData = db.datasets.find(d=>d.id===lifeType);
  let tab = 'data', type = breedData.id, templateId = db.templates[0].id, query = '', status = '全部', notice = '';
  let speciesId = 'dog', speciesPanel = 'breeds';
  let pending = null, dirty = false, templateDraft = null, importMode = 'replace';
  let logFilters = {actor:'',field:'',from:'',to:''};
  const names = {
    [breedData.id]:'物種、品種與體型',
    [lifeType]:'生命階段判斷表',
    templates:'營養標準模板',
    elements:'營養元素',
    ...Object.fromEntries(db.datasets.filter(d=>d!==breedData&&d!==lifeData&&d.id!=='飲水量清單').map(d=>[d.id,d.name])),
    [merType]:'MER 係數',
    [functionalType]:'功能性營養模板（亞健康）'
  };
  const button = (label, attrs, primary=false) => `<button type="button" class="${primary?'primary-button':'secondary-button'}" ${attrs}>${esc(label)}</button>`;
  const options = (entries, selected) => entries.map(([v,n])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(n)}</option>`).join('');
  const valueInput = (label, value, attr, numeric=false) => `<label>${esc(label)}<${numeric?'input':'textarea'} ${attr} ${numeric?`type="number" step="any" value="${esc(value)}"`:'rows="2"'}>${numeric?'':esc(value)}</${numeric?'input':'textarea'}></label>`;
  function persist(before, action, target, after) {
    db.logs.unshift({time:new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}),at:new Date().toISOString(),actor:'示範管理員',action,target,before:structuredClone(before),after:structuredClone(after),context:{type,speciesId:speciesType()?speciesId:null,templateId:after?.items?after.id:templateId,recordId:after?.id||null,headers:selectedDataset()?.headers||null}});
    try { localStorage.setItem(key,JSON.stringify({schema:1,data:db})); notice='已儲存至本機示範資料。'; }
    catch { notice='本機儲存失敗；變更僅保留於本次畫面，重新整理後可能遺失。'; }
  }
  function redraw() { document.querySelector('#view-content').innerHTML = renderers.rag(); document.querySelectorAll('[data-km-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.kmNav===tab);b.setAttribute('aria-current',b.dataset.kmNav===tab?'page':'false');}); }
  const selectedTemplate = () => db.templates.find(t=>t.id===templateId) || db.templates[0];
  const selectedDataset = () => db.datasets.find(d=>d.id===type);
  const adjustmentType = () => type===activityType||type===bcsType;
  const speciesType = () => type===breedData.id||type===lifeType||adjustmentType();
  const matches = r => (status==='全部'||r.status===status)&&(!query||JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
  function rowsTable(headers, rows) { return rows.length ? table(headers,rows, Math.max(650,headers.length*140)) : '<div class="nutrition-empty">沒有符合條件的資料。</div>'; }
  function short(v) { const s=String(v??'');return `<span title="${esc(s)}">${esc(s.length>65?s.slice(0,65)+'…':s)}</span>`; }
  function tools() {
    const canAddBcs=type===bcsType&&selectedDataset().records.filter(r=>r.speciesId===speciesId&&r.adjustments).length<9;
    return `<fieldset class="km-filter" ${templateDraft?'disabled':''}><div class="km-toolbar"><label>資料類型<select id="km-type">${options(Object.entries(names),type)}</select></label>${speciesType()?speciesPicker():''}${type==='templates'?`<label>營養模板<select id="km-template">${options(db.templates.map(t=>[t.id,t.name]),templateId)}</select></label>`:''}<label class="km-search">搜尋<input id="km-query" value="${esc(query)}" placeholder="搜尋名稱、條件或數值"></label>${type===breedData.id&&speciesPanel==='sizes'?'':`<label>狀態<select id="km-status">${options(['全部','啟用','停用'].map(x=>[x,x]),status)}</select></label>`}${button('搜尋','data-km-search')}${button('匯出','data-km-export')}${!speciesType()||type===activityType||canAddBcs?button(type==='templates'?'新增模板':type==='elements'?'新增元素':type===activityType?'新增活動等級':canAddBcs?'新增 BCS 評分':'新增資料','data-km-new',true):''}</div></fieldset>`;
  }
  function templateContent() {
    const t=templateDraft||selectedTemplate(),editing=!!templateDraft;
    const actions=editing?button('取消','data-km-template-cancel')+button('儲存變更','data-km-template-save',true):button('編輯','data-km-template-edit',true);
    const head=editing ? `<div class="km-template-editor"><div class="km-editor-top"><label>模板名稱<input data-km-draft-name value="${esc(t.name)}"></label><label>狀態<select data-km-draft-status>${options(['啟用','停用'].map(x=>[x,x]),t.status)}</select></label><div class="km-edit-actions">${actions}</div></div><div class="km-editor-fields"><label>適用對象<input data-km-draft-meta="適用對象" value="${esc(t.meta.適用對象)}"></label><label>計量基準<input data-km-draft-meta="計量基準" value="${esc(t.meta.計量基準)}"></label><label>常見犬種<textarea data-km-draft-meta="常見犬種" rows="2">${esc(t.meta.常見犬種)}</textarea></label><label>備註<textarea data-km-draft-meta="備註" rows="2">${esc(t.meta.備註)}</textarea></label></div></div>` : `<div class="km-template-head"><div><h3>${esc(t.name)} ${badge(t.status)}</h3><dl class="km-meta">${Object.entries(t.meta).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl></div><div class="km-edit-actions">${actions}</div></div>`;

    const rows=t.items.map((r,i)=>({r,i,e:db.elements.find(e=>e.id===r.elementId)})).filter(({r,e})=>editing||e&&matches({...e,value:r.value})).map(({r,i,e})=>{
      const choices=db.elements.filter(x=>x.status==='啟用'||x.id===r.elementId);
      return `<tr><td><code>${esc(e?.id||'待選擇')}</code></td><td>${editing?`<select aria-label="第 ${i+1} 列營養元素" data-km-draft-element="${i}"><option value="">選擇營養元素</option>${options(choices.map(x=>[x.id,x.name]),r.elementId)}</select>`:esc(e.name)}</td><td>${esc(e?.english||'—')}</td><td>${esc(e?.unit||'—')}</td><td>${editing?`<input aria-label="第 ${i+1} 列標準值" data-km-draft-value="${i}" value="${esc(r.value)}">`:esc(r.value===''?'未提供':r.value)}</td><td>${e?badge(e.status):'—'}</td>${editing?`<td>${button('移除',`data-km-remove-reference="${i}"`)}</td>`:''}</tr>`;
    });
    return head+templateScopeFields(t,editing)+`<div class="km-section-actions"><span>${editing?'編輯中：儲存後套用選用條件與營養明細。':'引用營養元素，數值依模板分別設定。'}</span>${editing?button('加入營養元素','data-km-add-reference'):''}</div><p id="km-template-error" role="alert"></p>`+rowsTable(['元素代碼','營養元素','英文名稱','單位','標準值','元素狀態',...(editing?['操作']:[])],rows)+(editing?`<div class="km-edit-footer">${button('取消','data-km-template-cancel')}${button('儲存變更','data-km-template-save',true)}</div>`:'');
  }
  function templateStages(id,sizeIds=[]){
    const available=new Set(lifeData.records.filter(r=>r.speciesId===id&&r.ageProfile&&(!sizeIds.length||sizeIds.includes(r.sizeId)))
      .flatMap(r=>lifePhaseKeys(r.ageProfile.split).filter(key=>r.ageProfile.phases[key])));
    return Object.entries(lifeLabels(id)).filter(([key])=>available.has(key));
  }
  function templateScopeFields(t,editing){
    const scope=t.applicability,species=db.species.find(s=>s.id===scope.speciesId);
    const sizes=sizesFor(scope.speciesId).map(s=>[s.id,s.size]),stages=templateStages(scope.speciesId);
    const summary=(ids,entries,empty)=>ids.length?ids.map(id=>entries.find(([key])=>key===id)?.[1]||'待確認').join('、'):empty;
    const multiple=(label,key,choices,ids,empty)=>`<div class="km-scope-multiple">
      <span id="km-scope-label-${key}">${label}</span>
      <button type="button" class="km-scope-picker" aria-expanded="false" aria-controls="km-scope-options-${key}" aria-labelledby="km-scope-label-${key} km-scope-value-${key}" ${choices.length?'':'disabled'}>
        <span id="km-scope-value-${key}" data-empty="${empty}">${esc(summary(ids,choices,empty))}</span>
      </button>
      <div class="km-scope-options" id="km-scope-options-${key}" role="group" aria-labelledby="km-scope-label-${key}" hidden>
        ${choices.map(([value,name])=>`<label><input type="checkbox" data-km-scope-list="${key}" value="${esc(value)}" ${ids.includes(value)?'checked':''}><span>${esc(name)}</span></label>`).join('')}
      </div>
    </div>`;
    const view=(label,value)=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
    return `<section class="km-template-conditions"><h3>模板選用條件</h3>${editing?`<div class="km-template-scope">
      <label>物種<select data-km-scope-species>${options([['','選擇物種'],...db.species.filter(s=>s.status==='啟用'||s.id===scope.speciesId).map(s=>[s.id,s.name+(s.status==='停用'?'（停用）':'')])],scope.speciesId)}</select></label>
      ${multiple('適用體型','sizeIds',sizes,scope.sizeIds,'不限體型')}
      ${multiple('適用生命階段','stages',stages,scope.stages,'選擇生命階段')}
      <label class="km-scope-extra">額外選用條件（選填）<textarea rows="2" data-km-scope-extra placeholder="例如 BCS=7、8、9">${esc(scope.extraCondition)}</textarea></label>
      <p>生命階段可複選，符合任一項即可。未勾選體型時不限體型。正式推薦時，AI 會依本次資料判讀額外條件。</p>
      </div>`:`<dl class="km-meta">${view('物種',species?.name||'待設定')}${view('適用體型',summary(scope.sizeIds,sizes,species?'不限體型':'待設定'))}${view('適用生命階段',summary(scope.stages,stages,'待設定'))}${view('額外選用條件',scope.extraCondition||'無')}</dl>`}</section>`;
  }
  function validateTemplateScope(scope,required=false){
    scope.extraCondition=scope.extraCondition.trim();
    if(!required&&!scope.speciesId&&!scope.sizeIds.length&&!scope.stages.length&&!scope.extraCondition)return;
    if(!db.species.some(s=>s.id===scope.speciesId))throw Error('請先選擇模板適用的物種。');
    const validStages=templateStages(scope.speciesId,scope.sizeIds);
    if(!scope.stages.length||scope.stages.some(stage=>!validStages.some(([key])=>key===stage)))throw Error('請選擇所選物種與體型已設定的生命階段。');
  }
  function updateTemplateScope(target,scope){
    if(target.hasAttribute('data-km-scope-species')){
      const section=target.closest('.km-template-conditions'),parent=section.parentElement;
      Object.assign(scope,{speciesId:target.value,sizeIds:[],stages:[]});
      section.outerHTML=templateScopeFields({applicability:scope},true);
      parent.querySelector('[data-km-scope-species]').focus();
    }
    if(target.dataset.kmScopeList){
      const group=target.closest('.km-scope-multiple');
      const checked=[...group.querySelectorAll('input:checked')];
      const value=group.querySelector('.km-scope-picker span');
      scope[target.dataset.kmScopeList]=checked.map(input=>input.value);
      value.textContent=checked.map(input=>input.nextElementSibling.textContent).join('、')||value.dataset.empty;
    }
  }
  const openScopePicker=()=>document.querySelector('.km-scope-picker[aria-expanded="true"]');
  function showScopePicker(picker,open){
    picker.setAttribute('aria-expanded',String(open));
    picker.nextElementSibling.hidden=!open;
  }
  document.addEventListener('click',e=>{
    const picker=e.target.closest('.km-scope-picker'),open=openScopePicker();
    if(open&&!open.parentElement.contains(e.target))showScopePicker(open,false);
    if(picker)showScopePicker(picker,picker!==open);
  });
  document.addEventListener('focusin',e=>{
    const open=openScopePicker();
    if(open&&!open.parentElement.contains(e.target))showScopePicker(open,false);
  });
  document.addEventListener('keydown',e=>{
    const open=openScopePicker();
    if(open&&e.key==='Escape'){
      e.preventDefault();
      showScopePicker(open,false);
      open.focus();
    }
  });
  function saveTemplateDraft() {
    try {
      const next=structuredClone(templateDraft);
      validateTemplateScope(next.applicability);
      next.name=next.name.trim();if(!next.name)throw Error('請填寫模板名稱。');
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
    if(e.target.hasAttribute('data-km-scope-extra'))templateDraft.applicability.extraCondition=e.target.value;
  });
  document.addEventListener('change',e=>{
    if(!templateDraft)return;
    if(e.target.hasAttribute('data-km-draft-status'))templateDraft.status=e.target.value;
    updateTemplateScope(e.target,templateDraft.applicability);
    if(e.target.hasAttribute('data-km-draft-element')){templateDraft.items[Number(e.target.dataset.kmDraftElement)].elementId=e.target.value;redraw();}
  });
  document.addEventListener('click',e=>{
    if((templateDraft||dirty&&document.querySelector('.km-page-editor'))&&e.target.closest('[data-view],[data-km-nav],[data-open-rag]')){
      if(!confirm('尚有未儲存的修改，確定放棄並離開？')){e.preventDefault();e.stopImmediatePropagation();return;}templateDraft=null;dirty=false;
    }
    if(!e.target.closest('.km-transfer')){const menu=document.querySelector('#km-transfer-menu');if(menu){menu.hidden=true;document.querySelector('[data-km-transfer]').setAttribute('aria-expanded','false');}}
  },true);
  window.addEventListener('beforeunload',e=>{if(templateDraft||dirty&&document.querySelector('.km-page-editor')){e.preventDefault();e.returnValue='';}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.querySelector('#km-transfer-menu');if(menu&&!menu.hidden){menu.hidden=true;const b=document.querySelector('[data-km-transfer]');b.setAttribute('aria-expanded','false');b.focus();}}});
  function dataView() {
    let content='';
    if(type==='templates') {
      content=templateContent();
    } else if(type===breedSizeSeed.id) {
      content=breedContent();
    } else if(type===lifeType) {
      content=lifeContent();
    } else if(type===merType) {
      content=merContent();
    } else if(adjustmentType()) {
      content=activityContent();
    } else if(type==='elements') {
      content=rowsTable(['元素代碼','中文名稱','英文名稱','單位','別名','使用位置數','狀態','操作'],db.elements.filter(matches).map(e=>`<tr><td><code>${esc(e.id)}</code></td><td>${esc(e.name)}</td><td>${esc(e.english)}</td><td>${esc(e.unit)}</td><td>${esc(e.aliases||'—')}</td><td>${elementUsage(e.id).length}</td><td>${badge(e.status)}</td><td>${button('檢視／編輯',`data-km-element="${esc(e.id)}"`)}</td></tr>`));
    } else {
      const d=selectedDataset();
      const priority=hasProcessingPriority(d.id);
      const indexes=({'飲水量清單':[0,1,2,3,4,5],[allergenType]:[0,2,5],[diseaseType]:[0,1,2,4],'排便分類法':[0,1,2],[functionalType]:[0,1,2]})[d.id]||d.headers.map((_,i)=>i).filter(i=>i<5);
      const headers=indexes.map(i=>esc(d.headers[i]));
      if(priority)headers.push('處理優先序');
      if(d.id!==allergenType)headers.push('明細');
      const records=d.records.filter(matches);
      if(priority)records.sort((a,b)=>(a.processingPriority??Infinity)-(b.processingPriority??Infinity));
      content=rowsTable([...headers,'狀態','操作'],records.map(r=>{
        const details=r.healthMatrixPreferred||r.healthMatrix?.length||Array.isArray(r.healthMatrix)&&!r.rules?.length?r.healthMatrix.length+' 列營養明細':r.rules?.length?r.rules.length+' 項營養規則'+(r.rules.some(x=>!x.elementId)?'／含待確認元素':''):r.children.length?'含 '+r.children.length+' 列適用條件':'—';
        return `<tr>${indexes.map(i=>`<td>${short(r.cells[i])}</td>`).join('')}
          ${priority?`<td>${esc(r.processingPriority??'未設定')}</td>`:''}
          ${d.id!==allergenType?`<td>${details}</td>`:''}
          <td>${badge(r.status)}</td><td>${button('檢視／編輯',`data-km-record="${esc(r.id)}"`)}</td></tr>`;
      }));
      if(d.id===allergenType)content='<p class="nutrition-footnote">可能交叉反應供查看。過敏原排除依所選原料判定。</p>'+content;
    }
    return section('資料維護','依資料類型切換欄位；固定欄位結構，支援新增資料與明細項目。',tools()+content);
  }
  function importView() {
    const upload=`<div class="km-import-flow"><h3>檔案匯入</h3><p>本次選定範圍以匯入檔案整份取代；檔案未列到的舊資料也會移除。任何一筆有錯，整批不覆蓋。</p><ol><li>選擇覆蓋範圍</li><li>整份檔案驗證</li><li>確認完整覆蓋</li><li>查看結果與前後異動</li></ol><div class="km-toolbar"><label>匯入資料類型<select id="km-import-type">${options(Object.entries(names),type)}</select></label>${speciesType()?speciesPicker():''}${type==='templates'?`<label>目標營養模板<select id="km-import-template">${options(db.templates.map(t=>[t.id,t.name]),templateId)}</select></label>`:''}<label>匯入方式<input readonly value="完全覆蓋"></label><label>示範結果<select id="km-demo-outcome"><option value="success">全部驗證通過</option><option value="error">檔案或資料有錯誤</option></select></label>${button('下載匯入範本','data-km-import-template')}${button('選擇檔案並預覽','data-km-import',true)}</div><p class="nutrition-footnote">此為介面示範：不選取真實檔案、不覆蓋資料。正式功能須整份驗證通過並確認後才生效；修改前後與歷史紀錄仍保留。</p></div>`;
    const rows=db.imports.map((r,i)=>`<tr><td>${esc(r.time)}</td><td>${esc(r.file)}</td><td>${esc(r.scope||'Excel 元素對應示範')}</td><td>${esc(r.count)}</td><td>${esc(r.type?'已匯入本機':'對應確認完成（示範）')}</td><td>${Object.hasOwn(names,r.type)?button('前往資料維護',`data-km-import-result="${i}"`):'—'}</td></tr>`);
    return section('檔案匯入與紀錄','依資料類型或指定模板完整覆蓋；手動維護與匯出請至資料維護。',upload)+section('匯入紀錄','查看檔案、處理範圍與結果；欄位前後差異請至異動明細。',rowsTable(['時間','來源檔案','匯入範圍','處理筆數','結果','操作'],rows));
  }
  // Local date/time inputs and legacy display strings are interpreted in Taipei time.
  function logBoundary(value) { return value ? Date.parse(value+':00+08:00') : null; }
  function logTimestamp(record) {
    if(record.at && Number.isFinite(Date.parse(record.at)))return Date.parse(record.at);
    const raw=String(record.time||'').trim();
    const m=raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[ T]*(上午|下午)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(!m)return NaN;
    let hour=Number(m[5]);if(m[4])hour=hour%12+(m[4]==='下午'?12:0);
    return Date.parse(m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0')+'T'+String(hour).padStart(2,'0')+':'+m[6]+':'+(m[7]||'00')+'+08:00');
  }
  function logTimeLabel(record) {
    const at=logTimestamp(record);
    if(!Number.isFinite(at))return '未提供時間';
    return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(at)).replace(/-/g,'/');
  }
  function matchesLog(record,changes,ctx) {
    const contains=(value,needle)=>String(value||'').toLocaleLowerCase().includes(needle.toLocaleLowerCase());
    if(logFilters.actor&&!contains(record.actor,logFilters.actor))return false;
    if(logFilters.field&&!changes.some(c=>contains(fieldLabel(c.path,ctx),logFilters.field)||contains(c.path.join('.'),logFilters.field)))return false;
    if(logFilters.from||logFilters.to){const at=logTimestamp(record);if(!Number.isFinite(at))return false;if(logFilters.from&&at<logBoundary(logFilters.from))return false;if(logFilters.to&&at>=logBoundary(logFilters.to)+60000)return false;}
    return true;
  }
  function logView() {
    const shown=logsForDisplay(),demo=shown.length>0&&shown[0].demo;
    const rows=shown.flatMap((r,i)=>{
      const ctx=logContext(r),changes=changedFields(r.before,r.after).filter(c=>!(ctx?.type==='犬生命階段判斷表'&&(r.after?.conditions||r.after?.lifeProfile)&&c.path[0]==='cells'&&[1,2,3,4].includes(Number(c.path[1]))));
      if(!changes.length||!matchesLog(r,changes,ctx))return [];
      const side=which=>`<div class="km-change-list">${changes.map(c=>`<div class="km-change-item"><strong>${esc(fieldLabel(c.path,ctx))}</strong><code class="km-change-key">${esc(c.path.join('.'))}</code><div class="km-change-value">${esc(changeValue(c[which],c.path))}</div></div>`).join('')}</div>`;
      return [`<tr class="km-log-summary"><td class="km-disclosure-cell"><button type="button" data-km-log-toggle="${i}" aria-label="展開異動明細" title="展開異動明細" aria-expanded="false" aria-controls="km-log-detail-${i}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></td><td>${esc(logTimeLabel(r))}${r.demo?'<br><small>示範時間</small>':''}</td><td>${esc(r.actor)}</td><td>${esc(r.action)}<br><small>${esc(r.target)}</small></td><td>${changes.length} 個欄位<br><small>${esc(changes.slice(0,3).map(c=>fieldLabel(c.path,ctx)).join("、")+(changes.length>3?'，另 '+(changes.length-3)+' 項':''))}</small></td><td><div class="km-log-actions">${ctx&&Object.hasOwn(names,ctx.type)?button("前往修改",`data-km-log-edit="${i}" data-km-log-path="${esc(JSON.stringify(changes[0].path))}"`):"來源已無法定位"}</div></td></tr><tr id="km-log-detail-${i}" class="km-log-detail" hidden><td colspan="6"><div class="km-log-comparison"><section><h3>修改前</h3>${side("before")}</section><section><h3>修改後</h3>${side("after")}</section></div></td></tr>`];
    });
    const filters=`<form id="km-log-filters" class="km-toolbar km-log-filters"><label>操作者<input name="actor" value="${esc(logFilters.actor)}" placeholder="輸入操作者名稱"></label><label>操作欄位<input name="field" value="${esc(logFilters.field)}" placeholder="中文欄位名稱或 key"></label><label>異動開始時間<input name="from" type="datetime-local" value="${esc(logFilters.from)}"></label><label>異動結束時間<input name="to" type="datetime-local" value="${esc(logFilters.to)}"></label><div class="km-log-filter-actions"><button type="submit" class="primary-button">搜尋</button>${button('重設','data-km-log-reset')}</div><p id="km-log-filter-error" role="alert"></p></form>`;
    const hint=`<p class="nutrition-footnote">多項條件需同時符合；異動時間以台北時間查詢，包含結束分鐘。${demo?'目前為示範紀錄，日期時間僅供畫面與搜尋測試，非真實異動。':''}</p>`;
    return section('異動明細','每列為一次修改，展開查看本次變更的欄位、Key 與前後值。前往修改會開啟目前資料，不會自動還原舊值。',filters+hint+(rows.length?rowsTable(['<span class="km-sr-only">展開明細</span>','異動時間','操作者','動作／資料','異動摘要','操作'],rows):'<div class="nutrition-empty">沒有符合條件的異動紀錄。</div>'));

  }
  function logsForDisplay(){
    if(db.logs.some(r=>changedFields(r.before,r.after).length))return db.logs;
    // Presentation-only examples; never insert fabricated history into localStorage.
    const t=db.templates[0],e=db.elements[0],d=db.datasets[0],r=d?.records[0],examples=[];
    if(t){const after=structuredClone(t),before=structuredClone(t);before.meta.備註='調整前的模板備註（示範）';before.meta.適用對象='調整前的適用對象（示範）';before.status=after.status==='啟用'?'停用':'啟用';if(before.items.length)before.items[0].value=typeof after.items[0].value==='number'?after.items[0].value+5:'調整前標準值（示範）';examples.push({demo:true,time:'2026/11/02 09:30:00',actor:'示範管理員',action:'修改模板（示範）',target:t.name,before,after,context:{type:'templates',templateId:t.id}});}
    if(e){const after=structuredClone(e),before=structuredClone(e);before.aliases='調整前別名（示範）';examples.push({demo:true,time:'2026/11/02 09:20:00',actor:'示範管理員',action:'修改元素（示範）',target:e.name,before,after,context:{type:'elements',recordId:e.id}});}
    if(r){const after=structuredClone(r),before=structuredClone(r);before.cells[2]='調整前數值（示範）';examples.push({demo:true,time:'2026/11/02 09:10:00',actor:'示範管理員',action:'修改資料（示範）',target:d.name+' / '+r.cells[0],before,after,context:{type:d.id,recordId:r.id,headers:d.headers}});}
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
  function changeValue(v,path){if(path.at(-1)==='overridable'&&typeof v==='boolean')return v?'不鎖定':'鎖定';return v===undefined?'（不存在）':v===null?'（未提供）':v===''?'（空白）':typeof v==='boolean'?(v?'是（true）':'否（false）'):String(v);}
  function logContext(r){
    if(r.context)return r.context;
    const value=r.after||r.before;
    if(value?.items)return {type:'templates',templateId:value.id};
    if(value?.english!==undefined)return {type:'elements',recordId:value.id};
    const d=db.datasets.find(d=>d.records.some(x=>x.id===value?.id));return d?{type:d.id,recordId:value.id,headers:d.headers}:null;
  }
  function fieldLabel(path,ctx){
    if(path[0]==='processingPriority')return '處理優先序';
    if(path[0]==='weightStandards'){const w=db.datasets.find(d=>d.id===breedSizeSeed.id)?.weightStandards.find(w=>w.id===path[1]);return (w?.size||'體重分類')+'／'+({min:'體重下限（kg）',max:'體重上限（kg）',minIncluded:'包含下限',maxIncluded:'包含上限'}[path.at(-1)]||path.at(-1));}
    const labels={lifeProfile:'生命階段範圍',weightMinKg:'體重下限（kg）',weightMaxKg:'體重上限（kg）',growthMinMonths:'幼犬月齡下限',growthMaxMonths:'幼犬月齡上限',adultMinMonths:'成年月齡下限',adultMaxMonths:'成年月齡上限',seniorMinMonths:'高齡月齡下限',seniorMaxMonths:'高齡月齡上限',merProfile:'動物狀態',ageBand:'月齡區間',neutered:'結紮狀態',physiology:'生理狀態',gestationWeeks:'懷孕週數',pupCountBand:'哺乳幼犬數',min:'係數下限',max:'係數上限',score:'得分',scale:'滿分',conditionJoin:'條件組合',reviewState:'判斷狀態',executionEligible:'是否可供程式使用',field:'判斷資料',operator:'比較方式',lower:'下限／比較值',upper:'上限',lowerInclusive:'包含下限',upperInclusive:'包含上限',confirmed:'人工確認',choice:'條件值',lifeRuleId:'體型規則',stage:'生命階段',elementId:'營養元素',sourceName:'來源名稱',phase:'生命階段',method:'調整方式',overridable:'優先鎖定',name:'名稱',english:'英文名稱',unit:'單位',aliases:'別名',status:'狀態',value:'標準值'};
    if(path[0]==='meta')return path.slice(1).join('／');
    if(path[0]==='ageProfile'){
      if(path[1]==='split')return '幼年期分段方式';
      const phase={juvenile:'幼年期',early:'生長前期',late:'生長後期',adult:'成年期',senior:'高齡期'}[path[2]];
      if(phase)return [phase,{from:'起始年齡',to:'結束年齡',endMode:'結束方式'}[path[3]],path[4]==='unit'?'單位':''].filter(Boolean).join('／');
    }
    const cell=path.indexOf('cells');if(cell>=0)return ctx?.headers?.[Number(path[cell+1])]||'欄位 '+(Number(path[cell+1])+1);
    const child=path.indexOf('children');if(child>=0)return '明細第 '+(Number(path[child+1])+1)+' 列／'+(ctx?.headers?.[Number(path[child+2])]||'欄位 '+(Number(path[child+2])+1));
    const cond=path.indexOf('conditions');if(cond>=0){const r=db.datasets.find(d=>d.id===ctx?.type)?.records.find(r=>r.id===ctx?.recordId),c=r?.conditions?.find(c=>c.id===path[cond+1]);return (c?.label||'判斷條件')+'／'+(labels[path.at(-1)]||path.at(-1));}
    const rule=path.indexOf('rules');if(rule>=0){const r=db.datasets.find(d=>d.id===ctx?.type)?.records.find(r=>r.id===ctx?.recordId);const item=r?.rules?.find(x=>x.id===path[rule+1]);const e=db.elements.find(e=>e.id===item?.elementId);return (e?.name||item?.sourceName||'營養規則')+'／'+(path.at(-1)==='value'?'調整值':labels[path.at(-1)]||path.at(-1));}
    const item=path.indexOf('items');if(item>=0){const e=db.elements.find(e=>e.id===path[item+1]);return (e?.name||path[item+1])+'／'+(labels[path.at(-1)]||path.at(-1));}
    return labels[path.at(-1)]||path.at(-1)||'資料';
  }
  function editFromLog(index,path){
    const r=logsForDisplay()[index],ctx=logContext(r);if(!ctx||!Object.hasOwn(names,ctx.type))return;type=ctx.type;tab='data';query='';status='全部';
    if(speciesType())speciesId=ctx.speciesId||'dog';
    if(adjustmentType()&&['修改活動量適用對象','修改 BCS 適用對象'].includes(r.action)){redraw();editActivityTargets();return;}
    if(type===breedData.id&&db.species.some(s=>s.id===ctx.recordId)){redraw();editSpecies(ctx.recordId);return;}
    if(type===breedData.id&&sizesFor().some(s=>s.id===ctx.recordId)){speciesPanel='sizes';redraw();editSize(ctx.recordId);return;}
    if(type===breedData.id)speciesPanel='breeds';
    if(type===breedData.id&&r.after?.weightStandards){speciesPanel='sizes';redraw();const size=sizesFor().find(s=>s.id===path[1]);if(size)editSize(size.id);return;}
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
      if(id&&d.records.some(x=>x.id===id)){editRecord(id);const c=path.indexOf('cells'),child=path.indexOf('children');const name=c>=0?'c'+path[c+1]:child>=0?'r'+path[child+1]+'-'+path[child+2]:path.at(-1);let field=document.querySelector(`#km-dialog [name="${CSS.escape(name)}"]`);if(path[0]==='lifeProfile')field=document.querySelector(`#km-dialog [name="life-${CSS.escape(path.at(-1))}"]`);const conditionIndex=path.indexOf('conditions');if(conditionIndex>=0){const record=d.records.find(x=>x.id===id),n=record.conditions?.findIndex(x=>x.id===path[conditionIndex+1]);if(n>=0){const card=document.querySelector(`[data-condition-index="${n}"]`);card.open=true;field=card.querySelector(`[name="condition${n}-${CSS.escape(path.at(-1))}"]`);}}const pos=path.indexOf('rules');if(pos>=0){const record=d.records.find(x=>x.id===id),n=record.rules?.findIndex(x=>x.id===path[pos+1]);if(n>=0){const card=document.querySelectorAll('[data-rule-row]')[n];if(!card)return;const suffix={value:'value',elementId:'element',phase:'phase',method:'method',overridable:'override'}[path.at(-1)];field=card.querySelector(`[name="rule${n}-${suffix}"]`);}}field?.scrollIntoView({block:'center'});field?.focus({preventScroll:true});}
      else {notice='請從目前資料清單選擇要修正的項目。';redraw();}
    }
  }
  renderers.rag = () => `<div class="nutrition-library km-library">${notice?`<div class="nutrition-message" role="status">${esc(notice)}</div>`:''}${tab==='data'?dataView():tab==='imports'?importView():logView()}<p class="nutrition-footnote">資料來自假資料 Excel，操作僅儲存在此瀏覽器；尚未串接正式資料庫、推薦計算或 RAG 索引。</p></div>`;
  Object.assign(modules.find(m=>m.id==='rag'),{subtitle:'維護營養模板、共用元素與各類規則，查詢匯入來源及異動明細。'});
  const oldRenderNav=renderNav;
  renderNav=()=>{oldRenderNav();const nav=document.querySelector('[data-view="rag"]');const group=document.createElement('details');group.className='km-nav';group.open=true;nav.before(group);group.innerHTML='<summary class="nav-item"><span class="nav-index">01</span><span class="nav-label">知識庫與檔案匯入管理</span><span class="km-caret" aria-hidden="true">▾</span></summary>'+[['data','資料維護'],['imports','檔案匯入與紀錄'],['logs','異動明細']].map(([id,n])=>`<button type="button" data-km-nav="${id}">${n}</button>`).join('');nav.remove();};
  function closeDialog(force=false) {
    if(!force&&dirty&&!confirm('尚有未儲存的修改，確定放棄？'))return;
    const editor=document.querySelector('#km-dialog');
    const page=editor?.classList.contains('km-page-editor');
    editor?.remove();dirty=false;
    if(page&&!force)redraw();
  }
  function dialog(title, body, onSave, asPage=false) {
    closeDialog(true);const d=document.createElement(asPage?'section':'dialog');d.id='km-dialog';d.className=asPage?'km-dialog km-page-editor':'km-dialog';
    d.innerHTML=`<form><header><h2>${esc(title)}</h2>${button(asPage?'回到上一頁':'關閉','data-km-close')}</header>${body}${onSave?'<p id="km-error" role="alert"></p><footer>'+button('取消','data-km-close')+'<button class="primary-button" type="submit">儲存</button></footer>':''}</form>`;
    if(asPage){
      document.querySelector('#view-content').replaceChildren(d);
      d.scrollIntoView({block:'start'});
      d.querySelector('header button').focus({preventScroll:true});
    }else{
      document.body.append(d);
      d.showModal();
      d.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
    }
    d.addEventListener('input',()=>dirty=true);d.addEventListener('change',()=>dirty=true);
    if(onSave)d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();try{onSave(new FormData(e.target));closeDialog(true);redraw();}catch(err){d.querySelector('#km-error').textContent=err.message;}});
  }
  const statusField=s=>`<label>狀態<select name="status">${options(['啟用','停用'].map(x=>[x,x]),s)}</select></label>`;
  const ruleTypes={
    '慢性病與遺傳性疾病營養':{target:5,phase:6,prop:7,value:8,base:[0,1,2,3,4,9,10,11,12]},
    '排便分類法':{target:4,prop:5,value:6,base:[0,1,2,3,7,8]},
    '亞健康觀察清單':{target:6,prop:7,value:8,base:[0,1,2,3,4,5]}
  };
  const numericCols={'ＭＥＲ係數':[2],'活動量加成':[5],'BCS加成':[4],'飲水量清單':[0,1,2,3,4,5],'排便分類法':[0]};
  const longCols={'活動量加成':[3,4],'BCS加成':[2],[allergenType]:[5],[diseaseType]:[3,4,9,10,11,12],'排便分類法':[1,3,7,8],[functionalType]:[2,3,4,5]};
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
  function initializeHealthMaintenance(){
    const allergens=db.datasets.find(d=>d.id===allergenType);
    const previousAllergens=knowledgeSeed.datasets.find(d=>d.id===allergenType);
    allergens.headers[5]='可能交叉反應（僅供參考）';
    const crossReactions=[
      '牛奶、羊肉、鹿肉可能部分交叉','火雞、鴨肉、雞蛋、禽類蛋白','牛肉、牛奶、鹿肉',
      '不同魚種之間可能交叉','豬來源成分','雞肉、火雞、其他禽類','雞肉、鴨肉、其他禽類',
      '牛肉、羊肉等反芻動物可能部分交叉','通常與其他哺乳類肉類來源不會出現交叉反應',
      '取決於來源物種','牛肉、羊奶、乳清','雞肉 / 禽類不宜直接等同，但需要注意',
      '大麥、黑麥等含麩質穀物可能部分交叉','其他穀物不直接等同','其他豆類不應等同'
    ];
    if(!allergens.crossReactionsUpdated){
      const originals=new Map(previousAllergens.records.map(r=>[r.cells[0],r]));
      crossReactions.forEach((note,i)=>{
        const code='Allergen_D_'+String(i+1).padStart(2,'0');
        const record=allergens.records.find(r=>r.cells[0]===code);
        if(record&&record.cells[5]===originals.get(code)?.cells[5])record.cells[5]=note;
      });
      allergens.crossReactionsUpdated=true;
    }
    const disease=db.datasets.find(d=>d.id===diseaseType);
    disease.records=disease.records.filter(record=>{
      const [code,...details]=record.cells;
      const placeholder=/^Disease_D_1[1-5]$/.test(code);
      const hasContent=details.some(value=>String(value??'').trim()!=='')||
        record.rules?.length||record.children?.length||record.healthMatrix?.length||
        record.processingPriority!=null;
      return !placeholder||hasContent;
    });
    const priorities=new Map([['慢性腎臟病 CKD',1],['慢性腸病',2],['遺傳性高尿酸尿症 / 尿酸鹽結石',3]]);
    for(const r of disease.records){
      const priority=priorities.get(String(r.cells[1]||'').trim());
      if(!Object.hasOwn(r,'processingPriority')&&priority!==undefined&&!disease.records.some(other=>other.processingPriority===priority))r.processingPriority=priority;
    }
    db.datasets.find(d=>d.id===functionalType).name=names[functionalType];
  }
  function initializeHealthMatrices(){
    for(const [id,groups] of [[diseaseType,healthExcelData.disease],[stoolType,healthExcelData.stool],[functionalType,healthExcelData.functional]]){
      const dataset=db.datasets.find(d=>d.id===id);
      const previous=knowledgeSeed.datasets.find(d=>d.id===id);
      for(const [index,{base,rows}] of groups.entries()){
        const name=String(base[0]).trim();
        let record=dataset.records.find(r=>r.id===id+'-1109-'+index||String(r.cells[id===stoolType?0:1]).trim()===name);
        if(!record){
          const cells=dataset.headers.map(()=>'');
          if(id===stoolType){cells[0]=base[0];cells[1]=base[1];}
          else{
            cells[0]=(id===diseaseType?'Disease':'HO')+'_1109_'+(index+1);
            cells[1]=name;
            if(id===diseaseType){cells[2]=String(base[1]??'').trim();cells[3]=base[3];}
            else cells[2]=base[1];
          }
          record={id:id+'-1109-'+index,cells,status:'啟用',rules:[],children:[]};
          dataset.records.push(record);
        }
        if(!Object.hasOwn(record,'healthMatrix')){
          const original=previous.records.find(r=>r.id===record.id);
          if(original&&id===stoolType&&record.cells[1]===original.cells[1])record.cells[1]=base[1];
          if(original&&id===diseaseType){
            if(record.cells[2]===original.cells[2])record.cells[2]=String(base[1]??'').trim();
            if(record.cells[3]===original.cells[3])record.cells[3]=base[3];
          }
        }
        if(id===diseaseType&&!Object.hasOwn(record,'processingPriority')&&!dataset.records.some(r=>r.processingPriority===base[2]))record.processingPriority=base[2];
        record.healthMatrix??=rows.map(row=>row.slice(0,healthColumns(id).length+(id===stoolType?1:0)));
        record.healthMatrixPreferred=true;
      }
    }
  }
  function nextProcessingPriority(records){
    const used=new Set(records.map(record=>record.processingPriority)
      .filter(value=>Number.isSafeInteger(value)&&value>0));
    const highest=Math.max(0,...used);
    if(highest<Number.MAX_SAFE_INTEGER)return highest+1;
    let available=1;
    while(used.has(available))available++;
    return available;
  }
  function readHealthLimit(text){
    const match=String(text??'').trim().match(/^(?:v[，,]\s*)?(min|max|不可超過|不得\s*>|≤|≥)\s*(\d+(?:\.\d+)?)$/i);
    if(!match)return null;
    const operator=match[1].toLowerCase();
    const kind=operator==='min'||operator==='≥'?'min':operator==='max'?'max':'不可超過';
    return {kind,value:match[2]};
  }
  function healthMatrixRow(id,row=[]){
    const columns=healthColumns(id),lockIndex=healthLockIndex(id);
    const sourceName=String(row[0]??'');
    const element=db.elements.find(e=>e.id===sourceName)||findElement(sourceName);
    const choices=db.elements.filter(e=>e.status==='啟用'||e.id===element?.id).map(e=>[e.id,e.name]);
    const nutrient=element?.id||sourceName;
    if(sourceName&&!element)choices.unshift([sourceName,sourceName+'（原表）']);
    const lockText=String(row[lockIndex]??'').trim();
    const supplemental=id===stoolType&&readHealthLimit(row[6]);
    const limit=readHealthLimit(lockText)||supplemental;
    const locked=Boolean(limit||/^v(?:$|[，,])/i.test(lockText));
    return `<tr data-health-row>${columns.map((column,i)=>{
      if(i===0)return `<td><select aria-label="營養素" data-health-value required>${options([['','請選擇營養素'],...choices],nutrient)}</select></td>`;
      if(i===lockIndex)return `<td><div class="km-health-lock">
        <select aria-label="優先鎖定" data-health-lock>${options([['no','否'],['yes','是']],locked?'yes':'no')}</select>
        <div data-health-limit ${locked?'':'hidden'}><select aria-label="鎖定條件" data-health-limit-kind ${locked?'':'disabled'}>${options([['','僅鎖定'],['min','min'],['max','max'],['不可超過','不可超過']],limit?.kind||'')}</select>
        <input aria-label="鎖定數值" data-health-limit-value type="number" min="0" step="any" value="${esc(limit?.value)}" ${locked&&limit?'required':'disabled'}></div>
      </div></td>`;
      return `<td><input aria-label="${esc(column)}" data-health-value value="${esc(row[i])}"></td>`;
    }).join('')}<td>${button('移除','data-health-remove')}</td></tr>`;
  }
  function healthMatrixFields(id,rows){
    const columns=healthColumns(id);
    const widths=columns.map((_,i)=>i===0?'nutrient':i<5?'stage':i===healthLockIndex(id)?'lock':'note');
    return `<section class="km-record-section"><div class="km-section-title"><div><h3>各生命階段營養明細</h3><p>依 Excel 欄位維護。可填入原表的數值、含單位的用量與鎖定說明。</p></div>${button('新增營養明細','data-health-add')}</div>
      <div class="km-health-table${id===stoolType?' km-stool-nutrition-table':''}"><table aria-label="各生命階段營養明細">
        <colgroup>${[...widths,'action'].map(width=>`<col class="km-health-col-${width}">`).join('')}</colgroup>
        <thead><tr>${[...columns,'操作'].map(column=>`<th scope="col">${esc(column)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row=>healthMatrixRow(id,row)).join('')}</tbody>
      </table></div></section>`;
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
    const label=d.headers[i].trim(),numeric=numericCols[d.id]?.includes(i),long=longCols[d.id]?.includes(i),wide=long&&((d.id===functionalType&&i===2)||(d.id===allergenType&&i===5));
    let control;
    if(d.id==='BCS加成'&&i===0)control=`<select name="${name}" required><option value="">請選擇分數</option>${options(Array.from({length:9},(_,n)=>[String(n+1)+'/9',String(n+1)+' 分（滿分 9 分）']),String(value||''))}</select>`;
    else if(d.id==='慢性病與遺傳性疾病營養'&&i===2)control=`<select name="${name}">${options([...new Set(['慢性病','遺傳性疾病',String(value||'')])].filter(Boolean).map(x=>[x,x]),String(value||'慢性病'))}</select>`;
    else if(numeric)control=`<input type="${d.id==='ＭＥＲ係數'?'text':'number'}" step="any" name="${name}" value="${esc(value===''||value==null?'':(d.id==='ＭＥＲ係數'?value:Number(String(value).replace(/＋/g,'+').replace(/−/g,'-'))))}" ${d.id==='飲水量清單'?'min="0"':''}>`;
    else if(long)control=`<textarea name="${name}" rows="3">${esc(value)}</textarea>`;
    else control=`<input type="text" name="${name}" value="${esc(value)}" ${i===0?'required':''}>`;
    return `<label class="${wide?'km-field-wide':''}">${esc(label)}${control}</label>`;
  }
  function ruleTableRow(rule,index){
    const selected=db.elements.find(e=>e.id===rule.elementId),choices=db.elements.filter(e=>e.status==='啟用'||e.id===rule.elementId);
    return `<tr data-rule-row><td><input type="hidden" name="rule${index}-id" value="${esc(rule.id)}"><select aria-label="營養元素" name="rule${index}-element" data-rule-element><option value="">${esc(rule.sourceName?'待確認：'+rule.sourceName:'請選擇營養元素')}</option>${options(choices.map(e=>[e.id,e.name+(e.unit?'（'+e.unit+'）':'')]),rule.elementId)}</select>${!selected&&rule.sourceName?`<small class="km-unresolved">保留來源「${esc(rule.sourceName)}」，請人工確認對應，不自動合併。</small>`:''}</td><td><select aria-label="適用生命階段" name="rule${index}-phase">${options([['','不指定'],['Puppy','幼犬'],['Adult','成犬']],rule.phase)}</select></td><td><select aria-label="調整方式" name="rule${index}-method">${options([['multiplier','倍率'],['ratio','指定比例']],rule.method)}</select></td><td><input aria-label="調整值" name="rule${index}-value" value="${esc(rule.value)}" placeholder="例如 1.2 或 1:1"></td><td><select aria-label="優先鎖定" name="rule${index}-override">${options([['','未指定'],['true','不鎖定'],['false','鎖定']],rule.overridable==null?'':String(rule.overridable))}</select></td><td>${button('移除','data-rule-remove')}</td></tr>`;
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
  const merChoices = {
    neutered:[['','不限'],['false','未絕育'],['true','已絕育']],
    physiology:[['normal','一般'],['pregnant','懷孕'],['lactating','哺乳']],
    gestationWeeks:[['','請選擇'],['1to6','第 1–6 週'],['7to9','第 7–9 週']],
    pupCountBand:[['','請選擇'],['1to2','1–2 隻'],['3to4','3–4 隻'],['5to6','5–6 隻'],['7to8','7–8 隻']]
  };
  const merBound = (min='',max='',unit='month',maxIncluded=false,minIncluded=true) => ({min,max,unit,maxIncluded,minIncluded});
  const merLabel = (key,value) => merChoices[key].find(([id])=>id===value)?.[1]||'';
  function merStages(id){
    const stages=templateStages(id);
    if(id!=='dog'||!stages.some(([key])=>['juvenile','early','late'].includes(key)))return stages;
    return [
      ['puppy','所有幼犬（未分期、前期、後期）'],
      ...stages.filter(([key])=>key!=='juvenile')
    ];
  }
  function merAgeText(bound){
    const {min,max,unit,minIncluded,maxIncluded}=bound;
    const suffix=unit==='year'?' 歲':' 個月';
    const parts=[];
    if(min!=='')parts.push((minIncluded?'滿 ':'超過 ')+min+suffix);
    if(max!=='')parts.push((maxIncluded?'不超過 ':'未滿 ')+max+suffix);
    return parts.join('、');
  }
  function merConditionText(profile){
    const {speciesId,stage,neutered,physiology,gestationWeeks,pupCountBand}=profile;
    if(physiology==='pregnant')return '懷孕，'+merLabel('gestationWeeks',gestationWeeks);
    if(physiology==='lactating')return '哺乳，'+merLabel('pupCountBand',pupCountBand);
    const stageLabel=merStages(speciesId).find(([id])=>id===stage)?.[1]||'生命階段待設定';
    return [stageLabel,merAgeText(profile.age),neutered?merLabel('neutered',neutered):''].filter(Boolean).join('，');
  }
  function initializeMerData(){
    const dataset=db.datasets.find(d=>d.id===merType);
    const dogNotes=[
      '新版來源只寫「幼犬」，需確認此列與 4 個月以上那列的分界。',
      '新版來源只寫「幼犬」，需確認此列與 4 個月以上那列的分界。',
      '需確認滿 4 個月時套用哪一列。',
      '新版來源寫「4 個月以上至成犬前」，需確認與舊版 12 個月上限的差異。',
      '需確認 12 個月門檻，以及高齡犬是否適用。',
      '需確認 12 個月門檻，以及高齡犬是否適用。'
    ];
    const dogSource=[
      '幼犬，未絕育','幼犬，絕育','幼犬，4 個月以上至成犬前，未絕育',
      '幼犬，4 個月以上至成犬前，絕育','成犬，12 個月以上，未絕育','成犬，12 個月以上，絕育'
    ];
    const oldBands={under4:merBound('',4,'month',true),from4ToAdult:merBound(4),from4To12:merBound(4,12,'month',true),from12:merBound(12)};
    for(const r of dataset.records){
      if(r.merProfile?.speciesId)continue;
      const n=Number(String(r.cells[0]).match(/^MER_D_(\d+)$/)?.[1]);
      const legacy=r.merProfile;
      const original=knowledgeSeed.datasets.find(d=>d.id===merType).records.find(x=>x.cells[0]===r.cells[0]);
      const stock=!legacy&&original?.cells[1]===r.cells[1];
      const physiology=legacy?.physiology||(stock&&n>=7&&n<=12?(n<=8?'pregnant':'lactating'):'normal');
      const band=legacy?.ageBand||(stock?['under4','under4','from4ToAdult','from4To12','from12','from12'][n-1]:'');
      r.merProfile={
        speciesId:'dog',physiology,
        stage:legacy?.stage||(stock&&n<=6?(n<=4?'puppy':'adult'):''),
        neutered:legacy?.neutered||(stock&&n<=6?(n%2===0?'true':'false'):''),
        age:oldBands[band]||merBound(),
        gestationWeeks:legacy?.gestationWeeks||(stock&&n===7?'1to6':stock&&n===8?'7to9':''),
        pupCountBand:legacy?.pupCountBand||(stock?['1to2','3to4','5to6','7to8'][n-9]||'':'')
      };
      r.sourceAnimalState||=r.cells[1];
      if(dogNotes[n-1]){
        r.merReviewNote=dogNotes[n-1];
        r.merLatestSource=dogSource[n-1];
      }
    }
    const cats=[
      ['幼貓','juvenile','',2.5,merBound(),''],
      ['成貓，未絕育','adult','false',1.4,merBound(),''],
      ['成貓，已絕育','adult','true',1.2,merBound(),''],
      ['高齡初期貓','senior','',1.4,merBound(),'需確認高齡初期的結束年齡。'],
      ['高齡後期貓，11 歲以上','senior','',1.6,merBound(11,'','year'),'需確認滿 11 歲時與高齡初期的分界。']
    ];
    cats.forEach(([source,stage,neutered,value,age,note],i)=>{
      const code='MER_C_0'+(i+1);
      if(dataset.records.some(r=>r.cells[0]===code))return;
      dataset.records.push({
        id:'mer-cat-'+(i+1),cells:[code,source,value],status:'啟用',children:[],
        merProfile:{speciesId:'cat',stage,neutered,age,physiology:'normal',gestationWeeks:'',pupCountBand:''},
        sourceAnimalState:source,merReviewNote:note
      });
    });
  }
  function merContent(){
    const rows=selectedDataset().records.map(r=>{
      const profile=r.merProfile;
      const species=db.species.find(s=>s.id===profile.speciesId)?.name||'待設定';
      return {r,species,condition:merConditionText(profile)};
    }).filter(({r,species,condition})=>matches({...r,species,condition}));
    return '<p class="nutrition-footnote km-mer-intro">依物種、生命階段與絕育狀態查基準係數。需要再細分時，可加上年齡條件。活動量與 BCS 修正各自在對應分頁維護。</p>'+
      rowsTable(['編號','物種','適用條件','基準 MER 係數','狀態','操作'],rows.map(({r,species,condition})=>
        `<tr><td>${esc(r.cells[0])}</td><td>${esc(species)}</td><td>${esc(condition)}</td><td>${esc(r.cells[2])}</td><td>${badge(r.status)}${r.merReviewNote?'<br><small class="km-unresolved">條件待確認</small>':''}</td><td>${button('檢視／編輯',`data-km-record="${esc(r.id)}"`)}</td></tr>`));
  }
  function editMer(id){
    const dataset=selectedDataset(),old=dataset.records.find(r=>r.id===id);
    const p=old?.merProfile||{speciesId:'',stage:'',neutered:'',physiology:'normal',age:merBound()};
    const [lo='',hi=lo]=String(old?.cells[2]??'').split(/[-–]/);
    const select=(name,label,entries,value)=>`<label>${label}<select name="mer-${name}">${options(entries,value)}</select></label>`;
    const stageOptions=id=>[['','請選擇生命階段'],...merStages(id)];
    const speciesOptions=db.species.filter(s=>s.status==='啟用'||s.id===p.speciesId).map(s=>[s.id,s.name+(s.status==='停用'?'（停用）':'')]);
    const boundField=(key,label,value)=>`<label>${label}<input type="number" min="0" step="any" name="mer-${key}" value="${esc(value)}" placeholder="不限"></label>`;
    dialog(old?'檢視／編輯 MER 係數':'新增 MER 係數',`
      <section class="km-record-section"><h3>基本資料</h3><div class="km-record-grid">
        <label>編號<input name="c0" value="${esc(old?.cells[0])}" required></label>${statusField(old?.status||'啟用')}
        ${select('species','物種',[['','請選擇物種'],...speciesOptions],p.speciesId)}
        ${select('physiology','生理狀態',merChoices.physiology,p.physiology)}
      </div></section>
      <section class="km-record-section km-mer-fields"><h3>查表條件</h3>
        <div data-mer-section="normal">
          <div class="km-record-grid">${select('stage','生命階段',stageOptions(p.speciesId),p.stage)}${select('neutered','絕育狀態',merChoices.neutered,p.neutered)}</div>
          ${p.speciesId==='dog'&&p.stage==='juvenile'?'<p class="km-unresolved">此筆使用舊版幼犬階段，請重新選擇適用範圍後儲存。</p>':''}
          <fieldset><legend>年齡區間（選填）</legend><div class="km-record-grid">
            ${boundField('age-min','起始年齡',p.age.min)}
            ${select('age-min-edge','起始邊界',[['true','含起始年齡'],['false','超過起始年齡']],String(p.age.minIncluded))}
            ${boundField('age-max','結束年齡',p.age.max)}
            ${select('age-max-edge','結束邊界',[['false','未滿結束年齡'],['true','含結束年齡']],String(p.age.maxIncluded))}
            ${select('age-unit','年齡單位',[['month','月'],['year','歲']],p.age.unit)}
          </div><p class="nutrition-footnote">留空時，依生命階段查表。</p></fieldset>
        </div>
        <div class="km-record-grid" data-mer-section="pregnant">${select('gestation','懷孕週數',merChoices.gestationWeeks,p.gestationWeeks)}</div>
        <div class="km-record-grid" data-mer-section="lactating">${select('pups','哺乳幼犬數',merChoices.pupCountBand,p.pupCountBand)}</div>
        ${old?.merReviewNote?`<p class="km-unresolved">${esc(old.merReviewNote)}</p>`:''}
        ${old?.sourceAnimalState?`<details class="km-source-notes"><summary>查看來源文字</summary><p>${esc(old.merLatestSource||old.sourceAnimalState)}</p></details>`:''}
      </section>
      <section class="km-record-section km-mer-fields"><h3>基準 MER 係數</h3><div class="km-record-grid">
        ${select('mode','係數設定',[['fixed','固定值'],['range','區間']],lo===hi?'fixed':'range')}
        <label><span data-mer-coefficient-label>係數</span><input name="mer-min" type="number" min="0" step="any" value="${esc(lo)}" required></label>
        <label data-mer-max>係數上限<input name="mer-max" type="number" min="0" step="any" value="${esc(lo===hi?'':hi)}"></label>
      </div></section>`,f=>{
      const code=f.get('c0').trim();
      if(!code||dataset.records.some(r=>r.id!==id&&r.cells[0]===code))throw Error('請填寫未重複的編號。');
      const get=key=>f.get('mer-'+key)||'';
      const speciesId=get('species'),physiology=get('physiology'),stage=get('stage');
      if(!db.species.some(s=>s.id===speciesId))throw Error('請選擇物種。');
      if(physiology==='normal'&&!merStages(speciesId).some(([key])=>key===stage))throw Error('請選擇此物種的生命階段。');
      if(physiology==='pregnant'&&!get('gestation')||physiology==='lactating'&&!get('pups'))throw Error('請填寫對應的懷孕週數或哺乳幼犬數。');
      const min=Number(get('min')),max=get('mode')==='range'?Number(get('max')):min;
      if(get('min')===''||get('mode')==='range'&&get('max')===''||!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<min)throw Error('請填寫有效的基準係數，區間上限須大於或等於下限。');
      const start=get('age-min'),end=get('age-max');
      const age=merBound(start===''?'':Number(start),end===''?'':Number(end),get('age-unit')||'month',get('age-max-edge')==='true',get('age-min-edge')!=='false');
      if(start!==''&&end!==''&&(age.max<age.min||age.max===age.min&&!(age.minIncluded&&age.maxIncluded)))throw Error('請確認年齡區間的起始、結束與邊界。');
      const profile={speciesId,stage,neutered:get('neutered'),physiology,age,gestationWeeks:get('gestation'),pupCountBand:get('pups')};
      const next={...old,id:old?.id||newId('mer'),cells:[code,merConditionText(profile),min===max?min:min+'–'+max],children:old?.children||[],status:f.get('status'),merProfile:profile,coefficient:{min,max}};
      const before=old&&structuredClone(old);
      if(old)Object.assign(old,next);else dataset.records.push(next);
      persist(before,old?'修改資料':'新增資料',dataset.name+' / '+code,next);
    });
    const form=document.querySelector('#km-dialog form');
    form.closest('dialog').classList.add('km-record-dialog');
    const fields=form.elements;
    const update=()=>{
      const physiology=fields['mer-physiology'].value;
      for(const section of form.querySelectorAll('[data-mer-section]')){
        section.hidden=section.dataset.merSection!==physiology;
        section.querySelectorAll('input,select').forEach(field=>field.disabled=section.hidden);
      }
      const range=fields['mer-mode'].value==='range',max=fields['mer-max'];
      max.required=range;
      max.disabled=!range;
      max.closest('label').hidden=!range;
      form.querySelector('[data-mer-coefficient-label]').textContent=range?'係數下限':'係數';
    };
    form.addEventListener('change',e=>{
      if(e.target.name==='mer-species')fields['mer-stage'].innerHTML=options(stageOptions(e.target.value),'');
      update();
    });
    update();
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
  const activeSpecies = () => db.species.find(s=>s.id===speciesId);
  const sizesFor = (id=speciesId) => breedData.weightStandards.filter(s=>s.speciesId===id);
  const breedsFor = () => breedData.records.filter(r=>r.speciesId===speciesId);
  const speciesPicker = () => `<label>物種<select id="km-species">${options(db.species.map(s=>[s.id,s.name+(s.status==='停用'?'（停用）':'')]),speciesId)}</select></label>`;
  const newId = prefix => prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);

  function initializeSpeciesData() {
    db.species ||= structuredClone(speciesSeed);
    if(!breedData.weightStandards.some(w=>w.speciesId==='cat')){
      breedData.records.push(...structuredClone(catSizeSeed.records));
      breedData.weightStandards.push(...structuredClone(catSizeSeed.weightStandards));
    }
    const ensureSize = (name,id) => {
      const existing=sizesFor(id).find(s=>s.size===name);
      if(existing||!name)return existing?.id||'';
      const size={id:newId('size'),speciesId:id,size:name,min:'',max:'',minIncluded:'待確認',maxIncluded:'不適用'};
      breedData.weightStandards.push(size);
      return size.id;
    };
    breedData.weightStandards.forEach(s=>s.speciesId||='dog');
    breedData.records.forEach(r=>{
      r.speciesId||='dog';
      r.sizeRefs||=[3,4,5].map(i=>ensureSize(r.cells[i],r.speciesId));
    });
    lifeData.records.forEach(r=>{
      r.speciesId||='dog';
      r.sizeId||=ensureSize(r.cells[0],r.speciesId);
    });
  }

  function breedContent(){
    const sizes=sizesFor(),byId=new Map(sizes.map(s=>[s.id,s.size]));
    const heading=`<div class="km-species-bar"><div class="km-species-tabs" role="group" aria-label="物種資料">${[['breeds','品種清單'],['sizes','體型定義']].map(([id,label])=>button(label,`data-km-species-panel="${id}" aria-pressed="${speciesPanel===id}"`)).join('')}</div>${button('管理物種','data-km-species-manage')}</div>`;
    const edge=(v,included,lower)=>v===''?'—':(included==='待確認'?'待確認：':included==='包含'?(lower?'≥ ':'≤ '):(lower?'> ':'< '))+v+' kg';
    if(speciesPanel==='sizes'){
      const rows=sizes.filter(s=>!query||s.size.toLowerCase().includes(query.toLowerCase())).map(s=>`<tr><td>${esc(s.size)}</td><td>${esc(edge(s.min,s.minIncluded,true))}</td><td>${s.min!==''&&s.max===''?'不限':esc(edge(s.max,s.maxIncluded,false))}</td><td>${button('檢視／編輯',`data-km-size="${esc(s.id)}"`)}</td></tr>`);
      return heading+`<div class="km-section-actions"><span>體重門檻用於依實際體重判定。尚無門檻的體型仍可供品種直接指定。</span>${button('新增體型','data-km-size-new',true)}</div>`+
        (speciesId==='cat'?'<p class="nutrition-footnote">貓的來源體重區間有小數空隙，且超小型、超大型沒有提供體重門檻，需確認後才能用於體重判定。</p>':'')+
        rowsTable(['體型','體重下限','體重上限','操作'],rows);
    }
    return heading+`<div class="km-section-actions"><span>${sizes.length?'可直接指定體型、設定公性例外，或依實際體重判定。':'此物種尚無體型。可先到「體型定義」建立體型，再新增品種。'}</span>${button('新增品種','data-km-new',true)}</div>`+
      rowsTable(['品種／尺寸','判定方式','預設體型','例外／備援','狀態','操作'],breedsFor().filter(r=>matches({...r,sizeNames:r.sizeRefs.map(id=>byId.get(id))})).map(r=>{
        const [standard,male,fallback]=r.sizeRefs.map(id=>byId.get(id));
        return `<tr><td><strong>${esc(r.cells[0])}</strong>${r.cells[1]?`<small class="km-breed-sub">${esc(r.cells[1])}</small>`:''}</td><td>${esc(r.cells[2])}</td><td>${esc(standard||'依體重標準')}</td><td>${male?'公性 → '+esc(male):fallback?'缺少體重 → '+esc(fallback):'—'}</td><td>${badge(r.status)}</td><td>${button('檢視／編輯',`data-km-record="${esc(r.id)}"`)}</td></tr>`;
      }));
  }

  function manageSpecies(){
    dialog('管理物種',`<div class="km-species-manager">
      <div class="km-section-title"><p>管理可在資料維護中選用的物種。</p>${button('新增物種','data-km-species-new',true)}</div>
      <ul>${db.species.map(s=>`<li><span><strong>${esc(s.name)}</strong> ${badge(s.status)}</span>${button('編輯',`data-km-species-edit="${esc(s.id)}" aria-label="編輯物種 ${esc(s.name)}"`)}</li>`).join('')}</ul>
      </div>`);
    document.querySelector('#km-dialog').classList.add('km-species-dialog');
  }

  function editSpecies(id){
    const old=db.species.find(s=>s.id===id),r=old||{id:newId('species'),name:'',status:'啟用'};
    dialog(old?'編輯物種':'新增物種',`<div class="km-record-grid"><label>物種名稱<input name="name" value="${esc(r.name)}" required placeholder="例如犬、貓"></label>${statusField(r.status)}</div>`,f=>{
      const name=f.get('name').trim();
      if(!name||db.species.some(s=>s.id!==r.id&&s.name.toLowerCase()===name.toLowerCase()))throw Error('請填寫未重複的物種名稱。');
      const next={...r,name,status:f.get('status')},before=old&&structuredClone(old);
      if(old)Object.assign(old,next);else db.species.push(next);
      if(!old){speciesId=next.id;speciesPanel='breeds';query='';status='全部';}
      persist(before,old?'修改物種':'新增物種',name,next);
    });
  }

  function editSize(id){
    const old=sizesFor().find(s=>s.id===id),r=old||{id:newId('size'),speciesId,size:'',min:'',max:'',minIncluded:'包含',maxIncluded:'不適用'};
    const edge=(name,value)=>`<label>是否包含邊界<select name="${name}">${options(['待確認','包含','不包含'].map(x=>[x,x]),value)}</select></label>`;
    dialog(old?'編輯體型':'新增體型',`<p>${esc(activeSpecies().name)}</p><div class="km-record-grid">
      <label>體型名稱<input name="name" value="${esc(r.size)}" required></label>
      <label>體重下限（kg）<input type="number" min="0" step="any" name="min" value="${esc(r.min)}"></label>
      ${edge('minIncluded',r.minIncluded)}
      <label>體重上限（kg）<input type="number" min="0" step="any" name="max" value="${esc(r.max)}" placeholder="留白表示不限"></label>
      ${edge('maxIncluded',r.maxIncluded==='不適用'?'待確認':r.maxIncluded)}
      </div><p class="nutrition-footnote">未提供體重門檻時，上下限都可留白。</p>`,f=>{
      const size=f.get('name').trim();
      if(!size||sizesFor().some(s=>s.id!==r.id&&s.size.toLowerCase()===size.toLowerCase()))throw Error('請填寫此物種下未重複的體型名稱。');
      const min=f.get('min')===''?'':Number(f.get('min')),max=f.get('max')===''?'':Number(f.get('max'));
      if(max!==''&&(min===''||max<=min))throw Error('有體重上限時須填下限，且上限須大於下限。');
      const next={...r,size,min,max,minIncluded:min===''?'待確認':f.get('minIncluded'),maxIncluded:max===''?'不適用':f.get('maxIncluded')};
      if(min!==''&&(min!==r.min||max!==r.max||next.minIncluded!==r.minIncluded||next.maxIncluded!==r.maxIncluded)){
        const overlap=sizesFor().find(s=>s.id!==r.id&&s.min!==''&&
          (s.max===''||min<s.max||min===s.max&&next.minIncluded==='包含'&&s.maxIncluded==='包含')&&
          (max===''||s.min<max||s.min===max&&s.minIncluded==='包含'&&next.maxIncluded==='包含'));
        if(overlap)throw Error('體重區間與「'+overlap.size+'」重疊，請核對上下限。');
      }
      const before=old&&structuredClone(old);
      if(old)Object.assign(old,next);else breedData.weightStandards.push(next);
      if(before&&before.size!==next.size){
        breedsFor().forEach(b=>b.sizeRefs.forEach((ref,i)=>{if(ref===next.id)b.cells[i+3]=next.size;}));
        lifeData.records.filter(l=>l.sizeId===next.id).forEach(l=>l.cells[0]=next.size);
      }
      persist(before,old?'修改體型':'新增體型',activeSpecies().name+'／'+size,next);
    });
  }

  function editBreed(id){
    const old=breedsFor().find(r=>r.id===id),r=old||{id:newId('breed'),speciesId,cells:['','','直接指定','','','',''],sizeRefs:['','',''],children:[],status:'啟用'};
    const sizes=sizesFor();
    const sizeField=(label,name,index)=>`<label>${label}<select name="${name}">${options([['','未指定'],...sizes.map(s=>[s.id,s.size])],r.sizeRefs[index])}</select></label>`;
    dialog(old?'編輯品種':'新增品種',`<section class="km-record-section"><h3>${esc(activeSpecies().name)} · 品種資料</h3><div class="km-record-grid">
      <label>品種<input name="breed" value="${esc(r.cells[0])}" required></label>
      <label>尺寸<input name="size" value="${esc(r.cells[1])}" placeholder="如玩具、迷你、標準；無區分可留白"></label>
      <label>判定方式<select name="mode">${options(['直接指定','依體重判定'].map(v=>[v,v]),r.cells[2])}</select></label>${statusField(r.status)}
      </div></section><section class="km-record-section"><h3>體型判定</h3><div class="km-record-grid">
      <div data-breed-direct>${sizeField('預設體型','defaultSize',0)}</div>
      <div data-breed-direct>${sizeField('公性例外體型','maleSize',1)}</div>
      <div data-breed-weight>${sizeField('缺少體重時暫用體型','fallbackSize',2)}</div>
      </div><p class="nutrition-footnote" data-breed-weight>依此物種的體重門檻判定。缺少體重且未設定暫用體型時，需補齊資料。</p>
      <label>備註<textarea rows="2" name="note">${esc(r.cells[6])}</textarea></label></section>`,f=>{
      const breed=f.get('breed').trim(),size=f.get('size').trim(),mode=f.get('mode');
      if(!breed)throw Error('請填寫品種。');
      if(breedsFor().some(x=>x.id!==r.id&&x.cells[0]===breed&&x.cells[1]===size))throw Error('此物種下已存在相同品種與尺寸。');
      const sizeRefs=mode==='直接指定'?[f.get('defaultSize'),f.get('maleSize'),'']:['','',f.get('fallbackSize')];
      if(mode==='直接指定'&&!sizeRefs[0])throw Error('請選擇預設體型，或先建立此物種的體型。');
      const next={...r,sizeRefs,cells:[breed,size,mode,...sizeRefs.map(ref=>sizes.find(s=>s.id===ref)?.size||''),f.get('note').trim()],status:f.get('status')};
      const before=old&&structuredClone(old);
      if(old)Object.assign(old,next);else breedData.records.push(next);
      persist(before,old?'修改品種':'新增品種',activeSpecies().name+'／'+breed+(size?'／'+size:''),next);
    });
    const d=document.querySelector('#km-dialog'),mode=d.querySelector('[name="mode"]');
    d.classList.add('km-record-dialog');
    const update=()=>{
      const weight=mode.value==='依體重判定';
      d.querySelectorAll('[data-breed-direct]').forEach(el=>el.hidden=weight);
      d.querySelectorAll('[data-breed-weight]').forEach(el=>el.hidden=!weight);
    };
    update();
    mode.addEventListener('change',update);
  }
  function activityStages(id,sizeIds=[]){
    const stages=templateStages(id,sizeIds);
    if(id!=='dog')return stages;
    if(type===bcsType)return stages.map(([key,label])=>[key,key==='senior'?'高齡犬':label]);
    const puppyStages=['juvenile','early','late'];
    const result=stages.filter(([key])=>!puppyStages.includes(key));
    if(stages.some(([key])=>puppyStages.includes(key)))result.unshift(['juvenile','幼犬']);
    return result.map(([key,label])=>[key,key==='senior'?'高齡犬':label]);
  }

  function activityMode(id,stage){
    const modes=type===bcsType?db.bcsTargetModes:db.activityTargetModes;
    return modes?.[id]?.[stage]||(id==='dog'&&stage==='adult'?'size':'shared');
  }

  const overweightTemplate=()=>db.templates.find(t=>t.id==='T-cat-4'||t.name==='過重貓');
  function activityTargets(id){
    const targets=activityStages(id).flatMap(([stage,label])=>{
      if(activityMode(id,stage)==='shared')return [[stage,label+'（共用）']];
      return sizesFor(id).filter(size=>activityStages(id,[size.id]).some(([key])=>key===stage))
        .map(size=>[stage+':'+size.id,size.size+'（'+label+'）']);
    });
    if(id==='cat'&&type===bcsType)targets.push(['pregnant','懷孕貓'],['lactating','哺乳貓']);
    const overweight=overweightTemplate();
    if(id==='cat'&&overweight?.applicability.speciesId==='cat')targets.push(['template:'+overweight.id,overweight.name]);
    return targets;
  }

  function initializeActivityData(){
    const data=db.datasets.find(d=>d.id===activityType);
    const dogs=[
      ['極低活動量','幾乎只在室內活動，外出主要是為了排泄，無明顯運動',[0,-0.2,-0.2,-0.2,-0.3,-0.1]],
      ['低活動量','每日短時間散步，約 15–30 分鐘',[0.1,0,0,0,0,0]],
      ['一般活動量','每日散步約 30–60 分鐘；有日常玩耍',[0.2,0.1,0.1,0.1,0.1,0.1]],
      ['中高活動量','每日活動 60–120 分鐘；快走、跑跳、較長散步',[0.3,0.3,0.3,0.2,0.2,0.2]],
      ['高活動量','每日活動 2–4 小時；登山、慢跑、訓練、長時間戶外',[0.4,0.6,0.6,0.5,0.4,0.3]],
      ['工作犬級活動量','每日長時間工作、巡邏、搜救、牧羊、狩獵訓練',['不適用',1,1.2,1.2,1,'不適用']],
      ['競賽 / 極端活動','雪橇、耐力競賽、長時間高強度訓練',['不適用',[2,'建議個案化'],[2.5,'建議個案化'],[2.5,'建議個案化'],[2,'建議個案化'],'不適用']]
    ];
    const cats=[
      ['極低活動量','幾乎不玩、不跳、不追逐，多數時間睡覺\n每日活動時間約 <10 分鐘',[0.05,-0.1,-0.1,-0.2]],
      ['低活動量','偶爾走動或短暫玩耍\n每日活動時間約  10–20 分鐘',[0.15,0.05,-0.05,-0.1]],
      ['一般活動量','每日有互動遊戲、跳上跳下、短時間追逐\n每日活動時間約 20–40 分鐘',[0.3,0.15,0.05,0.05]],
      ['中高活動量','每日玩耍活躍，經常攀爬跳躍\n每日活動時間約 40–60 分鐘',[0.5,0.3,0.15,0.15]],
      ['高活動量','頻繁奔跑、攀爬、戶外活動\n每日活動時間約 60–120 分鐘',[0.7,0.5,0.3,0.25]],
      ['極高活動量','長時間戶外活動、狩獵、活動區域大',[0.9,0.8,0.4,['不適用','需個案處理']]]
    ];
    const overweight=overweightTemplate();
    const groups=[
      ['dog','Activity_MER_D_',dogs,['juvenile','adult:size-s','adult:size-m','adult:size-l','adult:size-xl','senior']],
      ['cat','Activity_C_',cats,['juvenile','adult','senior','template:'+(overweight?.id||'T-cat-4')]]
    ];
    for(const [speciesId,prefix,levels,targets] of groups){
      levels.forEach(([name,definition,values],i)=>{
        const id='activity-level-'+speciesId+'-'+(i+1);
        if(data.records.some(r=>r.id===id))return;
        const adjustments=Object.fromEntries(values.map((entry,j)=>{
          const [value,note='']=Array.isArray(entry)?entry:[entry];
          return [targets[j],{value:value==='不適用'?null:value,notApplicable:value==='不適用',note}];
        }));
        const code=prefix+String(i+1).padStart(2,'0');
        data.records.push({id,speciesId,cells:[code,name,'',definition,'',''],children:[],status:'啟用',adjustments});
      });
    }
  }

  function initializeBcsData(){
    const dataset=db.datasets.find(d=>d.id===bcsType);
    const descriptions=[
      ['嚴重消瘦','肋骨、腰椎、骨盆骨明顯可見，幾乎無脂肪覆蓋，肌肉量常明顯不足'],
      ['明顯過瘦','肋骨容易看見，脂肪覆蓋很少，腰身與腹線非常明顯'],
      ['偏瘦','肋骨容易觸摸且脂肪少，腰身較明顯，可能略低於理想體態'],
      ['略瘦但可接受','肋骨容易觸摸，脂肪覆蓋少，腰身清楚，部分運動犬可能正常'],
      ['理想體態','肋骨可觸摸但不明顯外露，有腰身，腹線適中'],
      ['輕度過重','肋骨仍可觸摸但脂肪覆蓋增加，腰身略不明顯'],
      ['過重','肋骨不易觸摸，明顯脂肪覆蓋，腰身不明顯，腹部脂肪增加'],
      ['肥胖','大量脂肪覆蓋，腰身消失，腹部脂肪明顯，活動可能下降'],
      ['嚴重肥胖','極大量脂肪堆積，胸、脊、腹部脂肪明顯，可能伴隨運動不耐']
    ];
    const dogValues=[
      [.6,.6,.6,.5,.45,.45,.3,.4,.35],
      [.45,.45,.45,.4,.35,.35,.2,.3,.3],
      [.2,.2,.2,.2,.15,.2,.1,.15,.2],
      [.3,.3,.3,.3,.16,.3,.2,.16,.3],
      [0,0,0,0,0,0,0,0,0],
      [-.3,-.3,-.4,-.4,-.4,-.25,0,-.1,-.1],
      [-.4,-.4,-.5,-.5,-.5,-.26,-.1,-.2,-.2],
      [-.5,-.5,-.6,-.6,-.6,-.27,-.2,-.3,-.3],
      [-.6,-.6,-.7,-.7,-.7,-.28,-.3,-.4,-.4]
    ];
    const catValues=[
      [.02,.02,.2,.12,0,null],
      [.03,.03,.1,.13,.1,null],
      [.04,.04,0,.14,.2,null],
      [.05,.05,.1,.15,.3,null],
      [0,0,.05,.05,.2,null],
      [-.03,-.05,.03,.05,.1,-.3],
      [-.04,-.06,-.15,-.05,.05,-.4],
      [-.05,-.07,-.16,-.06,-.05,-.5],
      [-.06,-.08,-.17,-.07,-.06,-.6]
    ];
    const groups=[
      ['dog',dogValues,['adult:size-xs','adult:size-s','adult:size-m','adult:size-l','adult:size-xl','juvenile','early','late','senior']],
      ['cat',catValues,['juvenile','adult','senior','pregnant','lactating','template:'+(overweightTemplate()?.id||'T-cat-4')]]
    ];
    for(const [speciesId,values,targets] of groups){
      descriptions.forEach(([classification,definition],i)=>{
        const score=i+1,id='bcs-'+speciesId+'-'+score;
        if(dataset.records.some(r=>r.id===id))return;
        const adjustments=Object.fromEntries(targets.map((key,j)=>{
          const value=values[i][j];
          return [key,{value,notApplicable:value===null,note:''}];
        }));
        dataset.records.push({id,speciesId,cells:[score+'/9',classification,definition,'',''],children:[],status:'啟用',bcsScore:{score,scale:9},adjustments});
      });
    }
  }

  function activityContent(){
    const bcs=type===bcsType;
    const targets=activityTargets(speciesId);
    const records=selectedDataset().records;
    const levels=records.filter(r=>r.speciesId===speciesId&&r.adjustments&&matches(r));
    const adjustmentCell=entry=>{
      if(!entry)return '—';
      const value=entry.notApplicable?'不適用':entry.value===null?'—':entry.value>0?'+'+entry.value:entry.value;
      return esc(value)+(entry.note?`<br><small>${esc(entry.note)}</small>`:'');
    };
    const action=r=>button('檢視／編輯',`data-km-record="${esc(r.id)}"`);
    const current=rowsTable([bcs?'BCS 評分／體態':'活動量等級','定義',...targets.map(([,label])=>esc(label)),'狀態','操作'],levels.map(r=>
      `<tr><td><strong>${esc(bcs?r.cells[0]:r.cells[1])}</strong><br><small>${esc(bcs?r.cells[1]:r.cells[0])}</small></td><td>${short(r.cells[bcs?2:3])}</td>
      ${targets.map(([key])=>`<td>${adjustmentCell(r.adjustments[key])}</td>`).join('')}<td>${badge(r.status)}</td><td>${action(r)}</td></tr>`));
    const legacy=speciesId==='dog'?records.filter(r=>!r.adjustments&&matches(r)):[];
    const notes=[bcs?'每個適用對象的 MER 加成都必填。0 表示不加減。':'儲存活動等級時，每個對象都要填寫 MER 加成。0 表示不加減。'];
    if(!bcs&&speciesId==='dog'&&activityMode(speciesId,'adult')==='size')notes.push('超小型成犬在 Excel 未提供獨立加成值。');
    if(speciesId==='cat')notes.push('過重貓欄的套用條件待確認。');
    return `<div class="km-section-actions"><span>${esc(notes.join(' '))}</span>${button('設定加成對象','data-km-activity-targets')}</div>`+current+
      (legacy.length?`<details class="km-source-notes"><summary>查看舊版${bcs?' BCS ':'活動量'}資料（${legacy.length} 筆）</summary>
      ${rowsTable([bcs?'評分':'編號',bcs?'體態分類':'活動量等級','舊版對象','舊版修正','操作'],legacy.map(r=>`<tr><td>${esc(r.cells[0])}</td><td>${esc(r.cells[1])}</td><td>${short(r.cells[bcs?3:4])}</td><td>${esc(r.cells[bcs?4:5])}</td><td>${action(r)}</td></tr>`))}</details>`:'');
  }

  function editActivityTargets(){
    const id=speciesId,stages=activityStages(id);
    if(!stages.length){notice='請先到生命階段判斷表設定此物種的生命階段。';redraw();return;}
    const choices=[['shared','同階段共用'],['size','依體型分開']];
    const bcs=type===bcsType;
    dialog('設定加成對象',`<p>${esc(activeSpecies().name)} · 此設定適用該物種的所有${bcs?' BCS 分數':'活動等級'}。</p>
      <div class="km-record-grid">${stages.map(([key,label])=>`<label>${esc(label)}<select name="activity-mode-${esc(key)}">${options(choices,activityMode(id,key))}</select></label>`).join('')}</div>
      <p class="nutrition-footnote">切換後，另一種設定已填的數值會保留。請填寫新出現的空白欄位。</p>`,f=>{
      const before=Object.fromEntries(stages.map(([key])=>[key,activityMode(id,key)]));
      const after=Object.fromEntries(stages.map(([key])=>[key,f.get('activity-mode-'+key)]));
      const modes=bcs?(db.bcsTargetModes||={}):(db.activityTargetModes||={});
      modes[id]={...modes[id],...after};
      persist(before,bcs?'修改 BCS 適用對象':'修改活動量適用對象',activeSpecies().name,after);
    });
  }

  function editActivity(id){
    const bcs=type===bcsType;
    const dataset=selectedDataset();
    const old=dataset.records.find(r=>r.id===id);
    const targets=activityTargets(speciesId);
    const r=old||{id:newId('activity'),speciesId,cells:['','','','','',''],children:[],status:'啟用',adjustments:{}};
    const fields=targets.map(([key,label],i)=>{
      const entry=r.adjustments[key]||{};
      if(bcs&&entry.notApplicable)return `<fieldset><legend>${esc(label)}</legend><p class="nutrition-footnote">不適用</p></fieldset>`;
      return `<fieldset><legend>${esc(label)}</legend><div class="km-record-grid">
        <label>MER 加成<input type="number" step="any" name="value-${i}" value="${esc(entry.value)}" placeholder="請填數值" required></label>
        <label>提示（選填）<input name="note-${i}" value="${esc(entry.note)}"></label>
        ${entry.notApplicable?'<small class="km-field-wide km-unresolved">原資料標示為「不適用」。</small>':''}
      </div></fieldset>`;
    }).join('');
    const scores=Array.from({length:9},(_,i)=>[String(i+1)+'/9',String(i+1)+'/9'])
      .filter(([score])=>!dataset.records.some(other=>other.id!==r.id&&other.speciesId===speciesId&&other.adjustments&&other.cells[0]===score));
    const identity=bcs
      ?`<label>BCS 評分<select name="c0" required>${options([['','請選擇分數'],...scores],r.cells[0])}</select></label>`
      :`<label>編號<input name="c0" value="${esc(r.cells[0])}" required></label>`;
    const definitionColumn=bcs?2:3;
    dialog(bcs?'維護 BCS 加成':old?'檢視／編輯活動量':'新增活動等級',`<section class="km-record-section"><h3>${esc(activeSpecies().name)} · ${bcs?'BCS 評分':'活動等級'}</h3>
      <div class="km-record-grid">
        ${identity}${statusField(r.status)}
        <label class="km-field-wide">${bcs?'體態分類':'活動量等級'}<input name="c1" value="${esc(r.cells[1])}" required></label>
        <label class="km-field-wide">定義<textarea name="definition" rows="2">${esc(r.cells[definitionColumn])}</textarea></label>
      </div></section><section class="km-record-section"><h3>各對象的 MER 加成</h3>
      <p class="nutrition-footnote">每個${bcs?'適用':''}對象的加成都必填，可填正數、負數或 0。</p>
      ${fields?`<div class="km-activity-targets">${fields}</div>`:'<p>此物種尚未設定生命階段。</p>'}</section>`,f=>{
      const code=f.get('c0').trim(),name=f.get('c1').trim();
      if(!code||!name)throw Error(bcs?'請選擇 BCS 分數並填寫體態分類。':'請填寫編號和活動量等級。');
      if(bcs&&!scores.some(([score])=>score===code))throw Error('請選擇尚未設定的 BCS 分數。');
      if(!bcs&&dataset.records.some(other=>other.id!==r.id&&other.adjustments&&other.cells[0]===code))throw Error('此活動量編號已存在。');
      if(!targets.length)throw Error('請先到生命階段判斷表設定此物種的生命階段。');
      const adjustments={...r.adjustments};
      for(const [i,[key,label]] of targets.entries()){
        if(bcs&&adjustments[key]?.notApplicable)continue;
        const raw=f.get('value-'+i);
        const value=Number(raw);
        if(!raw?.trim()||!Number.isFinite(value))throw Error('請填寫「'+label+'」的 MER 加成。');
        adjustments[key]={value,notApplicable:false,note:f.get('note-'+i).trim()};
      }
      const cells=[...r.cells];cells[0]=code;cells[1]=name;cells[definitionColumn]=f.get('definition').trim();
      const next={...r,cells,adjustments,status:f.get('status')};
      if(bcs)next.bcsScore={score:parseInt(code,10),scale:9};
      const before=old&&structuredClone(old);
      if(old)Object.assign(old,next);else dataset.records.push(next);
      persist(before,bcs?'維護 BCS 加成':old?'修改活動量':'新增活動量',activeSpecies().name+'／'+name,next);
    });
    document.querySelector('#km-dialog').classList.add('km-record-dialog');
  }
  function editRecord(id) {
    if(type===breedData.id){editBreed(id);return;}
    if(type===lifeType){const r=lifeData.records.find(r=>r.id===id);if(r)editLife(r.sizeId);return;}
    if(type===merType){editMer(id);return;}
    if(adjustmentType()&&(!id||selectedDataset().records.some(r=>r.id===id&&r.adjustments))){editActivity(id);return;}
    const d=selectedDataset(),cfg=ruleTypes[d.id],old=d.records.find(r=>r.id===id),r=old||{id:d.id+'-'+Date.now(),cells:d.headers.map(()=>''),children:[],rules:cfg?[]:undefined,status:'啟用'};
    const base=cfg?cfg.base:d.id===allergenType?[0,2,5]:d.headers.map((_,i)=>i);
    const rules=structuredClone(r.rules||[]),priority=hasProcessingPriority(d.id);
    const useMatrix=healthMatrixTypes.has(d.id)&&(!old||r.healthMatrixPreferred||r.healthMatrix?.length||Array.isArray(r.healthMatrix)&&!rules.length);
    const useRuleTable=cfg&&!useMatrix;
    const priorityField=priority?`<label>處理優先序<input type="number" min="1" step="1" name="processingPriority" value="${esc(r.processingPriority??nextProcessingPriority(d.records))}" required><small>前台同時選取多筆時，數字越小越先處理。</small></label>`:'';
    const long=base.filter(i=>longCols[d.id]?.includes(i)),numbers=base.filter(i=>i!==0&&numericCols[d.id]?.includes(i)),short=base.filter(i=>!long.includes(i)&&!numbers.includes(i));
    const renderFields=indices=>indices.map(i=>recordControl(d,i,r.cells[i],'c'+i)).join('');
    const baseFields=`<div class="km-form-group"><h4>識別與分類</h4><div class="km-record-grid">${recordControl(d,short[0],r.cells[short[0]],'c'+short[0])}${statusField(r.status)}${renderFields(short.slice(1))}${priorityField}</div></div>`+(long.length?`<div class="km-form-group"><h4>${d.id===allergenType?'交叉反應說明':'說明與適用條件'}</h4><div class="km-record-grid km-description-grid">${renderFields(long)}</div></div>`:'')+(numbers.length?`<div class="km-form-group"><h4>數值設定</h4><div class="km-record-grid km-number-grid">${renderFields(numbers)}</div></div>`:'');
    const children=!cfg&&r.children.length?`<section class="km-record-section"><h3>其他適用條件</h3><div id="km-variant-rows">${r.children.map((row,n)=>`<fieldset><legend>條件 ${n+1}</legend><div class="km-record-grid">${d.headers.map((_,i)=>i).filter(i=>d.id!=='BCS加成'||[3,4].includes(i)).map(i=>recordControl(d,i,row[i],'variant'+n+'-'+i)).join('')}</div></fieldset>`).join('')}</div></section>`:'';
    dialog(old?d.name+' · 檢視／編輯':'新增'+d.name,`<section class="km-record-section"><h3>基本資料</h3>${baseFields}</section>${children}${useMatrix?healthMatrixFields(d.id,r.healthMatrix||[]):''}${r.sourceNotes?.length?`<details class="km-source-notes"><summary>來源補充說明</summary>${r.sourceNotes.map(row=>`<p>${esc(row.filter(Boolean).join('；'))}</p>`).join('')}</details>`:''}${useRuleTable?`<section class="km-record-section"><div class="km-section-title"><div><h3>營養調整規則</h3><p>引用共用營養元素，每項規則分別設定調整方式與數值。</p></div>${button('新增調整規則','data-rule-add')}</div><div class="km-health-table"><table aria-label="營養調整規則"><colgroup><col style="width:34%"><col span="4"><col class="km-health-col-action"></colgroup><thead><tr>${['營養元素','適用生命階段','調整方式','調整值','優先鎖定','操作'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody id="km-rules">${rules.map(ruleTableRow).join('')}</tbody></table></div><p id="km-rule-empty" ${rules.length?'hidden':''}>目前沒有調整規則，可保留原標準或新增規則。</p></section>`:''}`,f=>{
      const read=(name,previous,i)=>{const value=f.get(name);if(value===null)return previous;const str=String(value).trim();if(str===String(previous??'').trim())return previous;if(numericCols[d.id]?.includes(i)){if(d.id==='ＭＥＲ係數'&&/^\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?$/.test(str))return str;if(str==='')return previous==null||previous===''?previous:'';if(previous!==''&&previous!=null&&Number(str)===Number(String(previous).replace(/＋/g,'+').replace(/−/g,'-')))return previous;const n=Number(str);if(!Number.isFinite(n)||(d.id==='飲水量清單'&&n<0))throw Error(d.headers[i]+' 格式不正確。');return n;}return str;};
      const cells=[...r.cells];base.forEach(i=>cells[i]=read('c'+i,r.cells[i],i));if(!String(cells[0]??'').trim())throw Error('請填寫'+d.headers[0]+'。');
      if(d.records.some(x=>x.id!==r.id&&String(x.cells[0])===String(cells[0])&&(d.id!=='BCS加成'||String(x.cells[3])===String(cells[3]))))throw Error('識別值已存在，請勿建立重複資料。');
      const next={...r,cells,status:f.get('status')};if(d.id==='BCS加成'){const score=Number(String(cells[0]).split('/')[0]);if(!Number.isInteger(score)||score<1||score>9)throw Error('BCS 分數必須為 1–9 分。');next.bcsScore={score,scale:9};}
      if(d.id===allergenType&&!String(cells[2]??'').trim())throw Error('請填寫原料名稱。');
      if(priority){
        const value=Number(f.get('processingPriority'));
        if(!Number.isSafeInteger(value)||value<1)throw Error('處理優先序須為大於或等於 1 的整數。');
        if(next.status==='啟用'&&d.records.some(x=>x.id!==r.id&&x.status==='啟用'&&x.processingPriority===value))throw Error('此處理優先序已由同一類別的其他啟用項目使用。');
        next.processingPriority=value;
      }
      if(d.id!=='犬生命階段判斷表'){for(const key of ['conditions','conditionJoin','reviewState','executionEligible','decisionBranches'])delete next[key];}

      if(useMatrix){
        next.healthMatrixPreferred=true;
        next.healthMatrix=[...document.querySelectorAll('#km-dialog [data-health-row]')].map(row=>{
          const values=[...row.querySelectorAll('[data-health-value]')].map(field=>field.value.trim());
          const locked=row.querySelector('[data-health-lock]').value==='yes';
          const kind=row.querySelector('[data-health-limit-kind]').value;
          const value=row.querySelector('[data-health-limit-value]').value;
          values.splice(healthLockIndex(d.id),0,locked?(kind?'v，'+kind+' '+value:'v'):'');
          return values;
        });
      }
      if(useRuleTable){next.rules=[...document.querySelectorAll('[data-rule-row]')].map((el,n)=>{
        const k=el.dataset.ruleIndex,oldRule=rules.find(x=>x.id===f.get('rule'+k+'-id')),elementId=f.get('rule'+k+'-element')||'',method=f.get('rule'+k+'-method'),raw=String(f.get('rule'+k+'-value')||'').trim(),o=f.get('rule'+k+'-override');
        if(!elementId&&!oldRule?.sourceName)throw Error('規則 '+(n+1)+' 請選擇營養元素。');
        const e=db.elements.find(e=>e.id===elementId);if(e?.status==='停用'&&oldRule?.elementId!==elementId)throw Error('不可新增引用停用元素。');
        let value=raw;if(method==='multiplier'){if(raw===''||!Number.isFinite(Number(raw))||Number(raw)<0)throw Error('規則 '+(n+1)+' 倍率需為非負數字。');value=Number(raw);}else if(!/^\d+(?:\.\d+)?(?:\s*[:：]\s*\d+(?:\.\d+)?)+$/.test(raw))throw Error('規則 '+(n+1)+' 請填寫比例，例如 1:1。');
        return {id:f.get('rule'+k+'-id'),elementId,sourceName:oldRule?.sourceName||e?.name||'',phase:f.get('rule'+k+'-phase'),method,value,overridable:o===''?null:o==='true'};
      });}else if(!cfg)next.children=r.children.map((row,n)=>row.map((v,i)=>read('variant'+n+'-'+i,v,i)));
      const before=old?structuredClone(old):null;if(old){for(const key of d.id==='犬生命階段判斷表'?['conditions','conditionJoin','decisionBranches']:['conditions','conditionJoin','reviewState','executionEligible','decisionBranches'])delete old[key];Object.assign(old,next);}else d.records.push(next);persist(before,old?'修改資料':'新增資料',d.name+' / '+cells[0],structuredClone(next));
    },healthMatrixTypes.has(d.id));
    document.querySelector('#km-dialog').classList.add('km-record-dialog');
    document.querySelectorAll('[data-condition-index]').forEach(card=>{updateConditionControls(card);card.addEventListener('change',e=>{if(e.target.name?.endsWith('-confirmed')){updateConditionControls(card);return;}const check=card.querySelector('input[type=checkbox]');if(check)check.checked=false;updateConditionControls(card);});});
    document.querySelectorAll('[data-rule-row]').forEach((el,i)=>el.dataset.ruleIndex=i);
    if(useRuleTable){let counter=rules.length;document.querySelector('[data-rule-add]').onclick=()=>{const i=counter++;document.querySelector('#km-rules').insertAdjacentHTML('beforeend',ruleTableRow({id:r.id+'-rule-'+Date.now()+'-'+i,elementId:'',sourceName:'',phase:'',method:'multiplier',value:'',overridable:null},i));document.querySelector('#km-rules').lastElementChild.dataset.ruleIndex=i;document.querySelector('#km-rule-empty').hidden=true;dirty=true;document.querySelector('#km-rules').lastElementChild.scrollIntoView({block:'nearest'});};}
  }
  const age = (value,unit='month') => ({value,unit});
  const ageRange = (from,to,endMode='before') => ({from,to,endMode});
  const lifePhaseKeys = split => [...(split?['early','late']:['juvenile']),'adult','senior'];
  function lifeLabels(id=speciesId){
    return {juvenile:id==='dog'?'幼犬期':id==='cat'?'幼貓期':'幼年期',early:'生長前期',late:'生長後期',adult:'成年期',senior:'高齡期'};
  }
  function sampleLife(growthLast,seniorYear,split=false,adultUnclear=false){
    return {
      split,
      phases:{
        ...(split?{
          early:ageRange(age(0),age(4),'through'),
          late:ageRange(age(5),age(growthLast),'through')
        }:{juvenile:ageRange(age(0),age(growthLast),'through')}),
        adult:ageRange(age(adultUnclear?'':growthLast+1),age(seniorYear,'year')),
        senior:ageRange(age(seniorYear,'year'),null,'open')
      },
      ...(adultUnclear?{note:`來源填寫「0–${growthLast} 月齡」及「${growthLast} 月齡後」，請確認成年期起點。`}:{})
    };
  }
  function initializeLifeData(){
    const dogSamples={
      'size-xs':sampleLife(9,9),
      'size-s':sampleLife(10,8),
      'size-m':sampleLife(12,7),
      'size-l':sampleLife(15,6,true),
      'size-xl':sampleLife(18,5,true)
    };
    const dogSeed=knowledgeSeed.datasets.find(d=>d.id===lifeType).records;
    for(const r of lifeData.records){
      if(r.ageProfile)continue;
      const original=dogSeed.find(s=>s.id===r.id);
      const fromSample=!r.lifeProfile&&original?.cells.slice(1).every((v,i)=>v===r.cells[i+1])&&dogSamples[r.sizeId];
      if(fromSample){
        r.ageProfile=fromSample;
        r.reviewState='confirmed';
      }else{
        const previous=r.lifeProfile;
        r.ageProfile=previous?{split:false,phases:Object.fromEntries([
          ['juvenile','growth'],['adult','adult'],['senior','senior']
        ].map(([phase,key])=>{
          const lo=previous[key+'MinMonths']??'',hi=previous[key+'MaxMonths']??'';
          return [phase,ageRange(age(lo),hi===''?null:age(hi),hi===''?'open':'before')];
        })),note:'保留先前在本機維護的區間。'}:{split:false,phases:{},note:'舊版來源：'+r.cells.slice(2).filter(Boolean).join('／')};
        r.reviewState=lifeRangeProblem(r.ageProfile)?'pending':'confirmed';
      }
    }
    if(!lifeData.records.some(r=>r.speciesId==='cat')){
      const examples=[['xs',9,10],['s',10,10],['m',12,9,true],['l',15,8,true],['xl',18,7,true]];
      for(const [code,last,senior,unclear] of examples){
        const sizeId='size-cat-'+code,size=sizesFor('cat').find(s=>s.id===sizeId);
        lifeData.records.push({id:'life-cat-'+code,speciesId:'cat',sizeId,cells:[size.size,'','','',''],children:[],status:'啟用',
          ageProfile:sampleLife(last,senior,false,unclear),reviewState:unclear?'pending':'confirmed'});
      }
    }
  }

  function ageMonths(bound){
    return bound?.value===''||bound?.value==null?null:bound.value*(bound.unit==='year'?12:1);
  }
  function ageEdges(range){
    const upper=ageMonths(range?.to);
    return [ageMonths(range?.from),range?.endMode==='open'?Infinity:upper===null?null:upper+(range.endMode==='through'?1:0)];
  }
  function lifeRangeProblem(profile,labels={}){
    let previous=0;
    const keys=lifePhaseKeys(profile.split);
    for(const [i,key] of keys.entries()){
      const [start,end]=ageEdges(profile.phases[key]);
      const label=labels[key]||'生命階段';
      if(start===null||end===null)return label+'請填寫完整年齡區間。';
      if(!Number.isSafeInteger(start)||end!==Infinity&&!Number.isSafeInteger(end)||start<0||end<=start)return label+'的年齡區間不正確。';
      if(i===0&&start!==0)return label+'須從 0 個月開始。';
      if(start!==previous)return (labels[keys[i-1]]||'上一階段')+'與'+label+(start<previous?'的區間重疊。':'的區間有空檔。');
      if(i===keys.length-1&&end!==Infinity)return '高齡期請選擇「無上限」。';
      if(i<keys.length-1&&end===Infinity)return label+'請填寫結束年齡。';
      previous=end;
    }
    return '';
  }
  function ageRangeText(range){
    const [lo,hi]=ageEdges(range);
    if(lo===null||hi===null)return '待補齊';
    const ageText=b=>b.value+(b.unit==='year'?' 歲':' 個月');
    if(range.endMode==='through'&&range.from.unit==='month')return range.from.value+'–'+range.to.value+' 月齡';
    const upper=range.endMode==='through'?age(hi):range.to;
    return '滿 '+ageText(range.from)+(hi===Infinity?'起':'至未滿 '+ageText(upper));
  }
  function lifeContent(){
    const labels=lifeLabels();
    const rows=sizesFor().map(s=>({s,r:lifeData.records.find(r=>r.sizeId===s.id)})).filter(({s,r})=>matches({size:s.size,...r,status:r?.status||'待設定'}));
    return `<div class="km-section-actions"><div><h3>${esc(activeSpecies().name)} · 生命階段判斷表</h3><span>先在「物種、品種與體型」建立體型，再逐一設定年齡區間。</span></div></div>`+
      rowsTable(['體型','幼年期／生長前期','生長後期','成年期','高齡期','狀態','操作'],rows.map(({s,r})=>{
        const p=r?.ageProfile;
        const cell=key=>esc(ageRangeText(p?.phases[key]));
        const juvenile=p?.split?`<td>${cell('early')}</td><td>${cell('late')}</td>`:`<td colspan="2"><strong>${labels.juvenile}</strong><br>${cell('juvenile')}</td>`;
        const summary=r?(r.reviewState==='confirmed'?'區間完整':'待確認'):'待設定';
        return `<tr><td>${esc(s.size)}</td>${juvenile}<td>${cell('adult')}</td><td>${cell('senior')}</td><td>${r?badge(r.status)+' ':''}${summary}</td><td>${button(r?'檢視／編輯':'設定區間',`data-km-life-size="${esc(s.id)}"`)}</td></tr>`;
      }));
  }
  function editLife(sizeId){
    const size=sizesFor().find(s=>s.id===sizeId);
    if(!size)return;
    const old=lifeData.records.find(r=>r.sizeId===sizeId),labels=lifeLabels();
    const r=old||{id:newId('life'),speciesId,sizeId,cells:[size.size,'','','',''],children:[],status:'啟用'};
    const profile=r.ageProfile||{split:false,phases:{}};
    const number=(key,bound)=>`<input type="number" name="${key}" min="0" step="1" value="${esc(bound?.value)}">`;
    const units=(key,bound)=>`<select name="${key}">${options([['month','月'],['year','年']],bound?.unit||'month')}</select>`;
    const fields=Object.entries(labels).map(([key,label])=>{
      const p=profile.phases[key],prefix='age-'+key+'-';
      return `<fieldset class="km-record-section km-age-stage" data-age-stage="${key}"><legend>${label}</legend><div class="km-record-grid">
        <label>起始年齡（含）${number(prefix+'from',p?.from||((key==='juvenile'||key==='early')?age(0):null))}</label><label>起始單位${units(prefix+'from-unit',p?.from)}</label>
        <label>結束方式<select name="${prefix}end">${options([['through','到指定月齡（含整個月）'],['before','未滿指定年齡'],['open','無上限']],p?.endMode||(key==='senior'?'open':key==='adult'?'before':'through'))}</select></label>
        <label>結束年齡${number(prefix+'to',p?.to)}</label><label>結束單位${units(prefix+'to-unit',p?.to)}</label>
        </div><p class="nutrition-footnote" data-age-preview></p></fieldset>`;
    }).join('');
    dialog('生命階段區間 · '+size.size,`<p>${esc(activeSpecies().name)} · ${esc(size.size)}</p><div class="km-record-grid">
      <label>幼年期分段方式<select name="life-split">${options([['single','幼年期不分前後期'],['split','幼年期分前後期']],profile.split?'split':'single')}</select></label>${statusField(r.status)}</div>
      <p class="nutrition-footnote">例如 5–15 月齡可填「滿 5 個月」到「15 月齡（含整個月）」。跨單位時可填「滿 16 個月」到「未滿 6 歲」。</p>
      ${profile.note?`<p class="nutrition-message">${esc(profile.note)}</p>`:''}${fields}`,f=>{
      const nextProfile=read(f),problem=lifeRangeProblem(nextProfile,labels);
      if(problem)throw Error(problem);
      const next={...r,ageProfile:nextProfile,reviewState:'confirmed',executionEligible:f.get('status')==='啟用',status:f.get('status')};
      const before=old&&structuredClone(old);
      if(old)Object.assign(old,next);else lifeData.records.push(next);
      persist(before,old?'修改生命階段':'設定生命階段',activeSpecies().name+'／'+size.size,next);
    });
    const form=document.querySelector('#km-dialog form');
    form.closest('dialog').classList.add('km-record-dialog');
    function read(f){
      const split=f.get('life-split')==='split';
      const bound=(key,part,unit)=>age(f.get('age-'+key+'-'+part)===''||f.get('age-'+key+'-'+part)===null?'':Number(f.get('age-'+key+'-'+part)),unit);
      const phases=Object.fromEntries(lifePhaseKeys(split).map(key=>{
        const end=f.get('age-'+key+'-end');
        return [key,ageRange(bound(key,'from',f.get('age-'+key+'-from-unit')),end==='open'?null:bound(key,'to',end==='through'?'month':f.get('age-'+key+'-to-unit')),end)];
      }));
      return {split,phases};
    }
    function update(){
      const keys=lifePhaseKeys(form.elements['life-split'].value==='split');
      for(const field of form.querySelectorAll('[data-age-stage]')){
        const key=field.dataset.ageStage,end=form.elements['age-'+key+'-end'].value;
        field.hidden=field.disabled=!keys.includes(key);
        const upper=form.elements['age-'+key+'-to'],unit=form.elements['age-'+key+'-to-unit'];
        upper.disabled=upper.parentElement.hidden=end==='open';
        unit.disabled=end!=='before';
        unit.parentElement.hidden=end==='open';
        if(end==='through')unit.value='month';
      }
      const {phases}=read(new FormData(form));
      for(const key of keys){
        const range=phases[key],[from,to]=ageEdges(range);
        form.querySelector(`[data-age-stage="${key}"] [data-age-preview]`).textContent=
          from===null||to===null?'判定預覽 · 待補齊':'判定預覽 · 滿 '+from+' 個月'+(to===Infinity?'起':'、未滿 '+to+' 個月');
      }
    }
    form.addEventListener('input',update);
    form.addEventListener('change',update);
    update();
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
  const blankTemplateScope = () => ({speciesId:'',sizeIds:[],stages:[],extraCondition:''});
  function initializeTemplateScopes(){
    const scope=(id,sizeIds,stages,extraCondition='')=>({speciesId:id,sizeIds,stages,extraCondition});
    const sizes=['size-xs','size-s','size-m','size-l','size-xl'];
    const dogScopes=[
      ...sizes.map(size=>scope('dog',[size],['adult'])),
      scope('dog',[],['senior']),
      scope('dog',sizes.slice(0,3),['juvenile']),
      scope('dog',sizes.slice(3),['early']),
      scope('dog',sizes.slice(3),['late'])
    ];
    const catScopes=[
      ['幼貓',scope('cat',[],['juvenile'])],
      ['成貓',scope('cat',[],['adult'])],
      ['高齡貓',scope('cat',[],['senior'])],
      ['過重貓',scope('cat',[],['adult','senior'],'BCS=7、8、9')]
    ];
    catScopes.forEach(([name,applicability],i)=>{
      const id='T-cat-'+(i+1);
      const existing=db.templates.find(t=>t.id===id||t.name===name);
      if(existing){existing.applicability||=applicability;return;}
      db.templates.push({id,name,status:'啟用',meta:{適用對象:'',常見犬種:'',備註:'',計量基準:'Units per 1000 kcal ME'},items:[],applicability});
    });
    for(const t of db.templates){
      const old=t.applicability;
      if(Array.isArray(old?.stages))continue;
      const defaults=dogScopes[Number(t.id.slice(1))-1];
      if(old?.lifeRuleId||old?.stage){
        const sizeId=lifeData.records.find(r=>r.id===old.lifeRuleId)?.sizeId;
        const stage=old.stage==='puppy'?'juvenile':old.stage;
        t.applicability=scope('dog',sizeId?[sizeId]:old.lifeRuleId==='all'?[]:defaults?.sizeIds||[],stage?[stage]:defaults?.stages||[]);
      }else t.applicability=defaults||blankTemplateScope();
    }
  }
  function createTemplate() {
    const t={id:newId('template'),name:'',meta:{適用對象:'',常見犬種:'',備註:'',計量基準:'Units per 1000 kcal ME'},items:[],status:'啟用',applicability:blankTemplateScope()};
    const meta=Object.entries(t.meta).map(([key,value],i)=>{
      const multiline=['常見犬種','備註'].includes(key);
      return `<label>${esc(key)}${multiline?`<textarea name="m${i}" rows="2">${esc(value)}</textarea>`:`<input name="m${i}" value="${esc(value)}">`}</label>`;
    }).join('');
    dialog('新增營養標準模板',`<div class="km-record-grid"><label>模板名稱<input name="name" required></label>${statusField(t.status)}</div>${templateScopeFields(t,true)}<details class="km-create-template-meta"><summary>其他模板資料</summary><div class="km-record-grid">${meta}</div></details>`,f=>{
      const next=structuredClone(t);
      next.name=f.get('name').trim();
      if(!next.name)throw Error('請填寫模板名稱。');
      if(db.templates.some(x=>x.name===next.name))throw Error('模板名稱已存在。');
      validateTemplateScope(next.applicability,true);
      Object.keys(next.meta).forEach((key,i)=>next.meta[key]=f.get('m'+i));
      next.status=f.get('status');
      db.templates.push(next);
      templateId=next.id;
      query='';status='全部';
      persist(null,'新增模板',next.name,next);
      templateDraft=structuredClone(next);
    });
    const form=document.querySelector('#km-dialog form');
    form.closest('dialog').classList.add('km-create-template');
    form.addEventListener('input',e=>{
      if(e.target.hasAttribute('data-km-scope-extra'))t.applicability.extraCondition=e.target.value;
    });
    form.addEventListener('change',e=>updateTemplateScope(e.target,t.applicability));
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
  const scopeName = () => names[type]+(type==='templates'?' / '+selectedTemplate().name:speciesType()?' / '+activeSpecies().name:'');
  function exportCurrent() {
    const data=type==='templates'?structuredClone(selectedTemplate()):type==='elements'?structuredClone(db.elements):type===breedData.id?structuredClone({species:activeSpecies(),weightStandards:sizesFor(),records:breedsFor()}):structuredClone(speciesType()?selectedDataset().records.filter(r=>(r.speciesId||'dog')===speciesId):selectedDataset().records);
    const payload={format:'tp-rag-maintenance-v1',type,scope:scopeName(),data};
    if(adjustmentType())payload.targetModes=Object.fromEntries(activityStages(speciesId).map(([stage])=>[stage,activityMode(speciesId,stage)]));
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=scopeName().replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice='已匯出「'+scopeName()+'」完整資料（包含停用項目，不受搜尋條件限制）。';redraw();
  }
  function downloadImportTemplate(){
    const speciesHeaders=type===lifeType?['物種代碼','體型代碼','幼年期分段方式','生命階段','起始年齡','起始單位','結束方式','結束年齡','結束單位','狀態']:type===breedData.id?['物種代碼','資料項目（體型／品種）','名稱','體重下限（kg）','是否包含下限','體重上限（kg）','是否包含上限','尺寸','判定方式','預設體型代碼','公性例外體型代碼','暫用體型代碼','備註','狀態']:null;
    const headers=type==='犬生命階段判斷表'?['體型','體重下限（kg）','體重上限（kg）','幼犬月齡下限','幼犬月齡上限','成年月齡下限','成年月齡上限','高齡月齡下限','高齡月齡上限','狀態']:type==='ＭＥＲ係數'?['編號','生命階段','月齡區間','結紮狀態','生理狀態','懷孕週數','哺乳幼犬數','MER係數下限','MER係數上限','狀態']:type==='templates'?['模板名稱','適用對象','常見犬種','備註','計量基準','元素代碼','標準值','狀態']:type==='elements'?['元素代碼','中文名稱','英文名稱','單位','別名','狀態']:ruleTypes[type]?[...ruleTypes[type].base.map(i=>selectedDataset().headers[i]),'營養元素代碼','適用生命階段','調整方式','調整值','優先鎖定','狀態']:[...selectedDataset().headers,'狀態'];
    const columns=type===allergenType?[0,2,5].map(i=>selectedDataset().headers[i]).concat('狀態'):speciesHeaders||headers;
    if(hasProcessingPriority(type))columns.splice(columns.length-1,0,'處理優先序');
    const content='\uFEFF'+columns.map(h=>'"'+h.replaceAll('"','""')+'"').join(',')+'\r\n',url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=names[type]+'_匯入範本.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice='已下載 '+names[type]+' 固定欄位範本（CSV，可用 Excel 開啟）。';redraw();
  }
  function importDemoPreview() {
    const scope=scopeName(),failed=document.querySelector('#km-demo-outcome').value==='error';
    const message='<p><strong>覆蓋範圍：'+esc(scope)+'</strong></p><p>僅取代此範圍，不影響其他資料類型或模板；檔案未列到的舊資料也將移除。修改前後紀錄與歷史推薦仍保留。</p>';
    if(failed){
      dialog('驗證失敗：整批未覆蓋',message+'<div class="nutrition-message" role="alert">檔案或資料有錯誤，整批不覆蓋，原資料保持不變。請修正後重新匯入。</div>'+rowsTable(['位置','問題','修正方式'],['<tr><td>標題列（示範）</td><td>缺少必要欄位</td><td>依範本補齊欄位</td></tr>','<tr><td>資料第 2 列（示範）</td><td>數值格式錯誤</td><td>修正為指定數值格式</td></tr>'])+'<p>未讀取真實檔案，以上問題為示範。</p>',()=>{});
      document.querySelector('#km-dialog button[type=submit]').textContent='返回修正';return;
    }
    dialog('確認完整覆蓋',message+'<p>整份驗證通過（示範）。任何欄位或資料驗證失敗，都不得寫入部分資料。</p><label><input type="checkbox" name="replaceConfirmed" required>我確認以檔案完整取代以上範圍，包含移除檔案未列出的舊資料</label><p class="nutrition-footnote">確認後僅展示操作結果，不寫入真實或本機示範資料。</p>',form=>{if(form.get('replaceConfirmed')!=='on')throw Error('請先確認完整覆蓋範圍。');notice='完整覆蓋流程示範完成；未讀取檔案、未寫入資料。';});
    document.querySelector('#km-dialog button[type=submit]').textContent='確認完整覆蓋（示範）';
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
  initializeSpeciesData();
  initializeLifeData();
  initializeMerData();
  initializeTemplateScopes();
  initializeActivityData();
  initializeBcsData();
  initializeHealthMaintenance();
  initializeHealthMatrices();
  for(const dataset of db.datasets.filter(d=>hasProcessingPriority(d.id))){
    for(const record of dataset.records){
      if(!Number.isSafeInteger(record.processingPriority)||record.processingPriority<1){
        record.processingPriority=nextProcessingPriority(dataset.records);
      }
    }
  }
  ensureNutritionRules();
  document.addEventListener('submit',e=>{
    if(e.target.id!=='km-log-filters')return;
    e.preventDefault();const f=new FormData(e.target),next=Object.fromEntries(['actor','field','from','to'].map(k=>[k,String(f.get(k)||'').trim()]));
    const error=document.querySelector('#km-log-filter-error');
    if((next.from&&!Number.isFinite(logBoundary(next.from)))||(next.to&&!Number.isFinite(logBoundary(next.to)))){error.textContent='請輸入有效的異動時間。';return;}
    if(next.from&&next.to&&logBoundary(next.from)>logBoundary(next.to)){error.textContent='異動開始時間不可晚於結束時間。';return;}
    logFilters=next;redraw();
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-km-log-reset')){logFilters={actor:'',field:'',from:'',to:''};redraw();return;}
    if(b.hasAttribute('data-health-add')){
      const body=b.closest('section').querySelector('.km-health-table tbody');
      body.insertAdjacentHTML('beforeend',healthMatrixRow(type));
      body.lastElementChild.querySelector('select').focus();
      dirty=true;return;
    }
    if(b.hasAttribute('data-health-remove')){b.closest('[data-health-row]').remove();dirty=true;return;}
    if(b.hasAttribute('data-rule-remove')){b.closest('[data-rule-row]').remove();const empty=document.querySelector('#km-rule-empty');if(empty)empty.hidden=!!document.querySelector('[data-rule-row]');dirty=true;return;}
    if(b.hasAttribute('data-km-close')){closeDialog();return;}
    if(b.dataset.kmNav){tab=b.dataset.kmNav;setView('rag');redraw();return;}
    if(b.dataset.kmTab){tab=b.dataset.kmTab;redraw();return;}
    if(b.hasAttribute('data-km-search')){query=document.querySelector('#km-query').value;status=document.querySelector('#km-status')?.value||'全部';redraw();}
    if(b.hasAttribute('data-km-new')){if(type==='elements')editElement();else if(type==='templates')createTemplate();else editRecord();}
    if(b.hasAttribute('data-km-activity-targets'))editActivityTargets();
    if(b.dataset.kmElement)editElement(b.dataset.kmElement);
    if(b.dataset.kmRecord)editRecord(b.dataset.kmRecord);
    if(b.dataset.kmSpeciesPanel){speciesPanel=b.dataset.kmSpeciesPanel;query='';status='全部';redraw();}
    if(b.hasAttribute('data-km-species-manage'))manageSpecies();
    if(b.hasAttribute('data-km-species-new'))editSpecies();
    if(b.dataset.kmSpeciesEdit)editSpecies(b.dataset.kmSpeciesEdit);
    if(b.hasAttribute('data-km-size-new'))editSize();
    if(b.dataset.kmSize)editSize(b.dataset.kmSize);
    if(b.dataset.kmLifeSize)editLife(b.dataset.kmLifeSize);
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
    if(b.hasAttribute('data-km-import-result')){const r=db.imports[Number(b.dataset.kmImportResult)];if(!Object.hasOwn(names,r?.type))return;type=r.type;if(r.templateId)templateId=r.templateId;query='';status='全部';tab='data';redraw();}
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-health-lock],[data-health-limit-kind]')){
      const controls=e.target.closest('.km-health-lock');
      const locked=controls.querySelector('[data-health-lock]').value==='yes';
      const kind=controls.querySelector('[data-health-limit-kind]');
      const value=controls.querySelector('[data-health-limit-value]');
      controls.querySelector('[data-health-limit]').hidden=!locked;
      kind.disabled=!locked;
      value.required=locked&&Boolean(kind.value);
      value.disabled=!value.required;
    }
    if(e.target.id==='km-import-mode'){importMode=e.target.value;redraw();}
    if(e.target.id==='km-import-type'){type=e.target.value;redraw();}
    if(e.target.id==='km-import-template'){templateId=e.target.value;redraw();}
    if(e.target.id==='km-type'){type=e.target.value;query='';status='全部';redraw();}
    if(e.target.id==='km-species'){speciesId=e.target.value;query='';status='全部';redraw();document.querySelector('#km-species').focus();}
    if(e.target.id==='km-template'){templateId=e.target.value;redraw();}
    if(e.target.id==='km-status'){status=e.target.value;redraw();}
  });
  document.addEventListener('keydown',e=>{if(e.target.id==='km-query'&&e.key==='Enter'){e.preventDefault();document.querySelector('[data-km-search]').click();}});
})();
