/* Fixed API catalog; questionnaire authoring remains in app.js. */
(() => {
  const esc = escapeHtml;
  let apiTab = 'list', selectedApi = '';
  const contracts = [
    {id:'schema', name:'問卷設定', method:'GET', path:'/v1/questionnaire/schema', purpose:'取得已發布問卷的題目、選項、必填與排序。', source:'已發布問卷', fields:['問卷版本','欄位','選項','必填','排序'], dynamic:true},
  ];
  const button = (label, attr, style='secondary-button') => `<button type="button" class="${style}" ${attr}>${esc(label)}</button>`;
  const schema = () => ({version: questionnaires[0].version, fields: questionFields.filter(f=>f.status==='啟用').map(f=>({key:f.key,label:f.name,type:f.type,required:f.required,order:f.order,...(optionGroups.find(g=>g.key===f.key)?{options:optionGroups.find(g=>g.key===f.key).options.map(([label,value])=>({label,value}))}:{})}))});
  function payloadExamples() {return {request:{headers:{'x-api-key':'<由工程人員提供>'}},response:schema()};}
  const success = data => ({success:true,message:'請求成功',data,traceId:'demo-trace-id'});
  const failure = {success:false,message:'缺少有效的 API 金鑰',data:null,error:{code:'unauthorized'},traceId:'demo-trace-id'};
  function examples(id) {
    const c=contracts.find(c=>c.id===id), sample=payloadExamples(id);
    let payload=sample.response;
    if(Array.isArray(payload.data)) {
      payload={items:payload.data,...(payload.pagination?{pagination:payload.pagination}:{})};
    }
    return {request:{method:c.method,url:'<API Base URL>'+c.path,headers:{...sample.request.headers,Accept:'application/json',...(c.method==='POST'?{'Content-Type':'application/json'}:{})},...(sample.request.query?{query:sample.request.query}:{}),...(sample.request.path?{path:sample.request.path}:{}),...(sample.request.body?{body:{data:sample.request.body}}:{})},response:success(payload)};
  }
  function commonInfo() {
    return section('共用連線與驗證','以下 JSON 為共用串接文件，不是傳送給 API 的 Body。環境、網址及金鑰於串接時提供；個別路徑、參數與 data 請至「API 清單」檢視。',jsonPreview({environment:'Demo（尚未連線）',baseUrl:'<部署後提供的 API Base URL>',headers:{'x-api-key':'<串接時提供的驗證金鑰>',Accept:'application/json'}}))+
      section('Request 共用規則','問卷設定使用 GET 取得，驗證金鑰放在 Header，不需傳送 JSON Body。',jsonPreview({method:'GET',path:'/v1/questionnaire/schema'}))+
      section('Response 共用格式','success、message、traceId 為共用資訊，個別 API 的業務內容統一放在 data。清單使用 data.items，分頁資訊放在 data.pagination。',jsonPreview(success({}))+table(['欄位','型別','用途'],[['success','boolean','本次請求是否成功'],['message','string','處理結果或錯誤說明'],['data','object 或 null','個別 API 回傳資料；失敗時為 null'],['traceId','string','供雙方追查請求紀錄']].map(([k,t,d])=>`<tr><td><code>${k}</code></td><td>${t}</td><td>${d}</td></tr>`),650))+
      section('共用錯誤格式','失敗時仍使用相同外層，另以 error.code 提供程式判斷代碼；同時依情況回傳 HTTP 狀態碼。',jsonPreview(failure)+table(['HTTP 狀態碼','情況'],[['401','金鑰缺少或無效'],['403','無資料存取權限'],['404','查無指定資料'],['422','參數或問卷內容驗證未通過'],['500','服務處理失敗']].map(([k,d])=>`<tr><td>${k}</td><td>${d}</td></tr>`),650));
  }
  function apiView() {
    const connectionInfo = `<details class="customer-connection-info panel"><summary>串接資訊</summary><div class="customer-connection-body">${commonInfo()}</div></details>`;
    if(selectedApi) {
      const c=contracts.find(c=>c.id===selectedApi), data=examples(c.id);
      return `<div class="customer-api-detail-actions">${button('返回 API 清單','data-cc-api-back')}</div>` + section(c.name,c.purpose,
        `<div class="customer-contract"><strong>${c.method}</strong><code>${c.path}</code>${pill('固定格式')}</div><p class="customer-copy">${c.dynamic?'問卷欄位與選項由後台人員自訂，透過固定的 API 結構提供給官網。':'回傳格式由系統定義；資料依授權範圍與查詢條件提供。'}</p>${c.dynamic?button('管理問卷內容','data-cc-questionnaire'):''}`) +
        section('Request 範例',c.method==='GET'?'依 method、url、headers 設定 Postman；query 填入 Params，path 代入 URL。GET 不傳 Body。':'依 method、url、headers 設定 Postman，將 body 內容貼至 Body → raw → JSON。業務欄位放在 data 中。',jsonPreview(data.request)) +
        section('Response 範例',c.dynamic?'共用外層＋data：問卷欄位 key 是欄位代碼，不是驗證金鑰。此處為未連線的格式示範。':'共用外層＋此 API 的 data；目前為示範資料，尚未連線正式服務。',jsonPreview(data.response)) +
        section('錯誤回應','沿用共用錯誤外層，data 為 null。',table(['狀態碼','情況'],[['401','金鑰缺少或無效'],['403','無資料存取權限'],...(c.id==='submit'?[['422','必填缺漏、值不合法或問卷版本不符']]:[]),...(c.id==='result'?[['404','找不到推薦案例']]:[])].map(([code,text])=>`<tr><td>${code}</td><td>${text}</td></tr>`),500)+jsonPreview(failure));
    }
    if(apiTab==='connection') return tabs+commonInfo();
    const rows=contracts.map(c=>`<tr><td><strong>${c.name}</strong><p class="muted-text">${c.purpose}</p></td><td><code>${c.method} ${c.path}</code></td><td>${c.source}</td><td>${tags(c.fields)}</td><td>${c.dynamic?'依已發布問卷更新':'固定格式'}</td><td>${button('檢視',`data-cc-api-doc="${c.id}"`,'table-action')}</td></tr>`);
    return metricGrid([['問卷 API',String(contracts.length),'取得已發布問卷設定'],['可維護內容','問卷','題目、選項與啟用設定'],['目前環境','Demo','尚未串接正式服務']])+connectionInfo+
      section('問卷 API 清單','僅提供問卷設定、欄位與選項的串接文件。',table(['API','Endpoint','資料來源','回傳內容','內容更新方式','操作'],rows,1100));
  }
  function redraw() {document.querySelector('#view-content').innerHTML=apiView();}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-cc-questionnaire')){b.closest('dialog')?.close();questionnaireViewMode='fields';setView('questionnaire');return;}
    if(b.dataset.ccApiTab){apiTab=b.dataset.ccApiTab;selectedApi='';redraw();}
    if(b.dataset.ccApiDoc){selectedApi=b.dataset.ccApiDoc;const content=apiView();selectedApi='';recordDialogs.open('檢視 API 文件',content.replace(/<div class="customer-api-detail-actions">[\s\S]*?<\/div>/,''));}
    if(b.hasAttribute('data-cc-api-back')){b.closest('dialog')?.close();selectedApi='';apiTab='list';redraw();}
  });
  renderers['api-integration']=apiView;
  Object.assign(modules.find(m=>m.id==='api-integration'),{subtitle:'僅管理官網問卷 API；題目、選項與問卷版本由問卷內容管理維護。'});
  Object.assign(modules.find(m=>m.id==='questionnaire'),{subtitle:'自訂問卷欄位、API Key、回答格式與選項，並組合問卷版本。'});
})();
