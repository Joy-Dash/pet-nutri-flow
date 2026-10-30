const modules = [
  { id: "rag", label: "知識庫與檔案匯入管理", route: "/rag", subtitle: "集中上傳檔案，依資料類型執行 AI 解析、結構化匯入與 RAG 索引。" },
  { id: "questionnaire", label: "問卷內容管理", route: "/questionnaire", subtitle: "欄位庫、回答格式與問卷版本管理。" },
  { id: "nutrition-rules", label: "計算流程與規則", route: "/nutrition-rules", subtitle: "檢閱 RER、基準能量、活動量、BCS、MER 與每日營養需求的公式及來源。" },
  { id: "recommendation-cases", label: "使用者推薦歷史紀錄", route: "/recommendation-cases", subtitle: "查詢前台使用者每次提交問卷的推薦紀錄與當次結果。" },
  { id: "api-integration", label: "API 管理", route: "/api-integration", subtitle: "查看問卷 API 格式說明與呼叫紀錄。" },
  { id: "api-monitoring", label: "AI Token 用量", route: "/api-monitoring", subtitle: "查看 AI 處理的輸入、輸出與總 Token 用量。" },
  { id: "admins", label: "帳號與權限管理", route: "/admins", subtitle: "登入、帳號管理、角色權限與操作紀錄。" },
];

const members = [
  { id: "M-1024", account: "luna_hsu", name: "許露娜", email: "luna@example.com", phone: "0912-***-821", pets: 2, lastCase: "RC-240813-001", status: "啟用" },
  { id: "M-1023", account: "maxlin", name: "林志明", email: "max@example.com", phone: "0988-***-117", pets: 1, lastCase: "RC-240813-002", status: "啟用" },
  { id: "M-1022", account: "nana", name: "陳娜娜", email: "nana@example.com", phone: "-", pets: 0, lastCase: "-", status: "停用" },
  { id: "M-1021", account: "bear88", name: "黃小熊", email: "bear@example.com", phone: "0922-***-556", pets: 3, lastCase: "RC-240812-011", status: "啟用" },
];

const petProfiles = [
  { id: "P-3101", memberId: "M-1024", pet: "Lucky", owner: "許露娜", species: "dog", breed: "柴犬", age: "12 月", weight: "25 kg", neutered: "已結紮", bcs: "3/9", tags: ["低活動量", "雞肉過敏"], lastSurvey: "官網推薦問卷 v3", lastCase: "RC-240813-001" },
  { id: "P-3102", memberId: "M-1024", pet: "Momo", owner: "許露娜", species: "cat", breed: "米克斯", age: "6 歲", weight: "4.8 kg", neutered: "未結紮", bcs: "5/9", tags: ["排便偏軟", "飲水不足"], lastSurvey: "官網推薦問卷 v3", lastCase: "RC-240813-003" },
  { id: "P-3103", memberId: "M-1023", pet: "Bobo", owner: "林志明", species: "dog", breed: "貴賓", age: "8 歲", weight: "6.2 kg", neutered: "已結紮", bcs: "7/9", tags: ["體重控制", "高齡犬"], lastSurvey: "官網推薦問卷 v3", lastCase: "RC-240813-002" },
];

const admins = [
  { name: "系統管理員", email: "admin@example.com", account: "admin", role: "Super Admin", scope: "全部模組", status: "啟用" },
  { name: "營養師 Joy", email: "nutrition@example.com", account: "nutrition", role: "營養師", scope: "問卷 / 計算規則 / 知識庫", status: "啟用" },
  { name: "工程維運", email: "ops@example.com", account: "ops", role: "工程", scope: "API 管理 / AI Token 用量 / 推薦紀錄", status: "啟用" },
  { name: "客服唯讀", email: "support@example.com", account: "support", role: "唯讀", scope: "推薦紀錄唯讀", status: "停用" },
];

const roles = [
  { id: "super-admin", name: "Super Admin", description: "可管理所有模組、帳號與角色權限。", accounts: 1, status: "啟用", scope: "全部模組" },
  { id: "nutritionist", name: "營養師", description: "維護問卷內容、計算規則與知識庫資料。", accounts: 1, status: "啟用", scope: "問卷 / 計算規則 / 知識庫" },
  { id: "ops", name: "工程", description: "查看 API 管理、AI Token 用量與推薦紀錄。", accounts: 1, status: "啟用", scope: "API 管理 / AI Token 用量 / 推薦紀錄" },
  { id: "readonly", name: "唯讀", description: "只能查看使用者推薦歷史紀錄。", accounts: 1, status: "啟用", scope: "推薦紀錄唯讀" },
];

const rolePermissionProfiles = {
  "super-admin": modules.map((item) => ({ moduleId: item.id, module: item.label, view: true, write: !["api-integration", "api-monitoring", "recommendation-cases"].includes(item.id), del: ["admins", "questionnaire", "rag"].includes(item.id) })),
  nutritionist: modules.map((item) => ({
    moduleId: item.id, module: item.label,
    view: ["questionnaire", "nutrition-rules", "rag", "recommendation-cases"].includes(item.id),
    write: ["questionnaire", "nutrition-rules", "rag"].includes(item.id),
    del: ["questionnaire", "rag"].includes(item.id),
  })),
  ops: modules.map((item) => ({
    moduleId: item.id, module: item.label,
    view: ["api-integration", "recommendation-cases", "api-monitoring", "rag"].includes(item.id),
    write: false,
    del: false,
  })),
  readonly: modules.map((item) => ({
    moduleId: item.id, module: item.label,
    view: item.id === "recommendation-cases",
    write: false,
    del: false,
  })),
};

const apiTypes = [
  { label: "問卷", value: "questionnaire", endpoint: "GET /v1/questionnaire/schema", format: "questionnaire_schema", bindable: "已發布問卷", fields: ["問卷版本", "欄位", "選項", "必填", "排序"] },
];

const publishedApis = [
  { name: "官網目前問卷", type: "問卷", endpoint: "GET /v1/questionnaire/schema", binding: "官網推薦問卷 v3", environment: "production", fields: "5 / 5", status: "啟用", docs: "v1.3", updated: "2026-08-27 09:20" },
  { name: "官網測試問卷", type: "問卷", endpoint: "GET /v1/questionnaire/schema", binding: "營養建議補充問卷", environment: "sandbox", fields: "5 / 5", status: "啟用", docs: "v1.3", updated: "2026-08-26 18:42" },
];

const questionFields = [
  { name: "物種", key: "species", purpose: "基礎生理特徵", type: "single_select", required: true, order: 1, status: "啟用", options: 2, api: "petProfile.species" },
  { name: "品種", key: "breed", purpose: "基礎生理特徵", type: "text", required: false, order: 2, status: "啟用", options: 0, api: "petProfile.breed" },
  { name: "年齡（月）", key: "age_months", purpose: "生命階段判斷", type: "number", required: true, order: 3, status: "啟用", options: 0, api: "petProfile.ageMonths" },
  { name: "體重", key: "weight_kg", purpose: "RER/MER 計算", type: "number", required: true, order: 4, status: "啟用", options: 0, api: "petProfile.weightKg" },
  { name: "BCS 體態評分", key: "bcs_score", purpose: "體態加成規則", type: "single_select", required: true, order: 5, status: "啟用", options: 9, api: "answers.bcsScore" },
  { name: "過敏原", key: "allergens", purpose: "食材排除", type: "multi_select", required: false, order: 6, status: "啟用", options: 8, api: "answers.allergens" },
  { name: "血檢異常", key: "blood_test_flags", purpose: "疾病風險判斷", type: "multi_select", required: false, order: 7, status: "草稿", options: 6, api: "answers.bloodTestFlags" },
  { name: "飼主需求（期望改善效果）", key: "health_goals", purpose: "營養元素調整的飼主需求來源", type: "multi_select", required: true, order: 8, status: "啟用", options: 5, api: "answers.healthGoals" },
];

const optionGroups = [
  { field: "物種", key: "species", species: "犬貓共用", count: 2, options: [["犬", "dog"], ["貓", "cat"]] },
  { field: "BCS 體態評分", key: "bcs_score", species: "犬貓共用", count: 9, options: Array.from({ length: 9 }, (_, i) => [`${i + 1}/9`, String(i + 1)]) },
  { field: "過敏原", key: "allergens", species: "犬貓共用", count: 8, options: [["雞肉", "chicken"], ["牛肉", "beef"], ["乳製品", "dairy"], ["穀物", "grain"]] },
  { field: "排便分類", key: "stool_score", species: "犬貓共用", count: 7, options: [["偏硬", "hard"], ["正常", "normal"], ["偏軟", "soft"], ["水便", "watery"]] },
  { field: "活動量", key: "activity_level", species: "犬", count: 4, options: [["低活動量", "low"], ["中等", "moderate"], ["高活動量", "high"], ["工作犬", "working"]] },
  { field: "血檢異常", key: "blood_test_flags", species: "犬貓共用", count: 6, options: [["腎臟指數", "kidney"], ["肝臟指數", "liver"], ["胰臟指數", "pancreas"], ["血脂偏高", "hyperlipidemia"]] },
  { field: "飼主需求（期望改善效果）", key: "health_goals", species: "犬貓共用", count: 5, options: [["維持目前健康體態", "maintain_health"], ["改善掉毛、毛髮保養", "skin_coat"], ["關節強健、維持好體力", "joint_strength"], ["腸胃調理、改善消化", "digestion"], ["體重管理、減肥", "weight_management"]] },
];

const questionnaires = [
  { name: "官網推薦問卷 v3", version: "official_v3", usage: "官網 production", composition: questionFields.filter(f=>f.status==='啟用').map(f=>({key:f.key,required:f.required,order:f.order})), status: "已發布", updated: "2026-08-27 09:20" },
  { name: "營養建議補充問卷", version: "nutrition_addon_v1", usage: "sandbox 測試", composition: questionFields.slice(0,6).map(f=>({key:f.key,required:f.key!=='bcs_score'&&f.required,order:f.order})), status: "草稿", updated: "2026-08-26 18:42" },
  { name: "高齡犬專用問卷", version: "senior_dog_v1", usage: "尚未開放", composition: questionFields.filter(f=>f.status==='啟用').map(f=>({key:f.key,required:f.key!=='health_goals'&&f.required,order:f.order})), status: "停用", updated: "2026-08-21 11:05" },
];

const nutritionTemplates = [
  { name: "成犬標準模板", species: "dog", stage: "adult", body: "中型犬", mer: "1.6", rer: "70 x kg^0.75", nutrients: "Protein 45g, Fat 13.8g, Ca 1.25g", status: "已確認", source: "dog-nutrition-standard-2026.xlsx", importType: "寵物營養標準", confidence: "高" },
  { name: "高齡犬模板", species: "dog", stage: "senior", body: "全體型", mer: "1.4", rer: "70 x kg^0.75", nutrients: "Protein 52g, Fat 11g, EPA+DHA 0.18g", status: "待確認", source: "senior-dog-guideline.pdf", importType: "寵物營養標準", confidence: "中" },
  { name: "成貓標準模板", species: "cat", stage: "adult", body: "全體型", mer: "1.2", rer: "70 x kg^0.75", nutrients: "Protein 65g, Fat 22.5g, Mg 0.2g", status: "已確認", source: "cat-nutrition-standard-2026.xlsx", importType: "寵物營養標準", confidence: "高" },
  { name: "幼犬成長模板", species: "dog", stage: "puppy", body: "大型犬前期", mer: "2.4", rer: "70 x kg^0.75", nutrients: "Protein 56g, Ca 3g, P 2.5g", status: "需修正", source: "growth-rule-notes.docx", importType: "寵物成長規則", confidence: "低" },
];

const nutritionRules = [
  { code: "NR-AL-001", name: "雞肉過敏排除", group: "過敏原", condition: "allergens contains chicken", action: "exclude ingredient", impact: "排除雞肉與雞肉副產品", priority: 10, status: "啟用" },
  { code: "NR-CKD-002", name: "腎臟風險鈉磷限制", group: "疾病", condition: "blood_test_flags contains kidney", action: "cap nutrients", impact: "Na <= 0.8g, P <= 1.6g", priority: 20, status: "啟用" },
  { code: "NR-ST-004", name: "軟便增加纖維策略", group: "排便", condition: "stool_score in soft,watery", action: "boost nutrient", impact: "Fiber +12%, prebiotic priority", priority: 40, status: "啟用" },
  { code: "NR-BCS-007", name: "BCS 過重熱量下修", group: "體態", condition: "bcs_score = overweight", action: "adjust MER", impact: "MER -15%", priority: 30, status: "啟用" },
  { code: "NR-GOAL-011", name: "皮毛保健配方排序", group: "期望改善", condition: "health_goals contains skin_coat", action: "rank recipe", impact: "Omega-3 rich recipes +25 score", priority: 80, status: "草稿" },
];

const ragFolders = [
  { name: "寵物營養標準", desc: "解析成結構化營養模板與營養素數值", active: true, docs: 12 },
  { name: "寵物成長規則", desc: "解析年齡、體重、生命階段與成長判斷條件", active: false, docs: 8 },
  { name: "營養知識", desc: "進入 RAG 索引，供推薦說明與知識查詢使用", active: false, docs: 24 },
  { name: "疾病知識", desc: "解析疾病、症狀、營養限制與注意事項", active: false, docs: 16 },
  { name: "食材配方知識", desc: "解析食材、過敏、禁忌、替代關係與配方特色", active: false, docs: 31 },
];

const ragDocs = [
  { file: "dog-nutrition-standard-2026.xlsx", type: "Excel", size: "386 KB", category: "寵物營養標準", pipeline: "結構化模板解析", index: "已匯入", chunks: "-", version: "tpl_20260827_a", updated: "2026-08-27 09:10" },
  { file: "growth-rule-notes.docx", type: "DOCX", size: "216 KB", category: "寵物成長規則", pipeline: "規則條件抽取", index: "需人工確認", chunks: "-", version: "rule_20260827_b", updated: "2026-08-27 08:55" },
  { file: "stool-score-fiber.md", type: "Markdown", size: "18 KB", category: "營養知識", pipeline: "RAG 切片索引", index: "已索引", chunks: 52, version: "idx_20260827_a", updated: "2026-08-26 17:20" },
  { file: "ckd-phosphorus-limit.pdf", type: "PDF", size: "1.8 MB", category: "疾病知識", pipeline: "RAG + 限制摘要", index: "處理中", chunks: 64, version: "idx_20260827_a", updated: "2026-08-26 13:48" },
];

const recommendationCases = [
  { id: "RC-240813-001", guestName: "許露娜", email: "luna@example.com", petName: "Lucky", submitted: "2026-08-27 09:32", survey: "官網推薦問卷 v3", status: "完成", template: "成犬標準模板", rules: 4, hits: 9, api: "200" },
  { id: "RC-240813-002", guestName: "林志明", email: "max@example.com", petName: "Bobo", submitted: "2026-08-27 09:18", survey: "官網推薦問卷 v3", status: "完成", template: "高齡犬模板", rules: 6, hits: 11, api: "200" },
  { id: "RC-240813-003", guestName: "許露娜", email: "luna@example.com", petName: "Momo", submitted: "2026-08-27 08:41", survey: "官網推薦問卷 v3", status: "需複核", template: "成貓標準模板", rules: 3, hits: 2, api: "206" },
  { id: "RC-240813-004", guestName: "訪客", email: "guest@example.com", petName: "未命名", submitted: "2026-08-27 08:05", survey: "官網推薦問卷 v2", status: "失敗", template: "-", rules: 0, hits: 0, api: "422" },
];

const apiLogs = [
  { time: "2026-08-27 09:32:18", method: "POST", endpoint: "/v1/recommendations", code: "200", duration: "842 ms", source: "official-site", caseId: "RC-240813-001", error: "-" },
  { time: "2026-08-27 09:31:55", method: "GET", endpoint: "/v1/questionnaire/schema", code: "200", duration: "96 ms", source: "official-site", caseId: "-", error: "-" },
  { time: "2026-08-27 08:41:09", method: "POST", endpoint: "/v1/recommendations", code: "206", duration: "1,284 ms", source: "official-site", caseId: "RC-240813-003", error: "rag_low_confidence" },
  { time: "2026-08-27 08:05:33", method: "POST", endpoint: "/v1/recommendations", code: "422", duration: "121 ms", source: "sandbox", caseId: "RC-240813-004", error: "missing required field: species" },
];

const tokenUsage = [
  { time: "2026-08-27 09:32", model: "gpt-5-mini", purpose: "recommendation_summary", input: "5,420", output: "1,204", total: "6,624", caseId: "RC-240813-001" },
  { time: "2026-08-27 09:18", model: "gpt-5-mini", purpose: "rag_reasoning", input: "8,108", output: "2,880", total: "10,988", caseId: "RC-240813-002" },
  { time: "2026-08-27 08:41", model: "gpt-5-mini", purpose: "low_confidence_explain", input: "3,778", output: "946", total: "4,724", caseId: "RC-240813-003" },
];

const questionnaireSchema = {
  version: "official_v3",
  fields: [
    { key: "species", type: "single_select", required: true, options: ["dog", "cat"] },
    { key: "weight_kg", type: "number", required: true, unit: "kg", min: 0.1, max: 100 },
    { key: "allergens", type: "multi_select", required: false, optionsSource: "allergens" },
  ],
};

const recommendationResponse = {
  caseId: "RC-240813-001",
  status: "completed",
  calculation: { rer: 784, mer: 1098, template: "adult_dog_standard" },
  restrictions: ["exclude_chicken", "reduce_phosphorus"],
  recipes: [{ id: "recipe_102", name: "低敏鮭魚成犬配方", score: 92 }],
};

let memberViewMode = "members";
let selectedMemberId = "M-1024";
let adminViewMode = "accounts";
let selectedRoleId = "nutritionist";
let apiIntegrationMode = "list";
let selectedApiName = "官網目前問卷";
let apiFormatVisible = false;
let questionnaireViewMode = "fields";
let selectedQuestionFieldKey = "blood_test_flags";
let selectedQuestionnaireVersion = "official_v3";
let questionnaireComposeMode = "";
let selectedQuestionnaireFieldKey = "species";
let nutritionTemplateViewMode = "list";
let selectedNutritionTemplateName = "成犬標準模板";
let recommendationCaseViewMode = "list";
let selectedRecommendationCaseId = "RC-240813-001";
let apiMonitoringViewMode = "list";
let apiMonitoringTab = "requests";
let selectedApiLogIndex = 0;

const apiDocs = {
  官網目前問卷: {
    summary: "取得目前 production 對前台開放的問卷 schema。",
    request: { headers: { "x-api-key": "pk_live_****" }, query: { environment: "production" } },
    response: questionnaireSchema,
  },
  官網測試問卷: {
    summary: "取得 sandbox 測試問卷 schema，用於前台 staging 驗證。",
    request: { headers: { "x-api-key": "pk_test_****" }, query: { environment: "sandbox" } },
    response: questionnaireSchema,
  },
  "會員清單 API": {
    summary: "回傳允許欄位範圍內的會員清單。",
    request: { headers: { "x-api-key": "pk_live_****" }, query: { status: "active", page: 1, pageSize: 20 } },
    response: { data: [{ id: "M-1024", name: "許露娜", email: "luna@example.com", petCount: 2, status: "active" }], pagination: { page: 1, pageSize: 20, total: 4 } },
  },
  "寵物資料 API": {
    summary: "回傳允許欄位範圍內的寵物資料清單。",
    request: { headers: { "x-api-key": "pk_test_****" }, query: { species: "dog", page: 1, pageSize: 20 } },
    response: { data: [{ id: "P-3101", memberId: "M-1024", name: "Lucky", species: "dog", weightKg: 25, bcsScore: "3/9" }] },
  },
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusClass(value) {
  if (["啟用", "已發布", "完成", "已索引", "已確認", "已匯入", "200"].includes(String(value))) return "good";
  if (["草稿", "需複核", "處理中", "需人工確認", "待確認", "206"].includes(String(value))) return "warn";
  if (["停用", "失敗", "需修正", "422", "失敗"].includes(String(value))) return "bad";
  return "neutral";
}

function badge(value) {
  return `<span class="status ${statusClass(value)}">${escapeHtml(value)}</span>`;
}

function pill(value, modifier = "") {
  return `<span class="pill ${modifier}">${escapeHtml(value)}</span>`;
}

function tags(values) {
  return values.map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join("");
}

function switchCell(on) {
  return `<button class="switch ${on ? "on" : ""}" type="button" aria-label="${on ? "啟用" : "停用"}"></button>`;
}

function actions({ view = true, edit = true, del = true, more = false, entity = "", key = "" } = {}) {
  return `<div class="row-actions">
    <button class="table-action" type="button" data-record-entity="${entity}" data-record-key="${escapeHtml(key)}" ${view || edit ? "" : "disabled"}>${edit ? "檢視／編輯" : "檢視"}</button>
    <button class="table-action danger" type="button" ${del ? "" : "disabled"}>刪除</button>
    ${more ? `<button class="table-action" type="button">更多</button>` : ""}
  </div>`;
}

function memberTabs(active) {
  return `<div class="tabs" role="tablist" aria-label="會員管理頁籤">
    <button class="tab ${active === "members" ? "active" : ""}" type="button" data-member-tab="members">會員列表</button>
    <button class="tab ${active === "pets" ? "active" : ""}" type="button" data-member-tab="pets">寵物資料</button>
  </div>`;
}

function adminTabs(active) {
  return `<div class="tabs" role="tablist" aria-label="帳號與權限頁籤">
    <button class="tab ${active === "accounts" ? "active" : ""}" type="button" data-admin-tab="accounts">後台帳號</button>
    <button class="tab ${active === "roles" ? "active" : ""}" type="button" data-admin-tab="roles">角色權限</button>
  </div>`;
}

function apiTabs(active) {
  return `<div class="tabs" role="tablist" aria-label="官網 API 串接管理頁籤">
    <button class="tab ${active === "list" ? "active" : ""}" type="button" data-api-mode="list">API 清單</button>
    <button class="tab ${active === "catalog" ? "active" : ""}" type="button" data-api-mode="catalog">可建立 API 內容</button>
  </div>`;
}

function jsonPreview(data) {
  return `<div class="json-box"><pre><code>${escapeHtml(JSON.stringify(data, null, 2))}</code></pre></div>`;
}

function selectOptions(options, current) {
  const uniqueOptions = [...new Set([current, ...options])].filter(Boolean);
  return uniqueOptions.map((option) => `<option ${option === current ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
}

function table(headers, rows, minWidth = 880) {
  return `<div class="table-wrap"><table style="min-width:${minWidth}px"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function metricGrid(items, klass = "") {
  return `<div class="summary-strip ${klass}">${items.map(([label, value, note]) => `<div class="summary-item"><span>${label}</span><strong>${value}</strong><em>${note}</em></div>`).join("")}</div>`;
}

function listHeader({ search, filters = [], button, actionAttr = "" }) {
  return `<div class="list-header">
    <div class="toolbar">
      <input type="search" placeholder="${escapeHtml(search)}" />
      ${filters.map((filter) => `<select aria-label="${escapeHtml(filter.label)}">${filter.options.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}</select>`).join("")}
    </div>
    <button class="primary-button" type="button" ${actionAttr}>${escapeHtml(button)}</button>
  </div>`;
}

function section(title, subtitle, body, badgeText = "") {
  return `<section class="panel">
    <div class="panel-head">
      <div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>
      ${badgeText ? pill(badgeText) : ""}
    </div>
    ${body}
  </section>`;
}

function renderMembers() {
  if (memberViewMode === "detail") return renderMemberDetail();

  const rows = members.map((m) => `<tr>
    <td><strong>${m.id}</strong></td>
    <td>${m.account}</td>
    <td><button class="link-button" type="button" data-member-detail="${m.id}">${m.name}</button></td>
    <td>${m.email}</td>
    <td>${m.phone}</td>
    <td>${m.pets}</td>
    <td><code>${m.lastCase}</code></td>
    <td>${badge(m.status)}</td>
    <td>${actions({ entity: "members", key: m.id, del: m.pets === 0 })}</td>
  </tr>`);
  const petRows = petProfiles.map((pet) => `<tr>
    <td><code>${pet.id}</code></td>
    <td><button class="link-button" type="button" data-member-detail="${pet.memberId}">${pet.owner}</button></td>
    <td><strong>${pet.pet}</strong></td>
    <td><code>${pet.species}</code></td>
    <td>${pet.breed}</td>
    <td>${pet.age}</td>
    <td>${pet.weight}</td>
    <td>${pet.neutered}</td>
    <td>${pet.bcs}</td>
    <td><div class="tag-list">${tags(pet.tags)}</div></td>
    <td>${pet.lastSurvey}</td>
    <td><code>${pet.lastCase}</code></td>
    <td>${actions({ entity: "pets", key: pet.id, del: false })}</td>
  </tr>`);
  const listBody = memberViewMode === "pets"
    ? [
        listHeader({ search: "搜尋寵物名、會員、物種、品種、過敏、疾病", filters: [{ label: "物種", options: ["全部物種", "dog", "cat"] }, { label: "狀態", options: ["全部狀態", "資料完整", "待補資料"] }], button: "+ 新增寵物" }),
        section("寵物資料", "以寵物為查詢視角，點會員姓名可進入會員明細。", table(["寵物 ID", "會員", "寵物名", "物種", "品種", "年齡", "體重", "結紮", "BCS", "標籤", "最近問卷", "最近案例", "操作"], petRows, 1380), "pet list"),
      ].join("")
    : [
        listHeader({ search: "搜尋會員 ID、帳號、姓名、Email、電話", filters: [{ label: "狀態", options: ["全部狀態", "啟用", "停用"] }], button: "+ 新增會員" }),
        section("會員列表", "點擊會員姓名後進入會員明細，查看基本資料、寵物清單與案例紀錄。", table(["會員 ID", "帳號", "姓名", "Email", "連絡電話", "寵物數", "最近案例", "狀態", "操作"], rows), "保留原模組"),
      ].join("");
  return [
    metricGrid([["會員數", "4", "demo records"], ["寵物數", "6", "含已停用會員"], ["今日案例", "12", "推薦流程產生"], ["待補資料", "2", "缺血檢或過敏資訊"]]),
    memberTabs(memberViewMode),
    listBody,
  ].join("");
}

function renderMemberDetail() {
  const selectedMember = members.find((item) => item.id === selectedMemberId) || members[0];
  const selectedPets = petProfiles.filter((pet) => pet.memberId === selectedMember.id);
  const selectedCases = recommendationCases.filter((item) => item.memberId === selectedMember.id);
  const petRows = selectedPets.map((pet) => `<tr>
    <td><code>${pet.id}</code></td>
    <td><strong>${pet.pet}</strong></td>
    <td><code>${pet.species}</code></td>
    <td>${pet.breed}</td>
    <td>${pet.age}</td>
    <td>${pet.weight}</td>
    <td>${pet.neutered}</td>
    <td>${pet.bcs}</td>
    <td><div class="tag-list">${tags(pet.tags)}</div></td>
    <td>${pet.lastSurvey}</td>
    <td><code>${pet.lastCase}</code></td>
    <td>${actions({ entity: "pets", key: pet.id, del: false })}</td>
  </tr>`);
  const caseRows = selectedCases.map((item) => `<tr>
    <td><code>${item.id}</code></td>
    <td>${item.submitted}</td>
    <td>${item.survey}</td>
    <td>${badge(item.status)}</td>
    <td>${item.template}</td>
    <td>${item.rules}</td>
    <td>${item.hits}</td>
    <td>${badge(item.api)}</td>
    <td>${actions({ entity: "cases", key: item.id, edit: false, del: false })}</td>
  </tr>`);
  const detail = `<div class="member-detail">
    <div class="member-detail-head">
      <div>
        <button class="link-button detail-back" type="button" data-member-tab="members">返回會員列表</button>
        <h2>${selectedMember.name}</h2>
        <p>${selectedMember.id} · ${selectedMember.account} · ${selectedMember.email}</p>
      </div>
      <div class="split-actions">
        <button class="secondary-button" type="button">新增寵物</button>
        <button class="secondary-button" type="button">查看全部案例</button>
      </div>
    </div>
    <dl class="detail-summary">
      <div><dt>連絡電話</dt><dd>${selectedMember.phone}</dd></div>
      <div><dt>會員狀態</dt><dd>${badge(selectedMember.status)}</dd></div>
      <div><dt>寵物數</dt><dd>${selectedPets.length}</dd></div>
      <div><dt>最近案例</dt><dd><code>${selectedMember.lastCase}</code></dd></div>
    </dl>
  </div>`;
  return [
    detail,
    section("寵物清單", "會員明細中直接檢視該會員底下所有寵物。", table(["寵物 ID", "寵物名", "物種", "品種", "年齡", "體重", "結紮", "BCS", "標籤", "最近問卷", "最近案例", "操作"], petRows, 1280), "member pets"),
    section("最近推薦案例", "用來追蹤該會員曾送出的問卷與推薦結果。", table(["案例 ID", "提交時間", "問卷版本", "狀態", "套用模板", "規則數", "RAG 命中", "API", "操作"], caseRows, 1080), "case history"),
  ].join("");
}

function renderAdmins() {
  if (adminViewMode === "role-detail") return renderRoleDetail();

  const accountRows = admins.map((a) => `<tr>
    <td><strong>${a.name}</strong></td>
    <td>${a.email}</td>
    <td>${a.account}</td>
    <td>${a.role}</td>
    <td>${a.scope}</td>
    <td>${badge(a.status)}</td>
    <td>${actions({ entity: "admins", key: a.account, del: a.role !== "Super Admin" })}</td>
  </tr>`);
  const roleRows = roles.map((role) => `<tr>
    <td><button class="link-button" type="button" data-role-detail="${role.id}">${role.name}</button></td>
    <td>${role.description}</td>
    <td>${role.scope}</td>
    <td>${role.accounts}</td>
    <td>${badge(role.status)}</td>
    <td>${actions({ entity: "roles", key: role.id, del: role.id !== "super-admin" })}</td>
  </tr>`);
  const body = adminViewMode === "roles"
    ? [
        listHeader({ search: "搜尋角色名稱、權限範圍", filters: [{ label: "狀態", options: ["全部狀態", "啟用", "停用"] }], button: "+ 新增角色" }),
        section("角色清單", "帳號套用角色；點擊角色名稱後進入角色明細並編輯模組權限。", table(["角色", "說明", "權限範圍", "套用帳號數", "狀態", "操作"], roleRows, 980), "roles"),
      ].join("")
    : [
        listHeader({ search: "搜尋姓名、Email、帳號、角色", filters: [{ label: "角色", options: ["全部角色", "Super Admin", "營養師", "工程", "唯讀"] }], button: "+ 新增帳號" }),
        section("後台帳號", "進入此頁先看到目前所有後台帳號；帳號透過角色取得權限。", table(["姓名", "Email", "帳號", "角色", "權限摘要", "狀態", "操作"], accountRows), "accounts"),
      ].join("");
  return [
    adminTabs(adminViewMode),
    body,
  ].join("");
}

function renderRoleDetail() {
  const selectedRole = roles.find((role) => role.id === selectedRoleId) || roles[0];
  const selectedPermissions = rolePermissionProfiles[selectedRole.id] || [];
  const permissionRows = selectedPermissions.map((p) => `<tr>
    <td><strong>${p.module}</strong></td>
    <td>${switchCell(p.view)}</td>
    <td>${switchCell(p.write)}</td>
    <td>${switchCell(p.del)}</td>
  </tr>`);
  return [
    `<div class="member-detail">
      <div class="member-detail-head">
        <div>
          <button class="link-button detail-back" type="button" data-admin-tab="roles">返回角色清單</button>
          <h2>${selectedRole.name}</h2>
          <p>${selectedRole.description}</p>
        </div>
        <div class="split-actions">
          <button class="primary-button" type="button">儲存角色權限</button>
          <button class="secondary-button" type="button">複製成新角色</button>
        </div>
      </div>
      <dl class="detail-summary role-summary">
        <div><dt>角色名稱</dt><dd>${selectedRole.name}</dd></div>
        <div><dt>套用帳號</dt><dd>${selectedRole.accounts}</dd></div>
        <div><dt>狀態</dt><dd>${badge(selectedRole.status)}</dd></div>
        <div><dt>權限範圍</dt><dd>${selectedRole.scope}</dd></div>
      </dl>
    </div>`,
    section("模組權限", "角色權限以模組為單位設定進入、寫入與刪除。", table(["模組", "進入頁面", "新增 / 編輯", "刪除"], permissionRows, 760), "RBAC"),
  ].join("");
}

function renderApiIntegration() {
  if (apiIntegrationMode === "create") return renderCreateApi();
  if (apiIntegrationMode === "edit") return renderEditApi();

  const rows = publishedApis.map((api) => `<tr>
    <td><button class="link-button" type="button" data-api-edit="${api.name}">${api.name}</button><br><span class="muted-text">${api.type}</span></td>
    <td><code>${api.endpoint}</code></td>
    <td>${api.binding}</td>
    <td>${api.environment}</td>
    <td>${api.fields}</td>
    <td>${api.docs}</td>
    <td>${api.updated}</td>
    <td>${badge(api.status)}</td>
    <td><div class="row-actions">
      <button class="table-action" type="button" data-api-edit="${api.name}">編輯</button>
      <button class="table-action danger" type="button" ${api.status === "啟用" ? "disabled" : ""}>刪除</button>
      <button class="table-action" type="button">更多</button>
    </div></td>
  </tr>`);
  const typeRows = apiTypes.map((type) => `<tr>
    <td><strong>${type.label}</strong><br><span class="muted-text">${type.format}</span></td>
    <td><code>${type.endpoint}</code></td>
    <td>${type.bindable}</td>
    <td><div class="tag-list">${tags(type.fields)}</div></td>
  </tr>`);
  const body = apiIntegrationMode === "catalog"
    ? [
        section("可建立的 API 內容", "下列項目是開發時已設計好的格式；建立 API 時只能從這些內容中選擇。", table(["API 內容", "預設 Endpoint", "可綁定資料", "可回傳欄位"], typeRows, 1180), "predefined"),
      ].join("")
    : [
        listHeader({ search: "搜尋 API 名稱、內容類型、Endpoint、綁定資料", filters: [{ label: "API 內容", options: ["全部內容", "問卷", "會員清單", "寵物資料", "推薦案例", "推薦結果查詢"] }, { label: "狀態", options: ["全部狀態", "啟用", "草稿", "停用"] }], button: "+ 建立 API", actionAttr: 'data-api-mode="create"' }),
        section("已建立 API", "後台人員從預先設計好的 API 內容類型建立 API，並決定是否開放給前台。", table(["API 名稱", "Endpoint", "綁定資料", "環境", "回傳欄位", "文件版本", "最後更新", "狀態", "操作"], rows, 1220), "open APIs"),
      ].join("");
  return [
    metricGrid([["已建立 API", "4", "含 production / sandbox"], ["已設計格式", "5", "開發預先定義"], ["已開放", "2", "目前前台可用"], ["草稿/停用", "2", "尚未對外"]]),
    apiTabs(apiIntegrationMode),
    body,
  ].join("");
}

function renderApiForm(mode, api = publishedApis[0]) {
  const isEdit = mode === "edit";
  const doc = apiDocs[api.name] || apiDocs["官網目前問卷"];
  const formatPanel = apiFormatVisible
    ? `<div class="api-format-panel">
        ${section("Request 格式", "前台呼叫此 API 時需要帶入的 headers、query 或 body。", jsonPreview(doc.request), "request")}
        ${section("Response 格式", "此 API 目前開放給前台的回傳格式與欄位。", jsonPreview(doc.response), "response")}
      </div>`
    : "";
  return [
    `<div class="detail-toolbar">
      <button class="secondary-button" type="button" data-api-mode="list">返回 API 清單</button>
    </div>`,
    `<div class="member-detail">
      <div class="member-detail-head">
        <div>
          <h2>${isEdit ? "編輯 API" : "建立 API"}</h2>
          <p>${isEdit ? "調整此 API 的綁定資料、環境、開放狀態與回傳欄位。" : "建立時選擇綁定資料來源，系統會套用對應 API 格式。"}</p>
        </div>
        <div class="split-actions">
          <button class="primary-button" type="button">${isEdit ? "儲存變更" : "儲存 API"}</button>
          <button class="secondary-button" type="button" data-api-mode="list">取消</button>
        </div>
      </div>
    </div>`,
    section("API 基本設定", "選擇綁定資料來源後，系統會依資料來源套用已設計好的 endpoint、request 與 response 格式。", `<div class="form-grid">
      <label>API 名稱<input value="${api.name}" /></label>
      <label>使用環境<select><option ${api.environment === "production" ? "selected" : ""}>production</option><option ${api.environment === "sandbox" ? "selected" : ""}>sandbox</option></select></label>
      <label>開放狀態<select><option ${api.status === "啟用" ? "selected" : ""}>啟用</option><option ${api.status === "草稿" ? "selected" : ""}>草稿</option><option ${api.status === "停用" ? "selected" : ""}>停用</option></select></label>
      <label>允許回傳欄位<input value="${api.fields}" /></label>
      <label class="wide">綁定資料來源<select><option ${api.binding === "官網推薦問卷 v3" ? "selected" : ""}>官網推薦問卷 v3</option><option ${api.binding === "營養建議補充問卷" ? "selected" : ""}>營養建議補充問卷</option><option ${api.binding === "會員管理" ? "selected" : ""}>會員管理</option><option ${api.binding === "會員/寵物資料" ? "selected" : ""}>會員/寵物資料</option><option ${api.binding === "使用者推薦歷史紀錄" ? "selected" : ""}>使用者推薦歷史紀錄</option></select></label>
    </div>`, "create"),
    section("API 格式", "系統會依綁定資料來源套用 API 格式；點擊後在下方顯示 Swagger-style request / response。", `<div class="format-action">
      <span>目前綁定資料來源：${api.binding}</span>
      <button class="secondary-button" type="button" data-api-format="${api.name}">API 格式說明</button>
    </div>${formatPanel}`, "format"),
  ].join("");
}

function renderCreateApi() {
  return renderApiForm("create", { name: "官網目前問卷", binding: "官網推薦問卷 v3", environment: "production", fields: "依資料來源自動帶入，可再勾選允許欄位", status: "啟用" });
}

function renderEditApi() {
  const api = publishedApis.find((item) => item.name === selectedApiName) || publishedApis[0];
  return renderApiForm("edit", api);
}

function questionnaireTabs(active) {
  const tabs = [
    ["fields", "欄位庫"],
    ["versions", "問卷版本"],
  ];
  return `<div class="tabs" role="tablist">
    ${tabs.map(([id, label]) => `<button class="tab ${active === id ? "active" : ""}" type="button" data-questionnaire-tab="${id}">${label}</button>`).join("")}
  </div>`;
}

function renderQuestionnaireFields() {
  const rows = questionFields.map((f) => `<tr>
    <td><div class="cell-main"><button class="link-button" type="button" data-question-field="${f.key}">${f.name}</button><span class="muted-text">${f.purpose}</span></div></td>
    <td><code>${f.key}</code></td>
    <td>${f.type}</td>
    <td>${f.required ? "必填" : "選填"}</td>
    <td>${f.order}</td>
    <td>${f.options}</td>
    <td><code>${f.api}</code></td>
    <td>${badge(f.status)}</td>
    <td><div class="row-actions">
      <button class="table-action" type="button" data-question-field="${f.key}">檢視／編輯</button>
      <button class="table-action danger" type="button" ${f.status !== "啟用" ? "" : "disabled"}>刪除</button>
      <button class="table-action" type="button">更多</button>
    </div></td>
  </tr>`);
  return [
    `<section class="notice"><strong>規格重點</strong><p>後台人員可自訂欄位、API Key、回答格式與選項，再組成問卷。這裡的 API Key 是欄位代碼（例如 species），不是串接驗證金鑰；已串接欄位變更代碼或格式時，需同步確認官網與推薦規則。</p></section>`,
    listHeader({ search: "搜尋欄位名稱、API Key、回答格式", filters: [{ label: "回答格式", options: ["全部格式", "輸入框", "數字", "下拉選單", "單選", "多選", "滑桿"] }, { label: "狀態", options: ["全部狀態", "啟用", "草稿", "停用"] }], button: "+ 新增欄位", actionAttr: 'data-question-field="new"' }),
    section("欄位庫", "先定義可重用欄位、回答格式與 payload key，再供問卷版本挑選組合。", table(["欄位名稱", "API Key", "回答格式", "必填", "排序", "選項數", "Payload path", "狀態", "操作"], rows, 1080), "schema source"),
  ].join("");
}

function renderQuestionFieldDetail() {
  const fallback = { name: "血檢異常", key: "blood_test_flags", purpose: "疾病風險判斷", type: "multi_select", required: false, order: 7, status: "草稿", options: 6, api: "answers.bloodTestFlags" };
  const field = selectedQuestionFieldKey === "new"
    ? fallback
    : questionFields.find((item) => item.key === selectedQuestionFieldKey) || fallback;
  const group = optionGroups.find((item) => item.key === field.key);
  const formatLabel = field.type === "multi_select" ? "多選" : field.type === "single_select" ? "單選" : field.type === "number" ? "數字" : field.type === "slider" ? "滑桿" : "輸入框";
  const detailOptionRows = group
    ? group.options.map(([label, value], index) => `<tr>
      <td>${label}</td>
      <td><code>${value}</code></td>
      <td>${value}.png</td>
      <td>${label} 對應推薦規則與前台提示文案</td>
      <td>${switchCell(index !== group.options.length - 1 || group.count < 5)}</td>
      <td>${actions({ del: false })}</td>
    </tr>`)
    : [`<tr><td colspan="6"><span class="muted-text">此回答格式不需要選項內容。</span></td></tr>`];
  return [
    `<div class="detail-toolbar">
      <button class="secondary-button" type="button" data-questionnaire-tab="fields">返回欄位庫</button>
    </div>`,
    `<div class="member-detail">
      <div class="member-detail-head">
        <div>
          <h2>${selectedQuestionFieldKey === "new" ? "新增欄位" : "欄位明細"}</h2>
          <p>欄位設定與選項內容放在同一個明細頁，列表頁只保留搜尋、篩選與操作入口。</p>
        </div>
        <div class="split-actions">
          <button class="primary-button" type="button">${selectedQuestionFieldKey === "new" ? "儲存欄位" : "儲存變更"}</button>
          <button class="secondary-button" type="button" data-questionnaire-tab="fields">取消</button>
        </div>
      </div>
    </div>`,
    section("欄位基本設定", "先定義此題目的用途、回答格式與 payload key。", `<div class="form-grid">
      <label>欄位名稱<input value="${field.name}" /></label>
      <label>API Key（欄位代碼）<input value="${field.key}" /></label>
      <label>欄位用途<select>${selectOptions(["基礎生理特徵", "生命階段判斷", "RER/MER 計算", "體態加成規則", "食材排除", "疾病風險判斷", "推薦排序與 RAG 查詢"], field.purpose)}</select></label>
      <label>回答格式<select>${selectOptions(["輸入框", "數字", "下拉選單", "單選", "多選", "滑桿"], formatLabel)}</select></label>
      <label>是否必填<select>${selectOptions(["是", "否"], field.required ? "是" : "否")}</select></label>
      <label>排序<input type="number" value="${field.order}" /></label>
      <label>狀態<select>${selectOptions(["啟用", "草稿", "停用"], field.status)}</select></label>
      <label class="wide">前台提示<input value="${field.name === "血檢異常" ? "可上傳或勾選最近一次血檢異常項目" : `${field.name} 的前台說明文字`}" /></label>
    </div>`, "field form"),
    section("選項內容", "回答格式為下拉、單選或多選時，在這裡維護選項標題、圖片、說明文字與後端 value。", `<div class="section-toolbar"><button class="primary-button" type="button">+ 新增選項</button></div>${table(["選項標題", "API 值", "圖片", "說明文字", "啟用", "操作"], detailOptionRows, 980)}`, "option content"),
  ].join("");
}

function renderQuestionnaireVersions() {
  const rows = questionnaires.map((item) => `<tr>
    <td><button class="link-button" type="button" data-questionnaire-version="${item.version}">${item.name}</button><br><span class="muted-text">${item.version}</span></td>
    <td>${item.composition?.length||0}</td>
    <td>${item.composition?.filter(f=>f.required).length||0}</td>
    <td>${badge(item.status)}</td>
    <td>${item.updated}</td>
    <td><div class="row-actions">
      <button class="table-action" type="button" data-questionnaire-version="${item.version}">檢視／編輯</button>
      <button class="table-action danger" type="button" ${item.status !== "已發布" ? "" : "disabled"}>刪除</button>
      <button class="table-action" type="button">更多</button>
    </div></td>
  </tr>`);
  return [
    listHeader({ search: "搜尋問卷名稱、版本", filters: [{ label: "狀態", options: ["全部狀態", "已發布", "草稿", "停用"] }], button: "+ 建立問卷", actionAttr: 'data-questionnaire-version="new"' }),
    section("問卷版本", "一份問卷由欄位庫中的欄位組合而成，可依不同前台情境建立不同版本。", table(["問卷名稱", "欄位數", "必填數", "狀態", "最後更新", "操作"], rows, 980), "questionnaire versions"),
  ].join("");
}

function renderQuestionnaireComposeEditor() {
  if (questionnaireComposeMode !== "add") return "";
  const field = questionFields.find((item) => item.key === selectedQuestionnaireFieldKey) || questionFields[0];
  return section("加入欄位", "從欄位庫選擇一個欄位加入這份問卷。", `<div class="form-grid">
    <label>使用欄位<select>${questionFields.map((item) => `<option ${item.key === field.key ? "selected" : ""}>${escapeHtml(item.name)} (${escapeHtml(item.key)})</option>`).join("")}</select></label>
    <label>排序<input type="number" value="${field.order}" /></label>
    <label>本問卷必填<select>${selectOptions(["是", "否"], field.required ? "是" : "否")}</select></label>
    <label>回答格式<input value="${field.type}" /></label>
  </div>
  <div class="button-row">
    <button class="primary-button" type="button">加入到問卷</button>
    <button class="secondary-button" type="button" data-compose-mode="clear">取消</button>
  </div>`, "add field");
}

function renderQuestionnaireOptionModal() {
  if (questionnaireComposeMode !== "edit") return "";
  const field = questionFields.find((item) => item.key === selectedQuestionnaireFieldKey) || questionFields[0];
  const optionGroup = optionGroups.find((group) => group.key === field.key);
  const optionRows = optionGroup
    ? optionGroup.options.map(([label, value], index) => `<tr>
      <td>${label}</td>
      <td><code>${value}</code></td>
      <td>${value}.png</td>
      <td>${label} 對應推薦規則與前台提示文案</td>
      <td>${switchCell(index !== optionGroup.options.length - 1 || optionGroup.count < 5)}</td>
    </tr>`)
    : [`<tr><td colspan="5"><span class="muted-text">${field.name} 是 ${field.type}，沒有可開放的選項。</span></td></tr>`];
  return `<div class="modal-backdrop" role="presentation">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="option-scope-title">
      <div class="modal-head">
        <div>
          <h2 id="option-scope-title">本問卷開放選項</h2>
          <p>針對「${field.name}」既有的選項，決定是否在這份問卷中開放給前台。</p>
        </div>
        <button class="secondary-button" type="button" data-compose-mode="clear">關閉</button>
      </div>
      <div class="form-grid">
        <label>使用欄位<input value="${field.name}" /></label>
        <label>API Key（欄位代碼）<input value="${field.key}" /></label>
        <label>回答格式<input value="${field.type}" /></label>
        <label>本問卷必填<select>${selectOptions(["是", "否"], field.required ? "是" : "否")}</select></label>
      </div>
      ${table(["選項標題", "API 值", "圖片", "說明文字", "本問卷開放"], optionRows, 900)}
      <div class="modal-actions">
        <button class="primary-button" type="button" data-compose-mode="clear">套用開放設定</button>
        <button class="secondary-button" type="button" data-compose-mode="clear">取消</button>
      </div>
    </section>
  </div>`;
}

function renderQuestionnaireVersionDetail() {
  const fallback = { name: "新問卷版本", version: "draft_v1", usage: "尚未開放", fields: 0, required: 0, status: "草稿", updated: "尚未儲存" };
  const questionnaire = selectedQuestionnaireVersion === "new"
    ? fallback
    : questionnaires.find((item) => item.version === selectedQuestionnaireVersion) || questionnaires[0];
  const selectedRows = questionFields.slice(0, 6).map((f, index) => `<tr>
    <td>${index + 1}</td>
    <td><strong>${f.name}</strong><br><span class="muted-text"><code>${f.key}</code></span></td>
    <td>${f.type}</td>
    <td>${f.required ? switchCell(true) : switchCell(false)}</td>
    <td>${f.purpose}</td>
    <td><div class="row-actions">
      <button class="table-action" type="button" data-compose-edit="${f.key}">檢視／編輯</button>
      <button class="table-action danger" type="button">刪除</button>
    </div></td>
  </tr>`);
  return [
    `<div class="member-detail">
      <div class="member-detail-head">
        <div>
          <button class="link-button detail-back" type="button" data-questionnaire-tab="versions">返回問卷版本</button>
          <h2>${selectedQuestionnaireVersion === "new" ? "建立問卷" : questionnaire.name}</h2>
          <p>設定問卷名稱、版本代碼、狀態與使用欄位。</p>
        </div>
        <div class="split-actions">
          <button class="primary-button" type="button">${selectedQuestionnaireVersion === "new" ? "儲存問卷" : "儲存變更"}</button>
          <button class="secondary-button" type="button" data-questionnaire-tab="versions">取消</button>
        </div>
      </div>
    </div>`,
    section("問卷基本設定", "建立或編輯問卷時可調整名稱、版本代碼與問卷狀態。", `<div class="form-grid">
      <label>問卷名稱<input value="${questionnaire.name}" /></label>
      <label>版本代碼<input value="${questionnaire.version}" /></label>
      <label>問卷狀態<select>${selectOptions(["草稿", "已發布", "停用"], questionnaire.status)}</select></label>
      <label class="wide">問卷說明<input value="${questionnaire.name} 的前台問卷用途與內部備註" /></label>
    </div>`, "questionnaire form"),
    section("問卷欄位組合", "建立問卷時選擇要使用哪些欄位、調整排序，並可覆寫該版本的必填設定。", `<div class="section-toolbar"><button class="primary-button" type="button" data-compose-mode="add">+ 加入欄位</button></div>${renderQuestionnaireComposeEditor()}${table(["排序", "使用欄位", "回答格式", "本問卷必填", "用途", "操作"], selectedRows, 1040)}`, "compose"),
    renderQuestionnaireOptionModal(),
  ].join("");
}

function renderQuestionnaire() {
  if (questionnaireViewMode === "field-detail") return renderQuestionFieldDetail();
  if (questionnaireViewMode === "version-detail") return renderQuestionnaireVersionDetail();

  const body = questionnaireViewMode === "versions"
    ? renderQuestionnaireVersions()
    : renderQuestionnaireFields();
  return [
    metricGrid([["已發布問卷", "1", "production 可用"], ["草稿問卷", "1", "待確認欄位"], ["欄位完整度", "7 / 8", "含選項與 payload key"], ["API 綁定", "2", "production / sandbox"]]),
    questionnaireTabs(questionnaireViewMode),
    body,
  ].join("");
}

function renderNutritionTemplates() {
  if (nutritionTemplateViewMode === "detail") return renderNutritionTemplateDetail();
  const rows = nutritionTemplates.map((t) => `<tr>
    <td><button class="link-button" type="button" data-template-detail="${t.name}">${t.name}</button></td>
    <td><code>${t.species}</code></td>
    <td>${t.stage}</td>
    <td>${t.body}</td>
    <td>${t.importType}</td>
    <td><strong>${t.source}</strong><br><span class="muted-text">AI 信心：${t.confidence}</span></td>
    <td>${t.nutrients}</td>
    <td>${badge(t.status)}</td>
    <td><div class="row-actions">
      <button class="table-action" type="button" data-template-detail="${t.name}">檢視</button>
      <button class="table-action" type="button" data-template-detail="${t.name}">確認</button>
      <button class="table-action" type="button">更多</button>
    </div></td>
  </tr>`);
  return [
    `<section class="notice"><strong>匯入方式</strong><p>營養標準模板不在此頁手動新增；請到「知識庫與檔案匯入管理」上傳檔案，選擇資料類型後由 AI 解析產生模板，再回到此頁確認版本。</p></section>`,
    listHeader({ search: "搜尋模板、來源檔案、物種、生命階段", filters: [{ label: "物種", options: ["全部物種", "dog", "cat"] }, { label: "狀態", options: ["全部狀態", "已確認", "待確認", "需修正"] }, { label: "資料類型", options: ["全部類型", "寵物營養標準", "寵物成長規則"] }], button: "前往檔案匯入", actionAttr: 'data-open-rag="true"' }),
    section("已解析模板版本", "這裡只檢視與確認 AI 從檔案解析出的營養模板，作為推薦計算基準。", table(["模板名稱", "物種", "生命階段", "體型分類", "資料類型", "來源檔案", "營養素摘要", "狀態", "操作"], rows, 1180), "imported templates"),
  ].join("");
}

function renderNutritionTemplateDetail() {
  const fallback = { name: "新營養模板", species: "dog", stage: "adult", body: "全體型", mer: "1.6", rer: "70 x kg^0.75", nutrients: "Protein, Fat, Ca/P", status: "待確認", source: "uploaded-file.xlsx", importType: "寵物營養標準", confidence: "中" };
  const template = selectedNutritionTemplateName === "new"
    ? fallback
    : nutritionTemplates.find((item) => item.name === selectedNutritionTemplateName) || nutritionTemplates[0];
  return [
    `<div class="detail-toolbar">
      <button class="secondary-button" type="button" data-template-mode="list">返回模板清單</button>
    </div>`,
    `<div class="member-detail">
      <div class="member-detail-head">
        <div>
          <h2>${template.name}</h2>
          <p>${template.source} · ${template.importType} · AI 信心：${template.confidence}</p>
        </div>
        <div class="split-actions">
          <button class="primary-button" type="button">確認匯入結果</button>
          <button class="secondary-button" type="button" data-template-mode="list">取消</button>
        </div>
      </div>
      <dl class="detail-summary role-summary">
        <div><dt>物種</dt><dd><code>${template.species}</code></dd></div>
        <div><dt>生命階段</dt><dd>${template.stage}</dd></div>
        <div><dt>來源檔案</dt><dd>${template.source}</dd></div>
        <div><dt>狀態</dt><dd>${badge(template.status)}</dd></div>
      </dl>
    </div>`,
    section("AI 解析結果", "確認系統從來源檔案辨識出的基礎熱量係數、RER 公式與營養素摘要。", `<div class="form-grid">
      <label>模板名稱<input value="${template.name}" /></label>
      <label>物種<input value="${template.species}" /></label>
      <label>生命階段<input value="${template.stage}" /></label>
      <label>體型分類<input value="${template.body}" /></label>
      <label>MER 係數<input value="${template.mer}" /></label>
      <label>RER 公式<input value="${template.rer}" /></label>
      <label>資料類型<input value="${template.importType}" /></label>
      <label>AI 信心<input value="${template.confidence}" /></label>
      <label class="wide">營養素摘要<textarea>${template.nutrients}</textarea></label>
      <label class="wide">人工確認備註<textarea>${template.status === "需修正" ? "大型犬前期年齡範圍需由營養師確認。" : "解析結果可直接確認匯入。"}</textarea></label>
    </div>`, "template detail"),
  ].join("");
}

function renderNutritionRules() {
  const rows = nutritionRules.map((r) => `<tr><td><code>${r.code}</code></td><td><strong>${r.name}</strong></td><td>${r.group}</td><td><code>${r.condition}</code></td><td>${r.action}</td><td>${r.impact}</td><td>${r.priority}</td><td>${badge(r.status)}</td><td>${actions({ entity: "rules", key: r.code, more: true })}</td></tr>`);
  return [
    `<div class="module-summary">
      ${section("規則測試輸入", "用 mock 條件測試命中規則與計算結果。", `<div class="sandbox-grid">
        <label>物種<select><option>dog</option><option>cat</option></select></label>
        <label>體重<input type="number" value="25" /></label>
        <label>BCS<select><option>overweight</option><option>ideal</option></select></label>
        <label>過敏原<select><option>chicken</option><option>beef</option></select></label>
      </div><div class="button-row"><button class="primary-button" type="button">執行規則測試</button><button class="secondary-button" type="button">查看 trace</button></div>`, "sandbox")}
      ${section("測試結果", "", metricGrid([["RER", "784", "kcal/day"], ["MER", "666", "-15% after BCS"], ["命中規則", "2", "allergen + BCS"]], "three"), "explainable")}
    </div>`,
    listHeader({ search: "搜尋規則名稱、條件、影響項目", filters: [{ label: "規則分類", options: ["全部分類", "過敏原", "疾病", "排便", "體態", "期望改善"] }, { label: "狀態", options: ["全部狀態", "啟用", "草稿"] }], button: "+ 新增營養規則" }),
    section("營養規則列表", "依使用者問卷資料調整營養需求、限制條件與推薦排序。", table(["代碼", "規則名稱", "分類", "觸發條件", "動作", "影響", "優先", "狀態", "操作"], rows, 1180), "rule engine"),
  ].join("");
}

function renderRag() {
  const folders = ragFolders.map((f) => `<button class="folder ${f.active ? "active" : ""}" type="button">
    <div class="folder-head"><strong>${f.name}</strong>${pill(`${f.docs} 件`)}</div>
    <span>${f.desc}</span>
  </button>`).join("");
  const rows = ragDocs.map((d) => `<tr>
    <td><strong>${d.file}</strong><br><span class="muted-text">${d.size}</span></td>
    <td>${d.category}</td>
    <td>${d.type}</td>
    <td>${d.pipeline}</td>
    <td>${badge(d.index)}</td>
    <td>${d.chunks}</td>
    <td><code>${d.version}</code></td>
    <td>${d.updated}</td>
    <td>${actions({ entity: "docs", key: d.file, del: d.index !== "處理中", more: true })}</td>
  </tr>`);
  const uploadPanel = `<div class="form-grid">
    <label class="wide">檔案<input type="file" /></label>
    <label>資料類型 / 解析類型<select>${selectOptions(["寵物營養標準", "寵物成長規則", "營養知識", "疾病知識", "食材配方知識", "推薦依據文件"], "寵物營養標準")}</select></label>
    <label>適用物種<select>${selectOptions(["犬", "貓", "犬貓共用", "不限"], "犬貓共用")}</select></label>
    <label>處理用途<select>${selectOptions(["結構化匯入", "RAG 知識檢索", "兩者皆是"], "結構化匯入")}</select></label>
    <label>版本 / 來源日期<input value="2026_v1" /></label>
    <label class="wide">來源說明<input value="AAFCO / FEDIAF / 內部營養師文件 / 品牌配方資料" /></label>
  </div>
  <div class="button-row">
    <button class="primary-button" type="button">上傳並開始 AI 解析</button>
    <button class="secondary-button" type="button">儲存為待處理</button>
  </div>`;
  return [
    metricGrid([["匯入檔案", "91", "5 種資料類型"], ["結構化匯入", "20", "模板 / 規則"], ["RAG 已索引", "68", "idx_20260827_a"], ["待人工確認", "3", "解析結果需檢查"]]),
    section("上傳檔案", "先選資料類型，系統會依類型套用不同的 AI 解析流程。", uploadPanel, "AI import"),
    `<div class="rag-layout">
      ${section("資料類型", "資料類型會決定 AI pipeline 與後續流向。", `<div class="folder-list">${folders}</div><div class="button-row"><button class="ghost-button" type="button">管理資料類型</button></div>`)}
      ${section("檔案處理紀錄", "所有檔案都集中在這裡上傳、解析、索引與追蹤狀態。", `<div class="toolbar"><input type="search" placeholder="搜尋檔案名稱、資料類型或 pipeline" /><select><option>全部狀態</option><option>已匯入</option><option>已索引</option><option>需人工確認</option><option>處理中</option><option>失敗</option></select></div>${table(["檔案名稱", "資料類型", "格式", "AI 解析流程", "狀態", "Chunk", "版本", "更新時間", "操作"], rows, 1240)}`, "import log")}
    </div>`,
    section("RAG 查詢測試", "只針對已進入 RAG 索引的營養知識、疾病知識與推薦依據測試命中內容。", `<div class="split-layout">
      <div class="form-grid two">
        <label>查詢條件<textarea>dog, senior, chicken allergy, overweight, digestion improvement</textarea></label>
        <label>限制條件<textarea>exclude chicken; MER -15%; prefer high fiber recipe</textarea></label>
      </div>
      <div class="json-box"><pre><code>Top hits
1. recipe-rule-senior-dog.md / chunk 42 / score 0.91
2. stool-score-fiber.md / chunk 8 / score 0.86
3. ckd-phosphorus-limit.pdf / chunk 21 / score 0.74</code></pre></div>
    </div>`, "query test"),
  ].join("");
}

function renderRecommendationCases() {
  if (recommendationCaseViewMode === "detail") return renderRecommendationCaseDetail();
  const records = recommendationCases.filter(c => !apiLogs.some(log => log.caseId === c.id && log.source === "sandbox"));
  const rows = records.map((c) => `<tr>
    <td><button class="link-button" type="button" data-case-detail="${c.id}">${c.id}</button></td>
    <td>${escapeHtml(c.guestName)}</td>
    <td>${escapeHtml(c.email)}</td>
    <td>${escapeHtml(c.petName)}</td>
    <td>${c.submitted}</td>
    <td>${c.survey}</td>
    <td>${badge(c.status)}</td>
    <td>${recommendationSnapshots[c.id]?.final.delivered ? escapeHtml(recommendationSnapshots[c.id].final.name) : c.status === "需複核" ? "推薦結果待複核" : "未提供結果快照"}</td>
    <td><div class="row-actions">
      <button class="table-action" type="button" data-case-detail="${c.id}">檢視</button>

    </div></td>
  </tr>`);
  return [
    metricGrid([["推薦紀錄", records.length, "前台提交・示範資料"], ["已完成", records.filter(c => c.status === "完成").length, "推薦處理完成"], ["需複核", records.filter(c => c.status === "需複核").length, "推薦結果待確認"], ["失敗", records.filter(c => c.status === "失敗").length, "未完成推薦"]]),
    section("前台使用者推薦歷史", "每次訪客提交問卷建立獨立紀錄，保存當次訪客名、Email、寵物資料與推薦結果，不需建立會員帳號。此處僅供檢視；目前為示範資料。", table(["紀錄 ID", "訪客名", "Email", "寵物名", "推薦時間", "問卷版本", "推薦狀態", "當次推薦結果", "操作"], rows, 1100), "唯讀紀錄"),
  ].join("");
}

function renderRecommendationCaseDetail() {
  const c = recommendationCases.find(item => item.id === selectedRecommendationCaseId) || recommendationCases[0];
  const snapshot = recommendationSnapshots[c.id];
  const fields = entries => '<dl class="history-fields">' + entries.map(([label, value]) => '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(String(value)) + '</dd></div>').join('') + '</dl>';
  const header = '<div class="detail-toolbar"><button class="secondary-button" type="button" data-case-mode="list">返回推薦歷史</button></div>' +
    '<div class="member-detail"><div class="member-detail-head"><div><h2>' + escapeHtml(c.id) + '</h2><p>' + escapeHtml(c.guestName + ' · ' + c.email + ' · ' + c.petName + ' · ' + c.submitted) + '</p></div>' + badge(c.status) + '</div></div>';
  if (!snapshot) return header + section('歷史快照', '', '<p>此筆紀錄尚未提供寵物、計算節點與推薦結果快照。</p>');
  const e = snapshot.energy, final = snapshot.final;
  const recipe = final.content;
  const recipeBody = recipe && typeof recipe === 'object' ?
    '<div class="history-full-recipe"><p class="recipe-demo-label">介面示範內容，非正式營養配方；食材用量尚未與案例能量目標校核。</p><p>' + escapeHtml(recipe.description||'') + '</p><h3>食材與用量</h3><p class="muted-text">' + escapeHtml(recipe.yield||'') + '</p>' + table(['食材','用量','備料說明'],(recipe.ingredients||[]).map(row=>'<tr>'+row.map(v=>'<td>'+escapeHtml(String(v))+'</td>').join('')+'</tr>'),540) + '<h3>製作步驟</h3><ol>' + (recipe.steps||[]).map(t=>'<li>'+escapeHtml(t)+'</li>').join('') + '</ol><h3>餵食安排</h3><ul>' + (recipe.feeding||[]).map(t=>'<li>'+escapeHtml(t)+'</li>').join('') + '</ul><h3>注意事項</h3><ul>' + (recipe.notes||[]).map(t=>'<li>'+escapeHtml(t)+'</li>').join('') + '</ul></div>' : recipe ? '<div class="history-recipe-content">'+escapeHtml(recipe)+'</div>' : '<div class="history-recipe-empty"><strong>此案例尚未保存完整食譜內容</strong><p>尚無食材用量、製作步驟或餵食方式。</p></div>';
  const nodes = snapshot.nodes.map(node => '<li class="history-node"><div class="history-node-head"><h3>' + escapeHtml(node.id + ' · ' + node.name) + '</h3>' + badge(node.status) + '</div><p class="muted-text">' + escapeHtml(node.time) + '</p>' + fields([['輸入', node.input], ['公式／規則依據', node.basis], ['節點結果', node.output]]) + '</li>').join('');
  return [header,
    '<p class="history-notice">示範歷史快照：本頁資料用於展示完整紀錄格式，尚未串接正式推薦事件。快照獨立保存，不隨目前寵物資料或規則變更重新計算。</p>',
    '<div class="tabs" role="tablist" aria-label="推薦歷史內容"><button type="button" class="tab active" role="tab" id="history-tab-questionnaire" aria-controls="history-panel-questionnaire" aria-selected="true" data-history-tab="questionnaire">問卷內容</button><button type="button" class="tab" role="tab" id="history-tab-process" aria-controls="history-panel-process" aria-selected="false" data-history-tab="process">處理紀錄</button><button type="button" class="tab" role="tab" id="history-tab-recipe" aria-controls="history-panel-recipe" aria-selected="false" data-history-tab="recipe">最終食譜</button></div>',
    '<div id="history-panel-recipe" role="tabpanel" aria-labelledby="history-tab-recipe" data-history-panel="recipe" hidden>',
    section('最終推薦給客戶的食譜', final.delivered ? '已保存本次提供給客戶的食譜與推薦內容。' : '本次尚未產生可提供客戶的最終推薦。',
      '<div class="history-result"><h2>' + escapeHtml(final.delivered ? final.name : '待複核，尚未提供最終食譜') + '</h2>' +
      fields([[final.delivered ? '食譜 ID' : '候選食譜', final.delivered ? final.id : final.name + ' · ' + final.id], ['食譜版本', final.version], ['排序分數', final.score + ' 分'], ['推薦依據', final.reason]]) +
      (final.message ? '<p class="history-message">' + escapeHtml(final.message) + '</p>' : '') + '</div>', final.delivered ? '已提供客戶' : '待複核'),
    final.delivered ? section('完整食譜內容', '展示當次食譜的食材、製作與餵食內容。', recipeBody) : '',
    '</div><div id="history-panel-questionnaire" role="tabpanel" aria-labelledby="history-tab-questionnaire" data-history-panel="questionnaire">',
    section('當時寵物資訊與問卷回答', '提交時間：' + snapshot.capturedAt + ' · ' + c.survey, fields(Object.entries(snapshot.pet)), '提交快照'),
    '</div><div id="history-panel-process" role="tabpanel" aria-labelledby="history-tab-process" data-history-panel="process" hidden>',
    section('RER／MER 計算結果', '保留當次公式、查表依據與調整值；能量單位為 kcal／日。',
      metricGrid([['RER 靜止能量', e.rer, '70 × 體重（kg）^0.75'], ['基準係數', e.base, '依生命階段與生理狀態'], ['最終係數', e.factor, e.base + ' + ' + e.activity + ' + (' + e.bcs + ')'], ['MER 每日能量', e.mer, 'RER × 最終係數']]) +
      fields([['活動量係數加成', e.activity], ['BCS 係數加成', e.bcs], ['查表依據', e.basis]])),
    section('完整處理節點紀錄', '依執行順序保存每個節點的時間、狀態、輸入、依據與輸出，包含待複核或未完成的結果。', '<ol class="history-nodes">' + nodes + '</ol>', snapshot.nodes.length + ' 個節點'),
    section('執行版本與原始快照', '供回溯本次推薦所使用的流程與規則版本。', fields(Object.entries(snapshot.versions).map(([key, value]) => [{flow:'流程版本',calculation:'計算來源',rules:'規則版本',index:'RAG 索引版本',ranking:'排序版本'}[key], value])) + '<details><summary>查看完整紀錄 JSON</summary>' + jsonPreview(snapshot) + '</details>'),
    '</div>',
  ].join('');
}

function renderApiMonitoring() {
  if (apiMonitoringViewMode === "detail") return renderApiLogDetail();
  const rows = apiLogs.map((l, index) => `<tr>
    <td><button class="link-button" type="button" data-api-log="${index}">${l.time}</button></td>
    <td>${l.method}</td>
    <td><code>${l.endpoint}</code></td>
    <td>${badge(l.code)}</td>
    <td>${l.duration}</td>
    <td>${l.source}</td>
    <td><code>${l.caseId}</code></td>
    <td>${l.error}</td>
    <td><div class="row-actions">
      <button class="table-action" type="button" data-api-log="${index}">檢視</button>
      <button class="table-action" type="button">更多</button>
    </div></td>
  </tr>`);
  const tokenRows = tokenUsage.map((t) => `<tr><td>${t.time}</td><td>${t.model}</td><td>${t.purpose}</td><td>${t.input}</td><td>${t.output}</td><td>${t.total}</td><td>待串接帳務</td><td><code>${t.caseId}</code></td></tr>`);
  const issues = apiLogs.filter(log => Number(log.code) >= 400 || (log.error && log.error !== "-"));
  const panels = {
    requests: () => section("API 呼叫紀錄", "追蹤官網 API 串接狀況，協助除錯、維運與稽核。", table(["時間", "Method", "Endpoint", "狀態碼", "耗時", "來源", "關聯案例", "錯誤訊息", "操作"], rows, 1180), "monitoring"),
    tokens: () => section("AI Token 用量與計費", "追蹤各次 AI 呼叫的輸入與輸出用量。尚未串接帳務或設定計價資料，費用暫不計算。", table(["時間", "模型", "用途", "輸入 Token", "輸出 Token", "總計", "費用", "關聯案例"], tokenRows, 1040), "token"),
  };
  const tabs = [['requests', 'API Request / Response'], ['tokens', 'AI Token 用量與計費']];
  const success = apiLogs.filter(log => Number(log.code) >= 200 && Number(log.code) < 300).length;
  const failures = apiLogs.filter(log => Number(log.code) >= 400).length;
  const average = apiLogs.length ? Math.round(apiLogs.reduce((sum, log) => sum + Number(log.duration.replace(/[^0-9.]/g, '')), 0) / apiLogs.length) : 0;
  return [
    metricGrid([["總呼叫", apiLogs.length, "目前示範紀錄"], ["HTTP 成功率", apiLogs.length ? (success / apiLogs.length * 100).toFixed(1) + '%' : '—', "HTTP 2xx，含需複核回應"], ["平均耗時", average + ' ms', "目前全部呼叫"], ["API 失敗", failures, '另有 ' + (issues.length - failures) + ' 筆需複核']]),
    '<div class="tabs" role="tablist" aria-label="API 監控分類">' + tabs.map(([id, label]) => `<button id="monitor-tab-${id}" class="tab ${apiMonitoringTab === id ? 'active' : ''}" type="button" role="tab" aria-selected="${apiMonitoringTab === id}" aria-controls="monitor-panel" data-monitor-tab="${id}">${label}</button>`).join('') + '</div>',
    `<div id="monitor-panel" role="tabpanel" aria-labelledby="monitor-tab-${apiMonitoringTab}">${panels[apiMonitoringTab]()}</div>`,
  ].join("");
}

function renderApiLogDetail() {
  const log = apiLogs[Number(selectedApiLogIndex)] || apiLogs[0];
  return [
    `<div class="detail-toolbar">
      <button class="secondary-button" type="button" data-api-log-mode="list">返回監控紀錄</button>
    </div>`,
    `<div class="member-detail">
      <div class="member-detail-head">
        <div>
          <h2>${log.method} ${log.endpoint}</h2>
          <p>${log.time} · ${log.source}</p>
        </div>
        <div class="split-actions">
          <button class="secondary-button" type="button">複製 Trace ID</button>
          <button class="secondary-button" type="button" data-api-log-mode="list">關閉</button>
        </div>
      </div>
      <dl class="detail-summary role-summary">
        <div><dt>狀態碼</dt><dd>${badge(log.code)}</dd></div>
        <div><dt>耗時</dt><dd>${log.duration}</dd></div>
        <div><dt>關聯案例</dt><dd><code>${log.caseId}</code></dd></div>
        <div><dt>錯誤訊息</dt><dd>${log.error}</dd></div>
      </dl>
    </div>`,
    `<div class="definition-grid two">
      ${section("Sanitized Request", "移除敏感資訊後的 request 內容。", jsonPreview({ apiKeyId: "key_8J2Q", endpoint: log.endpoint, body: { species: "dog", weight_kg: 25, allergens: ["chicken"] } }), "request")}
      ${section("Sanitized Response", "單筆 API 呼叫的 response 內容。", jsonPreview(log.endpoint.includes("recommendations") ? recommendationResponse : questionnaireSchema), "response")}
    </div>`,
  ].join("");
}

const renderers = {
  members: renderMembers,
  admins: renderAdmins,
  "api-integration": renderApiIntegration,
  questionnaire: renderQuestionnaire,
  "nutrition-templates": renderNutritionTemplates,
  "nutrition-rules": renderNutritionRules,
  rag: renderRag,
  "recommendation-cases": renderRecommendationCases,
  "api-monitoring": renderApiMonitoring,
};

function renderNav() {
  const nav = document.querySelector("#nav");
  nav.innerHTML = modules
    .map((item, index) => `<button class="nav-item ${index === 0 ? "active" : ""}" type="button" data-view="${item.id}" title="${item.label}">
      <span class="nav-index">${String(modules.filter(module => module.id !== "api-monitoring").indexOf(item) + 1).padStart(2, "0")}</span>
      <span class="nav-label">${item.label}</span>
      ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ""}
    </button>`)
    .join("");
}

function setView(viewId) {
  if (viewId === "nutrition-templates") viewId = "nutrition-rules";
  const target = modules.find((item) => item.id === viewId) || modules[0];
  if (target.id !== "members") memberViewMode = "members";
  if (target.id !== "admins") adminViewMode = "accounts";
  if (target.id !== "api-integration") apiIntegrationMode = "list";
  if (target.id !== "api-integration") apiFormatVisible = false;
  if (target.id !== "questionnaire") questionnaireViewMode = "fields";
  if (target.id !== "nutrition-templates") nutritionTemplateViewMode = "list";
  if (target.id !== "recommendation-cases") recommendationCaseViewMode = "list";
  if (target.id !== "api-monitoring") apiMonitoringViewMode = "list";
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === target.id);
  });
  document.querySelector("#view-title").textContent = target.label;
  document.querySelector("#view-route").textContent = target.route;
  document.querySelector("#view-subtitle").textContent = target.subtitle;
  document.querySelector("#view-content").innerHTML = renderers[target.id]();
  window.location.hash = target.id;
}

function init() {
  renderNav();
  document.querySelector("#nav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    setView(button.dataset.view);
  });
  document.querySelector("#view-content").addEventListener("click", (event) => {
    const monitorTabButton = event.target.closest("[data-monitor-tab]");
    if (monitorTabButton) {
      apiMonitoringTab = monitorTabButton.dataset.monitorTab;
      document.querySelector("#view-content").innerHTML = renderApiMonitoring();
      document.querySelector('[data-monitor-tab="' + apiMonitoringTab + '"]').focus();
      return;
    }
    const openRagButton = event.target.closest("[data-open-rag]");
    if (openRagButton) {
      setView("rag");
      return;
    }
    const detailButton = event.target.closest("[data-member-detail]");
    if (detailButton) {
      selectedMemberId = detailButton.dataset.memberDetail;
      memberViewMode = "detail";
      document.querySelector("#view-content").innerHTML = renderMembers();
      return;
    }
    const tabButton = event.target.closest("[data-member-tab]");
    if (tabButton) {
      memberViewMode = tabButton.dataset.memberTab;
      document.querySelector("#view-content").innerHTML = renderMembers();
      return;
    }
    const adminTabButton = event.target.closest("[data-admin-tab]");
    if (adminTabButton) {
      adminViewMode = adminTabButton.dataset.adminTab;
      document.querySelector("#view-content").innerHTML = renderAdmins();
      return;
    }
    const questionnaireTabButton = event.target.closest("[data-questionnaire-tab]");
    if (questionnaireTabButton) {
      questionnaireViewMode = questionnaireTabButton.dataset.questionnaireTab;
      document.querySelector("#view-content").innerHTML = renderQuestionnaire();
      return;
    }
    const questionFieldButton = event.target.closest("[data-question-field]");
    if (questionFieldButton) {
      selectedQuestionFieldKey = questionFieldButton.dataset.questionField;
      questionnaireViewMode = "field-detail";
      document.querySelector("#view-content").innerHTML = renderQuestionnaire();
      return;
    }
    const questionnaireVersionButton = event.target.closest("[data-questionnaire-version]");
    if (questionnaireVersionButton) {
      selectedQuestionnaireVersion = questionnaireVersionButton.dataset.questionnaireVersion;
      questionnaireViewMode = "version-detail";
      questionnaireComposeMode = "";
      document.querySelector("#view-content").innerHTML = renderQuestionnaire();
      return;
    }
    const composeModeButton = event.target.closest("[data-compose-mode]");
    if (composeModeButton) {
      questionnaireComposeMode = composeModeButton.dataset.composeMode === "clear" ? "" : composeModeButton.dataset.composeMode;
      if (questionnaireComposeMode === "add") selectedQuestionnaireFieldKey = questionFields[6]?.key || questionFields[0].key;
      document.querySelector("#view-content").innerHTML = renderQuestionnaire();
      return;
    }
    const composeEditButton = event.target.closest("[data-compose-edit]");
    if (composeEditButton) {
      selectedQuestionnaireFieldKey = composeEditButton.dataset.composeEdit;
      questionnaireComposeMode = "edit";
      document.querySelector("#view-content").innerHTML = renderQuestionnaire();
      return;
    }
    const roleButton = event.target.closest("[data-role-detail]");
    if (roleButton) {
      selectedRoleId = roleButton.dataset.roleDetail;
      adminViewMode = "role-detail";
      document.querySelector("#view-content").innerHTML = renderAdmins();
      return;
    }
    const apiModeButton = event.target.closest("[data-api-mode]");
    if (apiModeButton) {
      apiIntegrationMode = apiModeButton.dataset.apiMode;
      apiFormatVisible = false;
      document.querySelector("#view-content").innerHTML = renderApiIntegration();
      return;
    }
    const apiEditButton = event.target.closest("[data-api-edit]");
    if (apiEditButton) {
      selectedApiName = apiEditButton.dataset.apiEdit;
      apiIntegrationMode = "edit";
      apiFormatVisible = false;
      document.querySelector("#view-content").innerHTML = renderApiIntegration();
      return;
    }
    const apiFormatButton = event.target.closest("[data-api-format]");
    if (apiFormatButton) {
      selectedApiName = apiFormatButton.dataset.apiFormat;
      apiFormatVisible = !apiFormatVisible;
      document.querySelector("#view-content").innerHTML = renderApiIntegration();
      return;
    }
    const templateDetailButton = event.target.closest("[data-template-detail]");
    if (templateDetailButton) {
      selectedNutritionTemplateName = templateDetailButton.dataset.templateDetail;
      nutritionTemplateViewMode = "detail";
      document.querySelector("#view-content").innerHTML = renderNutritionTemplates();
      return;
    }
    const templateModeButton = event.target.closest("[data-template-mode]");
    if (templateModeButton) {
      nutritionTemplateViewMode = templateModeButton.dataset.templateMode;
      document.querySelector("#view-content").innerHTML = renderNutritionTemplates();
      return;
    }
    const caseDetailButton = event.target.closest("[data-case-detail]");
    if (caseDetailButton) {
      selectedRecommendationCaseId = caseDetailButton.dataset.caseDetail;
      recommendationCaseViewMode = "detail";
      document.querySelector("#view-content").innerHTML = renderRecommendationCases();
      return;
    }
    const caseModeButton = event.target.closest("[data-case-mode]");
    if (caseModeButton) {
      recommendationCaseViewMode = caseModeButton.dataset.caseMode;
      document.querySelector("#view-content").innerHTML = renderRecommendationCases();
      return;
    }
    const apiLogButton = event.target.closest("[data-api-log]");
    if (apiLogButton) {
      selectedApiLogIndex = apiLogButton.dataset.apiLog;
      apiMonitoringViewMode = "detail";
      document.querySelector("#view-content").innerHTML = renderApiMonitoring();
      return;
    }
    const apiLogModeButton = event.target.closest("[data-api-log-mode]");
    if (apiLogModeButton) {
      apiMonitoringViewMode = apiLogModeButton.dataset.apiLogMode;
      document.querySelector("#view-content").innerHTML = renderApiMonitoring();
    }
  });
  const initial = window.location.hash.replace("#", "") === "nutrition-templates" ? "nutrition-rules" : window.location.hash.replace("#", "");
  setView(modules.some((item) => item.id === initial) ? initial : "recommendation-cases");
}
