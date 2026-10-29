/* API module: format reference + request records; token usage is a sibling page. */
(() => {
  const esc=v=>escapeHtml(String(v??''));
  const formatView=renderers['api-integration'];
  let activeTab='format',search='',status='all',from='',to='';
  const button=(label,attr)=>`<button type="button" class="secondary-button" ${attr}>${esc(label)}</button>`;
  const questionnaireLogs=()=>apiLogs.map((log,index)=>({...log,index})).filter(log=>log.endpoint==='/v1/questionnaire/schema');
  function requestView(){
    const logs=questionnaireLogs().filter(l=>(status==='all'||(status==='success'?Number(l.code)>=200&&Number(l.code)<300:Number(l.code)>=400))&&(!from||l.time.slice(0,10)>=from)&&(!to||l.time.slice(0,10)<=to)&&(!search||[l.endpoint,l.source,l.caseId,l.error].join(' ').toLowerCase().includes(search.toLowerCase())));
    const rows=logs.map(l=>`<tr><td><button type="button" class="link-button" data-apim-log="${l.index}">${esc(l.time)}</button></td><td><code>${esc(l.method+' '+l.endpoint)}</code></td><td>${badge(l.code)}</td><td>${esc(l.duration)}</td><td>${esc(l.source)}</td><td>${esc(l.error)}</td><td>${button('檢視',`data-apim-log="${l.index}"`)}</td></tr>`);
    const filters=`<div class="apim-filters"><label>開始日期<input id="apim-from" type="date" value="${esc(from)}"></label><label>結束日期<input id="apim-to" type="date" value="${esc(to)}"></label><label>狀態<select id="apim-status"><option value="all">全部</option><option value="success" ${status==='success'?'selected':''}>成功</option><option value="failed" ${status==='failed'?'selected':''}>失敗</option></select></label><label class="apim-search">搜尋<input id="apim-search" value="${esc(search)}" placeholder="搜尋來源、路徑或錯誤訊息"></label>${button('搜尋','data-apim-search')}${button('重設','data-apim-reset')}</div>`;
    return section('問卷 API 呼叫紀錄','點擊單筆紀錄，以彈窗查看請求、回應與錯誤。以下為本機示範紀錄。',filters+(rows.length?table(['時間','API','狀態碼','耗時','來源','錯誤訊息','操作'],rows,1000):'<div class="nutrition-empty">沒有符合條件的呼叫紀錄。</div>'));
  }
  renderers['api-integration']=()=>`<div class="tabs" role="tablist" aria-label="API 管理">${[['format','API 格式說明'],['requests','呼叫紀錄']].map(([id,label])=>`<button type="button" role="tab" aria-selected="${activeTab===id}" aria-controls="apim-panel" id="apim-tab-${id}" class="tab ${activeTab===id?'active':''}" data-apim-tab="${id}">${label}</button>`).join('')}</div><div id="apim-panel" role="tabpanel" aria-labelledby="apim-tab-${activeTab}">${activeTab==='format'?formatView():requestView()}</div>`;
  renderers['api-monitoring']=()=>{
    const count=v=>Number(String(v).replaceAll(',',''))||0;
    return metricGrid([['AI 呼叫',tokenUsage.length,'目前示範紀錄'],['輸入 Token',tokenUsage.reduce((n,r)=>n+count(r.input),0).toLocaleString(),'輸入用量'],['輸出 Token',tokenUsage.reduce((n,r)=>n+count(r.output),0).toLocaleString(),'輸出用量'],['總 Token',tokenUsage.reduce((n,r)=>n+count(r.total),0).toLocaleString(),'不等同 API 呼叫次數']])+section('AI Token 用量','依 AI 處理紀錄查看模型、用途與輸入／輸出量。目前為示範資料，尚未串接實際用量與帳務。',table(['時間','模型','用途','輸入 Token','輸出 Token','總計','關聯紀錄'],tokenUsage.map(r=>`<tr>${[r.time,r.model,r.purpose,r.input,r.output,r.total,r.caseId].map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`),1000));
  };
  Object.assign(modules.find(m=>m.id==='api-integration'),{label:'API 管理',subtitle:'查看問卷 API 格式說明與呼叫紀錄。'});
  Object.assign(modules.find(m=>m.id==='api-monitoring'),{label:'AI Token 用量',subtitle:'查看 AI 處理的輸入、輸出與總 Token 用量。'});
  const previousNav=renderNav;
  renderNav=()=>{
    previousNav();const api=document.querySelector('[data-view="api-integration"]'),tokens=document.querySelector('[data-view="api-monitoring"]');
    const group=document.createElement('details');group.className='km-nav api-module';group.open=true;api.before(group);
    group.innerHTML='<summary class="nav-item"><span class="nav-index">02</span><span class="nav-label">API 監控與用量</span><span class="km-caret" aria-hidden="true">▾</span></summary>';
    for(const entry of [api,tokens]){entry.querySelector('.nav-index')?.remove();entry.classList.add('apim-subnav');group.append(entry);}
  };
  const redraw=()=>document.querySelector('#view-content').innerHTML=renderers['api-integration']();
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.apimTab){activeTab=b.dataset.apimTab;redraw();document.querySelector(`[data-apim-tab="${activeTab}"]`).focus();}
    if(b.hasAttribute('data-apim-search')){from=document.querySelector('#apim-from').value;to=document.querySelector('#apim-to').value;status=document.querySelector('#apim-status').value;search=document.querySelector('#apim-search').value;if(from&&to&&from>to){notify('開始日期不可晚於結束日期。');return;}redraw();}
    if(b.hasAttribute('data-apim-reset')){from='';to='';search='';status='all';redraw();}
    if(b.hasAttribute('data-apim-log')){
      const l=apiLogs[Number(b.dataset.apimLog)];if(!l)return;
      const request={method:l.method,path:l.endpoint,headers:{'x-api-key':'<已遮蔽>',Accept:'application/json'}};
      const response={success:Number(l.code)>=200&&Number(l.code)<300,data:Number(l.code)>=400?null:questionnaireSchema,error:l.error==='-'?null:l.error};
      recordDialogs.open('檢視 API 呼叫紀錄',`<dl class="detail-summary"><div><dt>時間</dt><dd>${esc(l.time)}</dd></div><div><dt>狀態碼</dt><dd>${badge(l.code)}</dd></div><div><dt>耗時</dt><dd>${esc(l.duration)}</dd></div><div><dt>來源</dt><dd>${esc(l.source)}</dd></div><div><dt>錯誤訊息</dt><dd>${esc(l.error)}</dd></div><div><dt>關聯紀錄</dt><dd>${esc(l.caseId)}</dd></div></dl>${section('本次 Request（示範）','GET 不傳送 Body；敏感驗證資訊已遮蔽。',jsonPreview(request))}${section('本次 Response（示範）','此為示範紀錄的呈現，尚未串接真實請求快照。',jsonPreview(response))}`);
    }
  });
  document.addEventListener('keydown',e=>{if(e.target.id==='apim-search'&&e.key==='Enter'){e.preventDefault();document.querySelector('[data-apim-search]').click();}});
})();
