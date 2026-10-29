/* Local, reviewable nutrition knowledge demo. No remote upload or AI indexing. */
(() => {
  const esc = escapeHtml;
  const definitions = {
    '能量基準': '基準 MER 係數：依物種、生命階段與生理狀態查表，供 RER × MER 係數使用。',
    '活動量調整': '活動量對 MER 係數的修正：須定義活動等級、適用對象、修正值與運算方式。',
    'BCS 調整': '體態對 MER 係數的修正：須定義 BCS 評分、適用對象、修正值與運算方式。',
    '營養需求標準': '每日營養需求換算：須定義營養素、適用條件、標準值、單位及換算基準。',
    '食材營養成分': '食材營養供給計算：記錄食材名稱／識別碼、部位與生熟或加工狀態、營養素含量、單位、計量基準（如每 100 g 可食部）及來源版本，供食材用量換算、食譜營養加總與需求比對。缺值不當作零；成分資料本身不代表適合所有物種。Demo 尚未執行食譜營養計算。',
    '飲水量建議': '飲水量查表：須定義體重、飲食條件、數值與單位，並區分每日總水分及額外飲水。',
    '拮抗規則': '推薦內容的拮抗檢查：須定義作用對象 A／B、觸發條件、拮抗影響、處理方式與逐條依據。此分類供後續檢查環節使用，Demo 尚未執行拮抗判斷。'
  };
  const types = Object.keys(definitions);
  const storageKey = 'tp-rag-nutrition-v2';
  const seed = types.slice(0,4).map((type, i) => ({
    id: 'demo-' + i, file: ['energy-baseline.xlsx','activity-rules.xlsx','bcs-rules.xlsx','daily-nutrients.xlsx','nutrition-notes.xlsx'][i],
    type, sheet: ['能量係數','活動量','體態','營養素標準','說明'][i], range: 'A1:F2', version: '討論稿 v1',
    species: '犬貓共用', stage: '成年維持', source: '介面示範資料，尚未導入正式標準', status: '待確認', demo: true,
    date: '2026-09-11', headers: ['項目','條件','數值','單位','換算基準','說明'],
    rows: [[['基準係數','活動調整','BCS 調整','蛋白質','標準適用說明'][i], '依物種與生命階段', '待提供', '待確認', '待確認', '請上傳並確認正式資料']],
    mapping: { item: '項目', condition: '條件', value: '數值', unit: '單位', basis: '換算基準', note: '說明' }
  }));
  let records;
  try { records = JSON.parse(localStorage.getItem(storageKey)) || seed; if (!Array.isArray(records)) records = seed; } catch { records = seed; }
  // Keep real legacy uploads for review, but never relabel them as antagonism rules.
  records = records.filter(r => !(r.type === '參考說明文件' && r.demo));
  for (const r of records) if (!types.includes(r.type)) { r.legacyType = r.legacyType || r.type; r.type = '待重新分類'; r.status = '已停用'; }
  let filter = '全部', query = '', statusFilter = '全部', draft = null, message = '';
  for(const [sheet,type] of [['ＭＥＲ係數','能量基準'],['活動量加成','活動量調整'],['BCS加成','BCS 調整'],['飲水量清單','飲水量建議']]) {
    const id='calculation-snapshot-'+sheet, data=calculationData.sheets[sheet];
    if(!records.some(r=>r.id===id)) records.push({id,file:calculationData.file,sheet,type,range:`A1:${String.fromCharCode(64+data[0].values.length)}${data.at(-1).row}`,version:'本次試算快照',species:'犬',stage:'依各列條件',source:'計算流程.xlsx；供 Demo 討論，未經正式營養審核',status:'待確認',demo:true,date:'2026-09-11',headers:data[0].values,rows:data.slice(1).map(r=>r.values),rowNumbers:data.slice(1).map(r=>r.row),mapping:{}});
  }
  const originalFiles = new Map();
  const fields = {item:'項目',condition:'適用條件',value:'數值',unit:'單位',basis:'換算基準／運算方式',note:'說明／註腳'};
  const antagonismFields = {item:'規則代碼',subjectA:'作用對象 A',subjectB:'作用對象 B',condition:'觸發條件',effect:'拮抗影響',action:'處理方式',evidence:'逐條依據',note:'說明／註腳'};
  const fieldsFor = type => type === '拮抗規則' ? antagonismFields : fields;
  const requiredFor = type => type === '拮抗規則' ? ['item','subjectA','subjectB','condition','effect','action','evidence'] : ['item','condition','value','unit','basis'];
  const btn = (label, attr, cls='secondary-button') => `<button type="button" class="${cls}" ${attr}>${esc(label)}</button>`;
  const typeOptions = (selected, all=false) => (all ? ['全部',...types] : types).map(t=>`<option ${t===selected?'selected':''}>${t}</option>`).join('');
  const sourceButton = r => btn('查看來源檔案', `data-n-source="${esc(r.id)}"`, 'table-action');
  const redraw = () => {
    const panel=document.querySelector('#retrieval-panel');
    const snapshot=panel?{hidden:panel.hidden,wide:panel.classList.contains('wide'),type:document.querySelector('#n-retrieve-type').value,species:document.querySelector('#n-retrieve-species').value,query:document.querySelector('#n-retrieve-query').value,html:document.querySelector('#n-retrieve-results').innerHTML}:null;
    document.querySelector('#view-content').innerHTML = renderers[location.hash.slice(1)]();
    const restored=document.querySelector('#retrieval-panel');
    if(snapshot&&restored){restored.hidden=snapshot.hidden;restored.classList.toggle('wide',snapshot.wide);updateSizeIcon(document.querySelector('[data-n-chat-size]'),snapshot.wide);const launcher=document.querySelector('[data-n-chat-open]');launcher.hidden=!snapshot.hidden;launcher.setAttribute('aria-expanded',String(!snapshot.hidden));document.querySelector('#n-retrieve-type').value=snapshot.type;document.querySelector('#n-retrieve-species').value=snapshot.species;document.querySelector('#n-retrieve-query').value=snapshot.query;document.querySelector('#n-retrieve-results').innerHTML=snapshot.html;}
  };
  function save() { try { localStorage.setItem(storageKey,JSON.stringify(records)); return true; } catch { message='瀏覽器儲存空間不足，變更僅保留到重新整理前。'; return false; } }
  function listTable(items, nutrient=false) {
    return items.length ? table(['資料集／工作表','資料類型','適用條件','版本','狀態','來源與操作'], items.map(r=>`<tr><td><strong>${esc(r.sheet)}</strong><br><small>${esc(r.file)}</small><br><small>${r.rows.length} 筆${r.demo?' · 示範資料':''}</small></td><td>${esc(r.type)}</td><td>${esc(r.species)} · ${esc(r.stage)}</td><td>${esc(r.version)}</td><td>${badge(r.status)}</td><td>${sourceButton(r)} ${btn(r.type==='營養需求標準'?'檢閱營養標準':'檢閱規則',`data-n-review="${esc(r.id)}"`,'table-action')}</td></tr>`),900) : '<div class="nutrition-empty">沒有符合條件的資料。請調整篩選或前往知識庫匯入。</div>';
  }
  function filtered(items) { return items.filter(r=>(statusFilter==='全部'||r.status===statusFilter)&&(!query||[r.file,r.sheet,r.type,r.species,r.stage,r.version].join(' ').toLowerCase().includes(query.toLowerCase()))); }
  const toolbar = () => `<div class="nutrition-toolbar"><input aria-label="搜尋資料集" id="n-search" placeholder="搜尋檔案、工作表、物種或版本" value="${esc(query)}"><select aria-label="資料分類" id="n-list-type">${typeOptions(filter,true)}</select><select aria-label="使用狀態" id="n-status">${selectOptions(['全部','待確認','使用中','已停用'],statusFilter)}</select>${btn('搜尋','data-n-search')}${btn('上傳 Excel','data-open-rag="true"','primary-button')}</div>`;
  function calculationFlow() {
    return `<div class="nutrition-intro"><strong>從 RER 到每日營養需求</strong><p>依序檢閱計算公式與查表依據。Excel、係數與營養標準集中於知識庫維護。</p><div class="button-row">${btn('前往知識庫','data-open-rag="true"')}${btn('查看營養需求標準','data-n-open-category="營養需求標準"')}</div></div>` +
      section('計算起點','固定公式', '<div class="formula-flow"><div class="formula">RER＝70 × 體重（kg）<sup>0.75</sup></div></div>') +
      section('查表與換算','前台寵物資料決定適用規則。活動量與 BCS 的組合方式待規則定義確認。',`<div class="formula-flow">${[
        ['01 · 基準能量','基準能量＝RER × 查表基準係數','能量基準'],
        ['02 · 活動量調整','活動調整後能量＝活動量規則（基準能量）','活動量調整'],
        ['03 · 體態調整／MER','MER＝BCS 規則（活動調整後能量）','BCS 調整'],
        ['04 · 每日營養建議下限','每日需求＝適用標準值 × 對應基準換算因子','營養需求標準'],
        ['換算基準','每 1,000 kcal：每日需求＝標準值 × MER ÷ 1,000','營養需求標準']
      ].map(([title,formula,type])=>`<article class="formula-step"><small>${title}</small><p class="formula">${formula}</p>${btn('查看來源檔案',`data-n-type-source="${type}"`)}</article>`).join('')}</div><p class="nutrition-footnote" style="padding:0 20px">依體重或代謝體重訂定的標準，須使用該標準的換算方式。每日需求不包含食譜配方。</p>`)+
      `<details class="panel"><summary style="padding:20px;cursor:pointer">查看調整規則的運算定義</summary>${section('運算定義','實際採用方式由來源規則定義；倍率與百分比不可混用。',`<div class="formula-flow"><div class="formula-step"><small>倍率</small><p class="formula">調整後能量＝調整前能量 × 倍率</p></div><div class="formula-step"><small>百分比調整</small><p class="formula">調整後能量＝調整前能量 ×（1＋調整率）</p></div></div>`)}</details>`;
  }
  function importForm() {
    if (!draft) return `<div class="form-grid nutrition-upload"><label><span class="upload-step">01 · 指定用途</span>這次上傳的資料類型<select id="n-upload-type">${typeOptions(filter==='全部'?'營養需求標準':filter)}</select></label><label class="nutrition-file"><span class="upload-step">02 · 匯入檔案</span>選擇 Excel 工作簿<button type="button" class="primary-button" data-n-demo-file>選擇檔案</button><small>展示：寵物營養規則.xlsx</small></label></div><p class="nutrition-footnote" style="padding:0 20px 16px">目前為互動展示：點擊「選擇檔案」查看範例工作表並逐一指定分類，不會讀取或上傳本機檔案。</p>`;
    return `<div style="padding:20px"><strong>${esc(draft.file)}</strong><p class="nutrition-footnote">${draft.sheets.length} 個工作表 · 選擇要匯入的工作表，核對第一列欄名與資料列。公式儲存格使用 Excel 上次儲存的值，不在此重新運算。</p><div class="form-grid"><label>適用物種<select id="n-species">${selectOptions(['犬','貓','犬貓共用'],draft.species)}</select></label><label>生命階段<input id="n-stage" value="${esc(draft.stage)}" placeholder="例如：成年維持"></label><label>版本<input id="n-version" value="${esc(draft.version)}" placeholder="請填寫版本"></label><label>標準／來源說明<input id="n-origin" value="${esc(draft.source)}" placeholder="請填寫來源與發布年份"></label></div>${draft.sheets.map((s,i)=>`<section class="import-sheet"><label><input type="checkbox" data-n-sheet="${i}" ${s.include?'checked':''}> ${esc(s.name)} · ${s.rows.length} 筆資料</label><div class="form-grid"><label>工作表資料類型<select data-n-sheet-type="${i}">${typeOptions(s.type)}</select></label>${Object.entries(fieldsFor(s.type)).map(([key,label])=>`<label>${label}${requiredFor(s.type).includes(key)?' *':''}<select data-n-map="${i}:${key}"><option value="">不對應</option>${s.headers.map(h=>`<option value="${esc(h)}" ${s.mapping[key]===h?'selected':''}>${esc(h)}</option>`).join('')}</select></label>`).join('')}</div>${preview(s.headers,s.rows.slice(0,5))}<p class="nutrition-footnote">預覽前 5 筆。來源範圍：${esc(s.range)}</p></section>`).join('')}<div class="button-row">${btn('確認匯入為待確認','data-n-import','primary-button')}${btn('取消本次匯入','data-n-cancel')}</div></div>`;
  }
  function library() {
    const shown=filtered(records.filter(r=>filter==='全部'||r.type===filter));
    return ''+
      metricGrid([['資料集',String(records.length),'依工作表分類'],['使用中',String(records.filter(r=>r.status==='使用中').length),'可用資料'],['待確認',String(records.filter(r=>r.status==='待確認').length),'檢閱後啟用'],['資料類型',String(types.length),'查表與檢索範圍']])+
      (message?`<div class="nutrition-message" role="status">${esc(message)}</div>`:'')+
      (records.some(r=>!types.includes(r.type))?'<div class="nutrition-message">舊分類資料已停用，保留於「全部」供檢閱。請依用途整理欄位後，以明確分類及新版本重新匯入。</div>':'')+
      section(draft?'02 · 工作表分類與匯入預覽':'上傳文件','同一份 Excel 的不同工作表，可指定不同資料類型。',importForm())+
      section('檔案與資料集','每筆資料保留檔名、工作表、原始列號、版本與使用狀態。',toolbar()+listTable(shown));
  }
  function preview(headers,rows) { return rows.length?table(headers.map(esc),rows.map(row=>`<tr>${headers.map((_,i)=>`<td>${esc(String(row[i]??''))}</td>`).join('')}</tr>`),600):'<div class="nutrition-empty">此工作表沒有資料列。</div>'; }
  function dialog(title, body) {
    document.querySelector('#n-dialog')?.remove();
    const d=document.createElement('dialog'); d.id='n-dialog'; d.className='nutrition-dialog';
    d.innerHTML=`<header><h2>${esc(title)}</h2>${btn('關閉','data-n-close')}</header>${body}`;
    document.body.append(d); d.showModal();
    d.addEventListener('close',()=>d.remove());
  }
  function review(id) {
    const r=records.find(r=>r.id===id); if(!r)return;
    dialog('檢閱 · '+r.sheet,`<p>${esc(r.type)} · ${esc(r.species)} · ${esc(r.stage)} · ${badge(r.status)}</p><p>${esc(r.file)} ／ ${esc(r.sheet)} ／ ${esc(r.range)}</p><p>版本：${esc(r.version)} · ${esc(r.source)}</p>${r.demo?'<div class="nutrition-message">此資料集為示範或本次試算快照，未經正式審核，不可在此啟用。</div>':''}${section('欄位對應','',preview(['用途','來源欄位'],Object.entries(r.mapping).filter(([,v])=>v).map(([k,v])=>[fieldsFor(r.type)[k] || k,v])))}${section('原始資料預覽','最多顯示前 100 筆；來源列號保持與 Excel 一致。',preview(['Excel 列號',...r.headers],r.rows.slice(0,100).map((row,i)=>[r.rowNumbers?.[i]??i+2,...row])))}<div class="button-row">${sourceButton(r)}${btn(r.status==='使用中'?'停用資料集':'確認並啟用',`data-n-toggle="${esc(r.id)}" ${r.demo||!types.includes(r.type)?'disabled':''}`,'primary-button')}</div><p class="nutrition-footnote">啟用代表完成本次人工檢閱。相同檔名、工作表、類型、物種與生命階段的舊版本會停用；不同適用範圍仍需人工確認是否重疊。</p>`);
  }
  function source(id) {
    const r=records.find(r=>r.id===id); if(!r)return;
    const siblings=records.filter(x=>x.file===r.file&&x.version===r.version);
    dialog('來源檔案',`<h3>${esc(r.file)}</h3><p>${esc(r.source)}</p><dl class="detail-summary"><div><dt>版本</dt><dd>${esc(r.version)}</dd></div><div><dt>匯入日期</dt><dd>${esc(r.date)}</dd></div><div><dt>工作表／範圍</dt><dd>${esc(r.sheet)} ／ ${esc(r.range)}</dd></div><div><dt>使用狀態</dt><dd>${badge(r.status)}</dd></div></dl>${listTable(siblings)}${section('來源內容預覽','匯入時保存的原始儲存格內容。',preview(r.headers,r.rows.slice(0,100)))}${originalFiles.has(r.id)?btn('下載原始 Excel',`data-n-download="${esc(r.id)}"`):'<p class="nutrition-footnote">目前保留匯入內容預覽。原始 Excel 僅於本次瀏覽期間可下載；示範檔案未附原檔。</p>'}`);
  }
  // Small XLSX reader: ZIP central directory + OOXML values, no code execution.
  async function readWorkbook(file) {
    if(!/\.xlsx$/i.test(file.name))throw Error('請選擇 .xlsx 檔案；舊版 .xls 請先另存為 .xlsx。');
    if(file.size>5*1024*1024)throw Error('檔案超過 5 MB，請拆分後上傳。');
    const buffer=await file.arrayBuffer(), view=new DataView(buffer), bytes=new Uint8Array(buffer), entries=new Map();
    let end=bytes.length-22;
    while(end>=Math.max(0,bytes.length-65557)&&view.getUint32(end,true)!==0x06054b50)end--;
    if(end<0||end<bytes.length-65557)throw Error('無法讀取 Excel 壓縮結構。');
    let pos=view.getUint32(end+16,true), total=0;
    for(let i=0;i<view.getUint16(end+10,true);i++) {
      if(view.getUint32(pos,true)!==0x02014b50)throw Error('Excel 檔案結構不完整。');
      const size=view.getUint32(pos+24,true), compressed=view.getUint32(pos+20,true), n=view.getUint16(pos+28,true), extra=view.getUint16(pos+30,true), comment=view.getUint16(pos+32,true);
      total+=size;if(total>30*1024*1024)throw Error('解壓縮內容超過 30 MB，請拆分工作簿。');
      const name=new TextDecoder().decode(bytes.slice(pos+46,pos+46+n));
      entries.set(name,{method:view.getUint16(pos+10,true),compressed,size,offset:view.getUint32(pos+42,true)});pos+=46+n+extra+comment;
    }
    async function xml(path) {
      const e=entries.get(path);if(!e)throw Error('缺少 Excel 工作表內容：'+path);
      const start=e.offset+30+view.getUint16(e.offset+26,true)+view.getUint16(e.offset+28,true);
      let raw=bytes.slice(start,start+e.compressed);
      if(e.method===8)raw=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else if(e.method!==0)throw Error('不支援此 Excel 壓縮格式。');
      const doc=new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
      if(doc.querySelector('parsererror'))throw Error('Excel XML 內容損毀。');return doc;
    }
    const strings=entries.has('xl/sharedStrings.xml')?Array.from((await xml('xl/sharedStrings.xml')).getElementsByTagName('si')).map(e=>Array.from(e.getElementsByTagName('t')).map(t=>t.textContent).join('')):[];
    const workbook=await xml('xl/workbook.xml'), rels=await xml('xl/_rels/workbook.xml.rels');
    const links=new Map(Array.from(rels.getElementsByTagName('Relationship')).map(e=>[e.getAttribute('Id'),e.getAttribute('Target')]));
    const sheets=[];
    for(const sheet of workbook.getElementsByTagName('sheet')) {
      const target=links.get(sheet.getAttribute('r:id'));if(!target)continue;
      const path=target.startsWith('/')?target.slice(1):new URL(target,'https://local/xl/').pathname.slice(1);
      const doc=await xml(path), data=[], rowNumbers=[];
      for(const row of doc.getElementsByTagName('row')) {
        const values=[];
        for(const cell of row.getElementsByTagName('c')) {
          const ref=cell.getAttribute('r')||'', col=(ref.match(/^[A-Z]+/)||[])[0]; if(!col)continue;
          const index=Array.from(col).reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1;
          if(index>199)throw Error('工作表超過 200 欄，請只保留需要匯入的資料。');
          const kind=cell.getAttribute('t'), value=cell.getElementsByTagName('v')[0]?.textContent??'';
          if(cell.getElementsByTagName('f').length&&!value)throw Error('公式缺少快取值，請先在 Excel 重新計算並儲存。');
          if(kind==='e')throw Error('Excel 含有錯誤儲存格：'+ref);
          values[index]=kind==='s'?(strings[Number(value)]??''):kind==='inlineStr'?Array.from(cell.getElementsByTagName('t')).map(t=>t.textContent).join(''):value;
        }
        if(values.some(v=>v!==''&&v!=null)){data.push(values);rowNumbers.push(Number(row.getAttribute('r')));}
        if(data.length>5001)throw Error('每個工作表最多支援 5,000 筆資料。');
      }
      if(!data.length)continue;
      const headers=Array.from(data.shift(),v=>String(v??'').trim());rowNumbers.shift();
      if(headers.some(h=>!h)||new Set(headers).size!==headers.length)throw Error(sheet.getAttribute('name')+'：第一列欄名不可空白或重複。');
      if(data.some(row=>row.length>headers.length))throw Error('資料欄數超過標題欄數，請確認欄名。');
      const mapping=Object.fromEntries(Object.entries({...fields,...antagonismFields}).map(([key,label])=>[key,headers.find(h=>h===label||h===fields[key]||h===({basis:'換算基準',note:'說明',condition:'條件'}[key]))||'']));
      sheets.push({name:sheet.getAttribute('name'),headers,rows:data.map(r=>Array.from({length:headers.length},(_,i)=>r[i]??'')),rowNumbers,range:doc.getElementsByTagName('dimension')[0]?.getAttribute('ref')||'依原始列號',mapping,include:data.length>0});
    }
    if(!sheets.length)throw Error('工作簿沒有可匯入的工作表。');return sheets;
  }
  function captureDraft() {
    if(!draft)return;
    for(const key of ['species','stage','version'])draft[key]=document.querySelector('#n-'+key)?.value??draft[key];
    draft.source=document.querySelector('#n-origin')?.value??draft.source;
    draft.sheets.forEach((s,i)=>{s.include=document.querySelector(`[data-n-sheet="${i}"]`)?.checked??s.include;s.type=document.querySelector(`[data-n-sheet-type="${i}"]`)?.value??s.type;for(const k in fieldsFor(s.type))s.mapping[k]=document.querySelector(`[data-n-map="${i}:${k}"]`)?.value??s.mapping[k];});
  }
  document.addEventListener('change',async e=>{
    if(e.target.id==='n-file') {
      const file=e.target.files[0];if(!file)return;
      const type=document.querySelector('#n-upload-type').value; e.target.disabled=true;
      try { const sheets=await readWorkbook(file);draft={file:file.name,sheets:sheets.map(s=>({...s,type})),species:'犬貓共用',stage:'',version:'',source:''};originalFiles.set(file.name,file);message='已讀取實際 Excel 內容，請確認分類、欄位與來源。'; }
      catch(err){message='匯入失敗：'+err.message;}
      if(location.hash==='#rag')redraw();
    }
    if(e.target.matches('[data-n-sheet-type]')) {captureDraft();redraw();}
    else if(e.target.closest('.import-sheet')||['n-species','n-stage','n-version','n-origin'].includes(e.target.id))captureDraft();
  });
  document.addEventListener('input',e=>{if(['n-stage','n-version','n-origin'].includes(e.target.id))captureDraft();});
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-n-demo-file')) {
      const sheets=[['MER 係數','能量基準',12],['活動量加成','活動量調整',24],['BCS 加成','BCS 調整',13],['營養素拮抗','拮抗規則',18],['食材成分表','食材營養成分',20],['填寫說明','',1]];
      dialog('列出工作表，逐一指定分類', `<div class="nutrition-message">互動展示 · 範例檔案，尚未讀取實際 Excel 或執行 AI 解析。</div><h3>寵物營養規則.xlsx</h3><p class="nutrition-footnote">勾選要處理的工作表並指定用途。AI 將讀取勾選工作表的全部內容，不需要手動設定欄位。</p><div class="sheet-demo-list">${sheets.map(([name,type,count],i)=>`<div class="sheet-demo-row"><label><input type="checkbox" data-demo-include="${i}" ${type?'checked':''}><span><strong>${esc(name)}</strong><small>${count} 筆範例資料</small></span></label><label>資料類型<select data-demo-type="${i}" aria-label="${esc(name)}的資料類型"><option value="">請指定分類</option>${typeOptions(type)}</select></label></div>`).join('')}</div><p id="demo-sheet-status" role="status" class="nutrition-footnote">已勾選 ${sheets.filter(([,type])=>type).length} 個工作表；未勾選的工作表不會送交解析。</p><div class="button-row">${btn('確認分類，預覽下一步','data-n-demo-next','primary-button')}${btn('取消','data-n-close')}</div>`);
      document.querySelector('#n-dialog').classList.add('nutrition-help-dialog');
      document.querySelector('#n-dialog').setAttribute('aria-label','工作表分類展示');
    }
    if(b.hasAttribute('data-n-demo-next')) {
      const rows=Array.from(document.querySelectorAll('.sheet-demo-row'));
      const selected=rows.filter(row=>row.querySelector('input').checked);
      const status=document.querySelector('#demo-sheet-status');
      if(!selected.length){status.textContent='請至少勾選一個工作表。';return;}
      if(selected.some(row=>!row.querySelector('select').value)){status.textContent='請為每個勾選的工作表指定資料類型。';return;}
      const summary=selected.map(row=>[row.querySelector('strong').textContent,row.querySelector('select').value]);
      dialog('分類確認 · 下一步預覽',`<div class="nutrition-message">展示完成，未執行 AI 解析，也未新增或啟用資料集。</div>${preview(['工作表','指定分類'],summary)}<div class="category-guide"><article><h3>01 · AI 讀取全部內容</h3><p>依各工作表指定分類解析欄位、資料與註解，不需手動對應欄位。</p></article><article><h3>02 · 檢閱解析結果</h3><p>確認整理後的規則與來源；缺少條件或內容不明確時，標示待確認。</p></article></div><div class="button-row">${btn('返回工作表設定','data-n-demo-back')}${btn('完成展示','data-n-close','primary-button')}</div>`);
      document.querySelector('#n-dialog').classList.add('nutrition-help-dialog');
      document.querySelector('#n-dialog').dataset.demoSelection=JSON.stringify(summary);
    }
    if(b.hasAttribute('data-n-demo-back')) {
      const selected=JSON.parse(document.querySelector('#n-dialog').dataset.demoSelection);
      document.querySelector('[data-n-demo-file]').click();
      for(const row of document.querySelectorAll('.sheet-demo-row')) {
        const entry=selected.find(([name])=>name===row.querySelector('strong').textContent);
        row.querySelector('input').checked=!!entry;
        if(entry)row.querySelector('select').value=entry[1];
      }
      document.querySelector('#demo-sheet-status').textContent=`已勾選 ${selected.length} 個工作表；未勾選的工作表不會送交解析。`;
    }
    if(b.hasAttribute('data-n-close'))document.querySelector('#n-dialog')?.close();
    if(b.dataset.nSource)source(b.dataset.nSource);
    if(b.dataset.nOpenCategory){filter=b.dataset.nOpenCategory;query='';statusFilter='全部';setView('rag');}
    if(b.dataset.nReview)review(b.dataset.nReview);
    if(b.dataset.nTypeSource)dialog(b.dataset.nTypeSource+' · 來源檔案',listTable(records.filter(r=>r.type===b.dataset.nTypeSource)));
    if(b.dataset.nFilter){captureDraft();filter=b.dataset.nFilter;redraw();}

    if(b.hasAttribute('data-n-search')){captureDraft();query=document.querySelector('#n-search').value;filter=document.querySelector('#n-list-type').value;statusFilter=document.querySelector('#n-status').value;redraw();}
    if(b.hasAttribute('data-n-cancel')){draft=null;message='已取消本次匯入。';redraw();}
    if(b.hasAttribute('data-n-import')) {
      captureDraft();if(!draft)return;
      try {
        if(!draft.stage.trim()||!draft.version.trim()||!draft.source.trim())throw Error('請填寫生命階段、版本及來源說明。');
        const selected=draft.sheets.filter(s=>s.include);if(!selected.length)throw Error('請至少勾選一個工作表。');
        for(const s of selected) {
          if(!types.includes(s.type))throw Error(s.name+'：請選擇明確的資料類型。'); const required=requiredFor(s.type);
          if(required.some(k=>!s.mapping[k]))throw Error(s.name+'：請完成必填欄位對應。');
          const mapped=Object.keys(fieldsFor(s.type)).map(k=>s.mapping[k]).filter(Boolean);if(new Set(mapped).size!==mapped.length)throw Error(s.name+'：同一來源欄位不可重複對應。');
          for(const row of s.rows) {
            if(required.some(k=>!String(row[s.headers.indexOf(s.mapping[k])]??'').trim()))throw Error(s.name+'：必填欄位包含空白值。');
            if(s.type!=='拮抗規則'&&!Number.isFinite(Number(row[s.headers.indexOf(s.mapping.value)])))throw Error(s.name+'：數值欄須為數字；百分比請以小數儲存，並於單位及基準說明。');
          }
          if(records.some(r=>r.file===draft.file&&r.sheet===s.name&&r.version===draft.version))throw Error('相同檔案、工作表與版本已存在，請使用新版本。');
        }
        for(const s of selected){const id=crypto.randomUUID();originalFiles.set(id,originalFiles.get(draft.file));records.push({id,file:draft.file,sheet:s.name,type:s.type,species:draft.species,stage:draft.stage,version:draft.version,source:draft.source,status:'待確認',date:new Date().toLocaleDateString('sv-SE'),headers:s.headers,rows:s.rows,rowNumbers:s.rowNumbers,range:s.range,mapping:Object.fromEntries(Object.keys(fieldsFor(s.type)).map(k=>[k,s.mapping[k]||'']))});}
        message=`已匯入 ${selected.length} 個資料集，請檢閱後啟用。`;save();draft=null;
      }catch(err){message=err.message;}
      redraw();
    }
    if(b.dataset.nToggle) {
      const r=records.find(r=>r.id===b.dataset.nToggle);if(!r||r.demo||!types.includes(r.type))return;
      if(r.status==='使用中')r.status='已停用';else{records.filter(x=>x.id!==r.id&&x.file===r.file&&x.sheet===r.sheet&&x.type===r.type&&x.species===r.species&&x.stage===r.stage&&x.status==='使用中').forEach(x=>x.status='已停用');r.status='使用中';}
      save();redraw();review(r.id);
    }
    if(b.dataset.nDownload){const r=records.find(r=>r.id===b.dataset.nDownload),file=originalFiles.get(r?.id);if(file){const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=r.file;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}}
    if(b.hasAttribute('data-n-retrieve')) {
      const type=document.querySelector('#n-retrieve-type').value,species=document.querySelector('#n-retrieve-species').value,q=document.querySelector('#n-retrieve-query').value.trim().toLowerCase();
      const hits=records.filter(r=>r.status==='使用中'&&r.type===type&&(species==='全部'||r.species===species||(['犬','貓'].includes(species)&&r.species==='犬貓共用'))&&(!q||r.rows.some(row=>row.join(' ').toLowerCase().includes(q))));
            const result=document.querySelector('#n-retrieve-results');
      if(!q){document.querySelector('#n-retrieve-query').focus();return;}
      result.insertAdjacentHTML('beforeend',`<div class="retrieval-question">${esc(q)}<small>${esc(type)} · ${esc(species)}</small></div><div class="retrieval-answer">${hits.length?`找到 ${hits.length} 份資料集。${hits.map(r=>`<article><strong>${esc(r.sheet)}</strong><p>${esc(r.file)} · ${esc(r.version)} · 適用物種：${esc(r.species||'待確認')}</p>${sourceButton(r)}</article>`).join('')}`:'沒有符合條件的使用中資料。請更換關鍵字，或確認資料集是否已啟用。'}</div>`);
      result.scrollTop=result.scrollHeight;
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('#n-list-type,#n-status'))document.querySelector('[data-n-search]').click();
    if(!e.target.matches('[data-demo-include]'))return;
    document.querySelector('#demo-sheet-status').textContent=`已勾選 ${document.querySelectorAll('[data-demo-include]:checked').length} 個工作表；未勾選的工作表不會送交解析。`;
  });
  renderers['nutrition-rules']=calculationFlow;renderers.rag=library;
  const renderLibrary = library;
  const panelIcon = (kind) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${kind==='minimize'?'<path d="M5 12h14"/>':kind==='restore'?'<path d="M4 9h5V4m0 5L3 3m17 12h-5v5m0-5 6 6"/>':'<path d="M8 3H3v5m0-5 6 6m7 12h5v-5m0 5-6-6"/>'}</svg>`;
  const panelIconButton = (label,attr,kind) => `<button type="button" class="secondary-button panel-icon-button" ${attr} title="${label}" aria-label="${label}">${panelIcon(kind)}</button>`;
  function updateSizeIcon(button,wide) { const label=wide?'還原寬度':'放大';button.innerHTML=panelIcon(wide?'restore':'expand');button.title=label;button.setAttribute('aria-label',label); }
  const retrievalPanel = () => `<button type="button" class="primary-button retrieval-launcher" data-n-chat-open aria-expanded="false" aria-controls="retrieval-panel">開啟知識庫檢索</button><aside id="retrieval-panel" class="retrieval-panel" role="dialog" aria-label="知識庫檢索" hidden><header><div><h2>知識庫檢索</h2><small>搜尋已啟用的分類資料與來源</small></div><div>${panelIconButton('放大','data-n-chat-size','expand')}${panelIconButton('縮小','data-n-chat-close','minimize')}</div></header><div class="retrieval-filters"><label>資料分類<select id="n-retrieve-type">${typeOptions('營養需求標準')}</select></label><label>查詢物種<select id="n-retrieve-species"><option selected>全部</option><option>犬</option><option>貓</option></select></label></div><div id="n-retrieve-results" class="retrieval-messages" aria-live="polite"><div class="retrieval-answer">選擇分類與物種，再輸入關鍵字，我會列出符合條件的資料來源。<p class="nutrition-footnote">目前為本機文字檢索，尚未接入 AI 問答。</p></div></div><form class="retrieval-composer"><label for="n-retrieve-query">檢索關鍵字</label><div><input id="n-retrieve-query" placeholder="輸入項目、條件或說明…" required>${btn('檢索','data-n-retrieve','primary-button')}</div></form></aside>`;
  renderers.rag = () => `<div class="nutrition-library"><div class="library-help-row"><span>文件與資料集管理</span><button type="button" class="nutrition-help" data-n-help aria-label="文件分類與使用環節說明" title="文件分類與使用環節" aria-haspopup="dialog">i</button></div>${renderLibrary()}${retrievalPanel()}</div>`;
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    const panel=document.querySelector('#retrieval-panel');
    if(b.hasAttribute('data-n-chat-open')){panel.hidden=false;b.hidden=true;b.setAttribute('aria-expanded','true');document.querySelector('#n-retrieve-query').focus();}
    if(b.hasAttribute('data-n-chat-close')){panel.hidden=true;const launcher=document.querySelector('[data-n-chat-open]');launcher.hidden=false;launcher.setAttribute('aria-expanded','false');launcher.focus();}
    if(b.hasAttribute('data-n-chat-size')){const wide=panel.classList.toggle('wide');updateSizeIcon(b,wide);}
  });
  document.addEventListener('submit',e=>{if(!e.target.matches('.retrieval-composer'))return;e.preventDefault();document.querySelector('[data-n-retrieve]').click();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.target.id==='n-search'){e.preventDefault();document.querySelector('[data-n-search]').click();}
    if(e.key==='Enter'&&e.target.id==='n-retrieve-query'){e.preventDefault();document.querySelector('[data-n-retrieve]').click();}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.closest('#retrieval-panel'))document.querySelector('[data-n-chat-close]').click();});
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-n-help]')) return;
    dialog('文件分類與使用環節', `<p class="nutrition-footnote">一個工作表對應一種用途；跨用途內容請拆成不同工作表。來源說明與引用依據附在各分類中。</p><div class="category-guide">${types.map(type=>`<article><h3>${esc(type)}</h3><p>${esc(definitions[type])}</p></article>`).join('')}</div>`);
    const modal = document.querySelector('#n-dialog');
    modal.classList.add('nutrition-help-dialog');
    modal.setAttribute('aria-label', '文件分類與使用環節');
  });
  Object.assign(modules.find(m=>m.id==='nutrition-rules'),{label:'計算流程與規則',subtitle:'檢閱 RER、基準能量、活動量、BCS、MER 與每日營養需求的公式及來源。'});
  Object.assign(modules.find(m=>m.id==='rag'),{subtitle:'依資料類型匯入 Excel，對應工作表欄位並保留查表與檢索來源。'});
})();
