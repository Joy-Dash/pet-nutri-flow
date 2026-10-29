/* Shared record dialogs. Demo edits are stored only in this browser. */
(() => {
  const esc = escapeHtml;
  const storageKey = 'tp-rag-records-v1';
  const status = ['啟用', '停用'];
  // key, label, input type or choices; a trailing true marks derived/identity data.
  const schemas = {
    members: { title: '會員', data: members, id: 'id', fields: [['id','會員 ID','text',true],['account','帳號'],['name','姓名'],['email','Email','email'],['phone','連絡電話'],['pets','寵物數','number',true],['lastCase','最近案例','text',true],['status','狀態',status]] },
    pets: { title: '寵物', data: petProfiles, id: 'id', fields: [['id','寵物 ID','text',true],['memberId','會員 ID','text',true],['owner','會員姓名','text',true],['pet','寵物名'],['species','物種',['dog','cat']],['breed','品種'],['age','年齡'],['weight','體重'],['neutered','結紮',['已結紮','未結紮']],['bcs','BCS'],['tags','標籤（以逗號分隔）'],['lastSurvey','最近問卷','text',true],['lastCase','最近案例','text',true]] },
    admins: { title: '後台帳號', data: admins, id: 'account', fields: [['name','姓名'],['email','Email','email'],['account','帳號','text',true],['role','角色',()=>roles.map(r=>r.name)],['scope','權限摘要','text',true],['status','狀態',status]] },
    roles: { title: '角色權限', data: roles, id: 'id', fields: [['id','角色代碼','text',true],['name','角色名稱'],['description','說明'],['scope','權限範圍說明'],['accounts','套用帳號數','number',true],['status','狀態',status]] },
    fields: { title: '問卷欄位', data: questionFields, id: 'key', fields: [['name','欄位名稱'],['key','API Key（欄位代碼）','text'],['purpose','欄位用途'],['type','回答格式',['text','number','single_select','multi_select','slider','select']],['required','是否必填','checkbox'],['order','排序','number'],['status','狀態',['啟用','草稿','停用']],['api','Payload path']] },
    versions: { title: '問卷版本', data: questionnaires, id: 'version', fields: [['name','問卷名稱'],['version','版本代碼','text',true],['usage','用途'],['status','狀態',['草稿','已發布','停用']]] },
    rules: { title: '營養規則', data: nutritionRules, id: 'code', fields: [['code','規則代碼','text',true],['name','名稱'],['group','分類'],['condition','條件'],['action','動作'],['impact','影響'],['priority','優先序','number'],['status','狀態',['啟用','草稿','停用']]] },
    docs: { title: '檔案資料', data: ragDocs, id: 'file', fields: [['file','檔案名稱','text',true],['category','分類'],['version','版本'],['pipeline','處理方式','text',true],['index','索引狀態','text',true]] },
  };
  // Restore demo record data, never recommendation history snapshots.
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const [entity,schema] of Object.entries(schemas)) {
      for (const item of saved[entity] || []) {
        let target = schema.data.find(r=>r[schema.id]===item[schema.id]);
        if (!target && item._created) {
          target = {...item}; schema.data.push(target);
        }
        if (target) Object.assign(target,item);
      }
    }
    if (saved.permissions) for (const [id,permissions] of Object.entries(saved.permissions)) if(roles.some(r=>r.id===id)&&Array.isArray(permissions)) rolePermissionProfiles[id] = permissions;
    if (saved.options) for (const [key,options] of Object.entries(saved.options)) {
      const group=optionGroups.find(g=>g.key===key);
      if(group){group.options=options;group.count=options.length;}
      else if(questionFields.some(f=>f.key===key)) optionGroups.push({key,field:questionFields.find(f=>f.key===key).name,species:'犬貓共用',options,count:options.length});
    }
  } catch { /* Storage may be unavailable; editing remains available for this session. */ }

  let active = null;
  function persist() {
    try {
      const data = Object.fromEntries(Object.entries(schemas).map(([k,s])=>[k,s.data]));
      data.permissions = rolePermissionProfiles;
      data.options = Object.fromEntries(optionGroups.map(g=>[g.key,g.options]));
      localStorage.setItem(storageKey,JSON.stringify(data));
      return '已儲存至此瀏覽器（Demo）';
    } catch { return '變更已套用；瀏覽器無法儲存，重新整理後將還原。'; }
  }
  function notify(message) {
    document.querySelector('#record-status')?.remove();
    const el=document.createElement('p'); el.id='record-status';el.className='record-status';el.setAttribute('role','status');el.textContent=message;
    document.querySelector('#view-content').prepend(el);
  }
  function redraw() {
    const id=document.querySelector('#nav .active')?.dataset.view;
    if (renderers[id]) document.querySelector('#view-content').innerHTML=renderers[id]();
  }
  function open(title, body, save) {
    if (active) return;
    const trigger=document.activeElement;
    const d=document.createElement('dialog');d.className='record-dialog';d.setAttribute('aria-labelledby','record-title');
    d.innerHTML=`<form><header class="record-head"><div><h2 id="record-title">${esc(title)}</h2><p>${save?'Demo：變更僅保存在此瀏覽器。':'唯讀資料'}</p></div><button type="button" class="secondary-button" data-record-close aria-label="關閉彈跳視窗">關閉</button></header><div class="record-body">${body}</div><footer class="record-footer"><span class="record-error" role="alert"></span><button type="button" class="secondary-button" data-record-close>${save?'取消':'關閉'}</button>${save?'<button type="submit" class="primary-button">儲存</button>':''}</footer></form>`;
    document.body.append(d);active=d;
    const form=d.querySelector('form');
    const signature=()=>JSON.stringify([...form.querySelectorAll('input,select,textarea')].map(e=>[e.name,e.type==='checkbox'?e.checked:e.value]));
    let initial=signature();
    d.addEventListener('record-baseline',()=>{initial=signature();},{once:true});
    function close() {
      if (save && initial!==signature()) {
        if(d.querySelector('.record-discard'))return;
        const guard=document.createElement('div');guard.className='record-discard';guard.setAttribute('role','alert');
        guard.innerHTML='<p>有尚未儲存的修改，是否放棄？</p><button type="button" class="secondary-button" data-keep>繼續編輯</button><button type="button" class="danger secondary-button" data-discard>放棄修改</button>';
        d.querySelector('.record-footer').before(guard);guard.querySelector('[data-keep]').focus();
        guard.querySelector('[data-keep]').onclick=()=>{guard.remove();form.querySelector('input,select,textarea')?.focus();};
        guard.querySelector('[data-discard]').onclick=()=>d.close();
      } else d.close();
    }
    d.addEventListener('click',e=>{if(e.target.closest('[data-record-close]'))close();if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
    d.addEventListener('cancel',e=>{e.preventDefault();close();});
    d.addEventListener('close',()=>{active=null;d.remove();if(trigger?.isConnected)trigger.focus();});
    form.addEventListener('submit',e=>{e.preventDefault();if(!save||!form.reportValidity())return;try {save(form);const message=persist();redraw();d.close();notify(message);}catch(error){d.querySelector('.record-error').textContent=error.message;}});
    d.showModal();
    return d;
  }
  window.recordDialogs={open};

  function control(key,label,type,value,readonly=false) {
    if(typeof type==='function')type=type();
    const name=esc(key), v=esc(Array.isArray(value)?value.join(', '):value??'');
    const required=!readonly&&['name','email','account','key','version','pet'].includes(key)?'required':'';
    if(Array.isArray(type))return `<label>${esc(label)}<select name="${name}" ${readonly?'disabled':''}>${selectOptions(type,value)}</select></label>`;
    if(type==='checkbox')return `<label class="record-check"><input name="${name}" type="checkbox" ${value?'checked':''} ${readonly?'disabled':''}>${esc(label)}</label>`;
    return `<label>${esc(label)}<input name="${name}" type="${type||'text'}" value="${v}" ${readonly?'readonly':''} ${required} ${type==='number'?'min="0" step="1"':''}></label>`;
  }
  function edit(entity,key) {
    const s=schemas[entity];if(!s)return;
    const isNew=key==='new';
    const makeId=prefix=>prefix+'-'+crypto.randomUUID().slice(0,8);
    const defaults={
      members:{id:makeId('M'),account:'',name:'',email:'',phone:'',pets:0,lastCase:'—',status:'啟用'},
      pets:{id:makeId('P'),memberId:members[0]?.id||'',owner:members[0]?.name||'',pet:'',species:'dog',breed:'',age:'',weight:'',neutered:'未結紮',bcs:'',tags:[],lastSurvey:'—',lastCase:'—'},
      admins:{name:'',email:'',account:'',role:roles[0]?.name||'',scope:roles[0]?.scope||'',status:'啟用'},
      roles:{id:makeId('role'),name:'',description:'',scope:'',accounts:0,status:'啟用'},
      fields:{name:'',key:'',purpose:'',type:'text',required:false,order:questionFields.length+1,status:'草稿',options:0,api:''},
      versions:{name:'',version:'',usage:'',fields:0,required:0,status:'草稿',updated:'尚未儲存'},
      rules:{code:makeId('rule'),name:'',group:'',condition:'',action:'',impact:'',priority:1,status:'草稿'}
    };
    const item=isNew?{...defaults[entity],_created:true}:s.data.find(r=>String(r[s.id])===key);
    if(!item)return;
    if(entity==='pets'&&isNew&&!members.length){notify('請先新增會員，再建立寵物資料。');return;}
    const permissionsForItem=rolePermissionProfiles[item.id]||modules.map(m=>({module:m.label,view:false,write:false,del:false}));
    let body=`<div class="form-grid">${s.fields.map(([k,l,t,ro])=>entity==='pets'&&k==='memberId'&&isNew?`<label>所屬會員<select name="memberId" required>${members.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}（${esc(m.id)}）</option>`).join('')}</select></label>`:control(k,l,t,item[k],ro&&!(isNew&&k===s.id))).join('')}</div>`;
    if(entity==='members') {
      const pets=petProfiles.filter(p=>p.memberId===item.id);
      const cases=recommendationCases.filter(c=>c.memberId===item.id);
      body+=section('寵物清單','所屬寵物資料；可於「寵物資料」頁籤修改。',table(['寵物 ID','寵物名','物種','品種','年齡','體重','BCS','標籤'],pets.map(p=>`<tr>${[p.id,p.pet,p.species,p.breed,p.age,p.weight,p.bcs,p.tags.join('、')].map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`),720));
      body+=section('最近推薦案例','當次紀錄與結果可於「使用者推薦歷史紀錄」檢視。',table(['案例 ID','提交時間','問卷','狀態'],cases.map(c=>`<tr>${[c.id,c.submitted,c.survey,c.status].map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`),600));
    }
    if(entity==='roles')body+=section('模組權限','調整進入、寫入與刪除權限；儲存後套用。',table(['模組','進入頁面','新增／編輯','刪除'],permissionsForItem.map((p,i)=>`<tr><td>${esc(p.module)}</td>${['view','write','del'].map(k=>`<td><input type="checkbox" name="permission-${i}-${k}" aria-label="${esc(p.module)} ${k}" ${p[k]?'checked':''}></td>`).join('')}</tr>`),640));
    const group=entity==='fields'?optionGroups.find(g=>g.key===key):null;
    const choiceTypes=['single_select','multi_select','select'];
    let optionDraft=(group?.options||[]).map(([label,value])=>({label,value}));
    if(entity==='fields') {
      const fieldKey=item.key||'field_'+crypto.randomUUID().slice(0,8);
      const formatNames={text:'文字輸入',number:'數字輸入',single_select:'單選',multi_select:'多選',select:'下拉選單',slider:'滑桿'};
      body=`<div class="field-editor"><section class="field-editor-section"><h3>題目設定</h3><p>先填寫使用者會看到的題目，再選擇回答方式。</p><div class="form-grid field-editor-grid">${control('name','欄位名稱',null,item.name)}<label>回答格式<select name="type">${Object.entries(formatNames).map(([v,l])=>`<option value="${v}" ${item.type===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="field-editor-wide">欄位用途<input name="purpose" value="${esc(item.purpose||'')}" placeholder="例如：了解寵物物種，選用對應的營養標準"></label></div></section>
      <section class="field-editor-section" data-option-section ${choiceTypes.includes(item.type)?'':'hidden'}><div class="field-editor-heading"><div><h3>選項設定</h3><p>每列填一個選項，使用上下按鈕調整顯示順序。</p></div><button type="button" class="secondary-button" data-option-add>＋ 新增選項</button></div><div data-option-list></div><p class="field-option-status" role="status" aria-live="polite"></p></section>
      <section class="field-editor-section"><h3>顯示設定</h3><div class="field-settings"><div class="field-setting-cell"><span class="field-setting-label">作答要求</span><label class="field-required-control"><input type="checkbox" name="required" ${item.required?'checked':''}><span>設為必填</span></label><small>未回答時無法送出問卷</small></div><label class="field-setting-cell"><span class="field-setting-label">顯示順序</span><input type="number" name="order" min="1" step="1" required value="${esc(item.order||1)}"><small>數字越小，顯示越前面</small></label><label class="field-setting-cell"><span class="field-setting-label">欄位狀態</span><select name="status">${selectOptions(['啟用','草稿','停用'],item.status)}</select><small>啟用後可供問卷選用</small></label></div></section>
      <details class="field-editor-section field-editor-advanced"><summary>串接資訊（系統產生）</summary><p>以下資訊供官網串接查閱，由系統維護，不需要填寫。</p><div class="form-grid field-editor-grid">${control('key','欄位代碼',null,fieldKey,true)}${control('api','Payload path',null,item.api||'answers.'+fieldKey,true)}</div></details></div>`;
    }
    if(entity==='versions') {
      const composition=item.composition||(isNew?[]:questionFields.slice(0,6).map(f=>({key:f.key,required:f.required,order:f.order})));
      body+=section('問卷欄位組合','勾選使用欄位，設定本問卷必填與排序；不會修改欄位庫。',table(['使用','欄位','本問卷必填','排序'],questionFields.map((f,i)=>{const c=composition.find(c=>c.key===f.key);return `<tr><td><input type="checkbox" name="include-${i}" aria-label="使用 ${esc(f.name)}" ${c?'checked':''}></td><td>${esc(f.name)}<br><code>${esc(f.key)}</code></td><td><input type="checkbox" name="required-${i}" aria-label="${esc(f.name)} 必填" ${c?.required?'checked':''}></td><td><input type="number" min="1" step="1" name="order-${i}" aria-label="${esc(f.name)} 排序" value="${c?.order||i+1}"></td></tr>`;}),640));
    }
    const editor=open(`${isNew?'新增': '檢視／編輯'}${s.title}`,body,form=>{
      const draft={...item};
      for(const [k,,type,ro] of s.fields){if(ro&&!(isNew&&k===s.id))continue;const el=form.elements.namedItem(k);draft[k]=type==='checkbox'?el.checked:type==='number'?Number(el.value):Array.isArray(item[k])?el.value.split(/[,，]/).map(v=>v.trim()).filter(Boolean):el.value.trim();}
      if(entity==='pets'&&isNew)draft.memberId=form.elements.namedItem('memberId').value;
      if(entity==='members'&&members.some(m=>m!==item&&m.account===draft.account))throw Error('會員帳號已存在。');
      if(entity==='roles'&&roles.some(r=>r!==item&&r.name===draft.name))throw Error('角色名稱已存在。');
      if(entity==='fields'&&!/^[A-Za-z_][A-Za-z0-9_]*$/.test(draft.key))throw Error('欄位代碼請使用英文字母、數字與底線，且不可由數字開頭。');
      if(s.data.some(r=>r!==item&&r[s.id]===draft[s.id]))throw Error('代碼已存在，請使用不同的代碼。');
      let options=null;
      if(entity==='fields'){
        options=choiceTypes.includes(draft.type)?Array.from(form.querySelectorAll('[data-option-row]')).map((row,i)=>{const label=row.querySelector('[data-option-label]').value.trim(),value=row.querySelector('[data-option-value]').value.trim();if(!label||!value)throw Error(`第 ${i+1} 個選項的${!label?'文字':'代碼'}尚未填寫。`);return [label,value];}):[];
        if(new Set(options.map(p=>p[1])).size!==options.length)throw Error('選項 API 值不可重複。');
        if(['single_select','multi_select','select'].includes(draft.type)&&!options.length)throw Error('此回答格式至少需要一個選項。');
        draft.options=options.length;
      }
      if(entity==='roles'){
        const permissions=permissionsForItem.map((p,i)=>({...p,...Object.fromEntries(['view','write','del'].map(k=>[k,form.elements.namedItem(`permission-${i}-${k}`).checked]))}));
        if(permissions.some(p=>(p.write||p.del)&&!p.view))throw Error('開放寫入或刪除時，必須同時開放進入頁面。');
        if(item.id==='super-admin'&&(draft.status!=='啟用'||permissions.some(p=>!p.view||!p.write||!p.del)))throw Error('系統管理員角色必須維持啟用及完整權限。');
        rolePermissionProfiles[draft.id]=permissions;
        admins.filter(a=>a.role===item.name).forEach(a=>{a.role=draft.name;a.scope=draft.scope;});
      }
      if(entity==='admins'){
        const chosen=roles.find(r=>r.name===draft.role);draft.scope=chosen?.scope||draft.scope;
        if(item.role==='Super Admin'&&(draft.role!=='Super Admin'||draft.status!=='啟用')&&!admins.some(a=>a!==item&&a.role==='Super Admin'&&a.status==='啟用'))throw Error('至少需要保留一位啟用的系統管理員。');
      }
      if(entity==='pets'){
        const owner=members.find(m=>m.id===draft.memberId);if(!owner)throw Error('請選擇有效的所屬會員。');draft.owner=owner.name;
        if(draft.weight&&(!Number.isFinite(Number(draft.weight.replace(/\s*kg$/i,'')))||Number(draft.weight.replace(/\s*kg$/i,''))<=0))throw Error('體重請填寫大於 0 的數值，可加 kg。');
      }
      if(entity==='versions'){
        draft.composition=questionFields.flatMap((f,i)=>form.elements.namedItem(`include-${i}`).checked?[{key:f.key,required:form.elements.namedItem(`required-${i}`).checked,order:Number(form.elements.namedItem(`order-${i}`).value)}]:[]).sort((a,b)=>a.order-b.order);
        if(!draft.composition.length)throw Error('問卷至少需要一個欄位。');
        if(new Set(draft.composition.map(c=>c.order)).size!==draft.composition.length)throw Error('欄位排序不可重複。');
        draft.fields=draft.composition.length;draft.required=draft.composition.filter(c=>c.required).length;draft.updated=new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});
      }
      if(entity==='fields'&&draft.key!==item.key){
        questionnaires.forEach(q=>q.composition?.forEach(c=>{if(c.key===item.key)c.key=draft.key;}));
        if(group)group.key=draft.key;
      }
      Object.assign(item,draft);if(isNew)s.data.push(item);
      if(options){if(group){group.options=options;group.count=options.length;}else if(options.length)optionGroups.push({field:item.name,key:item.key,species:'犬貓共用',count:options.length,options});}
      if(entity==='members')petProfiles.filter(p=>p.memberId===item.id).forEach(p=>p.owner=item.name);
      if(entity==='pets')members.forEach(m=>m.pets=petProfiles.filter(p=>p.memberId===m.id).length);
      roles.forEach(r=>r.accounts=admins.filter(a=>a.role===r.name).length);
    });
    if(entity==='fields'&&editor){
      const list=editor.querySelector('[data-option-list]'),format=editor.querySelector('[name="type"]');
      function captureOptions(){optionDraft=Array.from(list.querySelectorAll('[data-option-row]')).map(row=>({label:row.querySelector('[data-option-label]').value,value:row.querySelector('[data-option-value]').value}));}
      function drawOptions(){list.innerHTML=optionDraft.length?optionDraft.map((o,i)=>`<div class="field-option-row" data-option-row><span class="field-option-number">${i+1}</span><div class="field-option-inputs"><label>選項文字<input data-option-label aria-label="選項 ${i+1} 文字" value="${esc(o.label)}" placeholder="例如：犬、貓"></label><details><summary>選項代碼</summary><label>串接用代碼<input data-option-value aria-label="選項 ${i+1} 代碼" value="${esc(o.value)}"></label><small>修改文字不會改變代碼。</small></details></div><div class="field-option-actions"><button type="button" class="secondary-button" data-option-up="${i}" aria-label="選項 ${i+1} 上移" ${i===0?'disabled':''}>↑</button><button type="button" class="secondary-button" data-option-down="${i}" aria-label="選項 ${i+1} 下移" ${i===optionDraft.length-1?'disabled':''}>↓</button><button type="button" class="secondary-button" data-option-remove="${i}" aria-label="刪除選項 ${i+1}">刪除</button></div></div>`).join(''):'<div class="field-option-empty">尚未新增選項。點選「＋ 新增選項」開始填寫。</div>';}
      editor.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const action=['add','up','down','remove'].find(a=>b.hasAttribute('data-option-'+a));if(!action)return;captureOptions();let focusIndex=0;if(action==='add'){let n=1;while(optionDraft.some(o=>o.value==='option_'+n))n++;optionDraft.push({label:'',value:'option_'+n});focusIndex=optionDraft.length-1;}else{const i=Number(b.getAttribute('data-option-'+action));if(action==='remove'){optionDraft.splice(i,1);focusIndex=Math.min(i,optionDraft.length-1);}else{const j=i+(action==='up'?-1:1);if(j<0||j>=optionDraft.length)return;[optionDraft[i],optionDraft[j]]=[optionDraft[j],optionDraft[i]];focusIndex=j;}}drawOptions();list.querySelectorAll('[data-option-label]')[focusIndex]?.focus();editor.querySelector('.field-option-status').textContent=`目前 ${optionDraft.length} 個選項`;});
      format.addEventListener('change',()=>{captureOptions();const selected=choiceTypes.includes(format.value);editor.querySelector('[data-option-section]').hidden=!selected;if(selected&&!optionDraft.length)optionDraft=[{label:'',value:'option_1'},{label:'',value:'option_2'}];drawOptions();});
      drawOptions();
      editor.dispatchEvent(new Event('record-baseline'));
    }
  }
  function readonly(title,html){const content=document.createElement('div');content.innerHTML=html;content.querySelectorAll('.detail-toolbar,.detail-back,[data-api-log-mode],.customer-api-detail-actions').forEach(e=>e.remove());content.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('複製 Trace'))b.remove();});open(title,content.innerHTML);}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.historyTab){
      const root=b.closest('.record-body')||document.querySelector('#view-content');
      root.querySelectorAll('[data-history-tab]').forEach(tab=>{const selected=tab===b;tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));});
      root.querySelectorAll('[data-history-panel]').forEach(panel=>panel.hidden=panel.dataset.historyPanel!==b.dataset.historyTab);
      return;
    }
    let action=null;
    const newEntities={'+ 新增會員':'members','新增會員':'members','+ 新增寵物':'pets','新增寵物':'pets','+ 新增帳號':'admins','+ 新增角色':'roles','+ 新增營養規則':'rules'};
    const newEntity=newEntities[b.textContent.trim()];
    if(newEntity&&!b.closest('dialog'))action=()=>edit(newEntity,'new');
    if(b.dataset.recordEntity){action=()=>b.dataset.recordEntity==='cases'?showCase(b.dataset.recordKey):edit(b.dataset.recordEntity,b.dataset.recordKey);}
    if(b.hasAttribute('data-member-detail'))action=()=>edit('members',b.dataset.memberDetail);
    if(b.hasAttribute('data-role-detail'))action=()=>edit('roles',b.dataset.roleDetail);
    if(b.hasAttribute('data-question-field'))action=()=>edit('fields',b.dataset.questionField);
    if(b.hasAttribute('data-questionnaire-version'))action=()=>edit('versions',b.dataset.questionnaireVersion);
    if(b.hasAttribute('data-case-detail'))action=()=>showCase(b.dataset.caseDetail);
    if(b.hasAttribute('data-api-log'))action=()=>{selectedApiLogIndex=b.dataset.apiLog;readonly('檢視 API 監控紀錄',renderApiLogDetail());};
    if(b.hasAttribute('data-template-detail'))action=()=>{selectedNutritionTemplateName=b.dataset.templateDetail;readonly('檢視營養模板',renderNutritionTemplateDetail());};
    if(action){e.preventDefault();e.stopImmediatePropagation();action();}
  },true);
  function showCase(id){selectedRecommendationCaseId=id;readonly('檢視推薦歷史紀錄',renderRecommendationCaseDetail());}
})();

