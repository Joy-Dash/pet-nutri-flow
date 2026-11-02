/* Browser-only login/reset demonstration. Never store submitted passwords. */
window.backendAuth = (() => {
  const sessionKey = 'tp-rag-demo-session-v1';
  const passwords = new Map();
  const demoPassword = 'Demo1234!';
  let account = null, desiredView = location.hash.slice(1) || 'rag';
  const esc = escapeHtml;
  const current = () => admins.find(a => a.account === account && a.status === '啟用');
  const role = () => roles.find(r => r.name === current()?.role && r.status === '啟用');
  const isSuper = () => !!current() && role()?.id === 'super-admin';
  const grants = () => rolePermissionProfiles[role()?.id] || [];
  const allowed = id => !!current() && (isSuper() || grants().some(p => p.moduleId === id && p.view));
  const canReset = target => isSuper() && target !== account && admins.some(a => a.account === target);
  const originalSetView = setView;
  const originalAdmins = renderers.admins;
  renderers.admins = () => {
    const html = originalAdmins();
    if (adminViewMode !== 'accounts') return html;
    const root = document.createElement('div'); root.innerHTML = html;
    if (!isSuper()) {
      root.querySelectorAll('button').forEach(b => { if (b.textContent.includes('新增帳號')) b.remove(); });
      return root.innerHTML;
    }
    root.querySelectorAll('[data-record-entity="admins"]').forEach(button => {
      const target = button.dataset.recordKey;
      if (!canReset(target)) return;
      const reset = document.createElement('button');
      reset.type = 'button'; reset.className = 'table-action';
      reset.dataset.authReset = target; reset.textContent = '重置密碼';
      button.closest('.row-actions').append(reset);
    });
    return root.innerHTML;
  };
  function updateNavigation() {
    document.querySelectorAll('#nav [data-view]').forEach(el => el.hidden = !allowed(el.dataset.view));
    document.querySelectorAll('#nav details').forEach(group => {
      group.hidden = group.classList.contains('api-module')
        ? !allowed('api-integration') && !allowed('api-monitoring') : !allowed('rag');
    });
    document.querySelector('.account-copy strong').textContent = current()?.name || '尚未登入';
    document.querySelector('.account-copy small').textContent = role()?.name || '';
  }
  setView = id => {
    if (!current()) { desiredView = id; return; }
    const next = allowed(id) ? id : modules.find(m => allowed(m.id))?.id;
    if (!next) { showLogin('此帳號尚無可用頁面，請聯絡最高管理員。'); return; }
    originalSetView(next); updateNavigation();
    document.querySelector('#auth-password-reminder')?.remove();
    if(current()?.requiresPasswordChange){
      const reminder=document.createElement('div');reminder.className='nutrition-message';reminder.id='auth-password-reminder';
      reminder.innerHTML='您的帳號已由最高管理員開通，請登入後設定自己的密碼。 <button type="button" class="secondary-button" data-auth-change>修改密碼</button>';
      document.querySelector('#view-content').before(reminder);
    }
  };
  function showLogin(message = '') {
    document.body.classList.add('auth-pending');
    document.querySelector('#auth-login')?.remove();
    const screen = document.createElement('main'); screen.id = 'auth-login';
    screen.innerHTML = `<section class="auth-card" aria-labelledby="auth-heading"><div class="brand-mark">TP</div><h1 id="auth-heading">登入 TP-RAG 後台</h1><p>請使用管理員帳號登入。</p><form id="auth-form"><label>帳號<input name="account" required autocomplete="username" autofocus></label><label>密碼<input name="password" type="password" required autocomplete="current-password"></label><label class="auth-show"><input type="checkbox" data-auth-show>顯示密碼</label><p id="auth-error" role="alert">${esc(message)}</p><button type="submit" class="primary-button">登入</button></form><div class="auth-demo"><strong>介面示範，尚未串接正式登入服務</strong><p>最高管理員：<code>admin</code>／<code>${demoPassword}</code></p><p>其他啟用示範帳號：<code>nutrition</code>、<code>ops</code>，密碼相同。</p></div><p class="auth-help">忘記密碼請聯絡最高管理員。</p></section>`;
    document.body.append(screen);
    screen.querySelector('[data-auth-show]').onchange = e => {
      screen.querySelector('[name="password"]').type = e.target.checked ? 'text' : 'password';
    };
    screen.querySelector('form').onsubmit = e => {
      e.preventDefault(); const f = new FormData(e.target), id = String(f.get('account')).trim();
      const a = admins.find(a => a.account === id);
      const r = roles.find(r => r.name === a?.role && r.status === '啟用');
      if (!a || a.status !== '啟用' || !r || f.get('password') !== (passwords.get(id) ?? demoPassword)) {
        screen.querySelector('#auth-error').textContent = '登入失敗，請確認帳號、密碼或聯絡管理員。';
        return;
      }
      account = id;
      try { sessionStorage.setItem(sessionKey, id); } catch { /* Session remains in memory. */ }
      screen.remove(); document.body.classList.remove('auth-pending');
      setView(desiredView);
      if (desiredView === 'rag' && allowed('rag')) document.querySelector('[data-km-nav="data"]')?.click();
    };
    screen.querySelector('[name="account"]').focus();
  }
  function resetPassword(target, self = false) {
    const authorized=()=>self?!!current()&&account===target:canReset(target);
    if (!authorized()) return;
    const a = admins.find(a => a.account === target);
    const d = document.createElement('dialog'); d.className = 'record-dialog auth-reset';
    d.setAttribute('aria-labelledby', 'auth-reset-title');
    d.innerHTML = `<form><header class="record-head"><div><h2 id="auth-reset-title">重置密碼</h2><p>${esc(a.name)} · ${esc(a.account)}</p></div><button type="button" class="secondary-button" data-auth-cancel>關閉</button></header><div class="record-body"><p>由最高管理員直接設定此帳號的新密碼。</p><label>新密碼<input name="password" type="password" required autocomplete="new-password"></label><label>確認新密碼<input name="confirm" type="password" required autocomplete="new-password"></label><p class="auth-demo">此為介面示範：密碼只在本次頁面開啟期間有效，重新整理後還原。未變更正式系統密碼。</p></div><footer class="record-footer"><span class="record-error" role="alert"></span><button type="button" class="secondary-button" data-auth-cancel>取消</button><button type="submit" class="primary-button">確認重置</button></footer></form>`;
    if(self){
      d.querySelector('h2').textContent='修改自己的密碼';
      d.querySelector('.record-body > p').textContent='輸入目前密碼，再設定自己的新密碼。';
      d.querySelector('.record-body > p').insertAdjacentHTML('afterend','<label>目前密碼<input name="current" type="password" required autocomplete="current-password"></label>');
      d.querySelector('button[type=submit]').textContent='儲存新密碼';
    }
    document.body.append(d); d.showModal();
    const close = () => {
      if ([...d.querySelectorAll('input')].some(i => i.value) && !confirm('尚未完成重置，確定放棄？')) return;
      d.close();
    };
    d.querySelectorAll('[data-auth-cancel]').forEach(b => b.onclick = close);
    d.addEventListener('cancel', e => { e.preventDefault(); close(); });
    d.addEventListener('close', () => d.remove());
    d.querySelector('form').onsubmit = e => {
      e.preventDefault(); const f = new FormData(e.target);
      const error = d.querySelector('.record-error');
      if (!authorized()) { error.textContent = '目前沒有重置此帳號密碼的權限。'; return; }
      if(self&&f.get('current')!==(passwords.get(target)??demoPassword)){error.textContent='目前密碼不正確。';return;}
      if (f.get('password') !== f.get('confirm')) { error.textContent = '兩次輸入的密碼不一致。'; return; }
      passwords.set(target, String(f.get('password')));
      if(self){
        a.requiresPasswordChange=false;
        document.querySelector('#auth-password-reminder')?.remove();
        try{
          const saved=JSON.parse(localStorage.getItem('tp-rag-records-v1')||'{}');
          const record=saved.admins?.find(r=>r.account===target);
          if(record){record.requiresPasswordChange=false;localStorage.setItem('tp-rag-records-v1',JSON.stringify(saved));}
        }catch{/* Demo reminder state may remain until the next successful save. */}
      }
      d.close();
      const status = document.createElement('p'); status.className = 'record-status'; status.role = 'status';
      status.textContent = self?'已完成自己的示範密碼修改，未變更正式系統密碼。':'已完成此帳號的示範密碼重置，未變更正式系統密碼。';
      document.querySelector('#view-content').prepend(status);
    };
  }
  function mount() {
    try { account = sessionStorage.getItem(sessionKey); } catch {}
    const logout = document.createElement('button'); logout.className = 'secondary-button';
    logout.type = 'button'; logout.id = 'auth-logout'; logout.textContent = '登出';
    logout.onclick = () => {
      if (!confirm('確定登出？')) return;
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      account = null; try { sessionStorage.removeItem(sessionKey); } catch {}
      desiredView = 'rag'; showLogin();
    };
    document.querySelector('.top-actions').append(logout);
    const change=document.createElement('button');change.type='button';change.className='secondary-button';change.textContent='修改密碼';change.dataset.authChange='';
    logout.before(change);
    document.addEventListener('click', e => {
      if(e.target.closest('[data-auth-change]')){resetPassword(account,true);return;}
      const button = e.target.closest('[data-auth-reset]'); if (button) resetPassword(button.dataset.authReset);
    });
    if (current() && role()) { document.body.classList.remove('auth-pending'); setView(desiredView); }
    else { account = null; showLogin(); }
  }
  return { mount, canReset, canCreateAccount: isSuper };
})();
