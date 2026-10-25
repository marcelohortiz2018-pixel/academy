(() => {
const C = window.CFG, sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let me = null, aulas = [], prog = {}, KB = null, curAula = null;

const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 3200); };
const fmt = d => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const isAdmin = () => me && me.papel === 'admin';
const signed = async p => { if (!p) return null; const { data } = await sb.storage.from(C.BUCKET).createSignedUrl(p, 3600); return data ? data.signedUrl : null; };

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { me = null; route(); } });
  if (session) await load(); route();
  window.addEventListener('hashchange', route);
}
async function load() {
  const { data: { user } } = await sb.auth.getUser(); if (!user) return;
  let { data: p } = await sb.from('profiles').select('*').eq('id', user.id).single(); me = p;
  sb.from('profiles').update({ ultimo_acesso: new Date().toISOString() }).eq('id', user.id).then(() => {});
  const a = await sb.from('aulas').select('*').order('ordem'); aulas = a.data || [];
  const g = await sb.from('progresso').select('*').eq('user_id', user.id); prog = {}; (g.data || []).forEach(r => prog[r.aula_id] = r);
}
function shell(inner, tab) {
  const nav = [['trilha', 'Trilha'], ['mentorias', 'Mentorias'], ['progresso', 'Meu progresso']];
  if (isAdmin()) nav.push(['admin', 'Administração']);
  app.innerHTML = `<div class="top"><span class="brand">HORTIZ ACADEMY</span><span class="nav">${nav.map(n => `<a href="#/${n[0]}" class="${tab === n[0] ? 'on' : ''}">${n[1]}</a>`).join('')}</span><span class="mut">${esc(me.nome)}</span><button class="sec" id="out">Sair</button></div><div class="wrap">${inner}</div>`;
  $('#out').onclick = async () => { await sb.auth.signOut(); location.hash = '#/login'; };
  $('#helpBtn').classList.remove('hidden');
}
async function route() {
  const h = (location.hash || '#/trilha').slice(2).split('/');
  if (!me) { $('#helpBtn').classList.add('hidden'); $('#helpPanel').classList.add('hidden'); return viewLogin(); }
  if (h[0] === 'aula') return viewAula(+h[1]);
  if (h[0] === 'mentorias') return viewMentorias();
  if (h[0] === 'progresso') return viewProgresso();
  if (h[0] === 'admin' && isAdmin()) return viewAdmin(h[1] || 'alunos');
  return viewTrilha();
}

/* ---------- login ---------- */
function viewLogin() {
  let modo = 'entrar';
  const draw = () => {
    app.innerHTML = `<div class="login"><h1>HortiZ Academy</h1><p class="mut">Aprenda a usar o programa de Conciliação Bancária + Classificação de PDC, passo a passo. Acesso gratuito com login e senha.</p>
    <div class="card"><div class="tabs"><button class="${modo === 'entrar' ? 'on' : ''}" id="t1">Entrar</button><button class="${modo === 'criar' ? 'on' : ''}" id="t2">Criar conta grátis</button></div>
    ${modo === 'criar' ? '<label>Nome</label><input id="nome" autocomplete="name">' : ''}
    <label>E-mail</label><input id="em" type="email" autocomplete="email"><label>Senha</label><input id="pw" type="password" autocomplete="${modo === 'criar' ? 'new-password' : 'current-password'}" placeholder="mínimo 6 caracteres">
    <button id="go" style="width:100%">${modo === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
    ${modo === 'entrar' ? '<p style="text-align:center"><a href="#" id="forgot">Esqueci minha senha</a></p>' : ''}<p id="msg" class="bad"></p></div></div>`;
    $('#t1').onclick = () => { modo = 'entrar'; draw(); }; $('#t2').onclick = () => { modo = 'criar'; draw(); };
    const f = $('#forgot'); if (f) f.onclick = async e => { e.preventDefault(); const em = $('#em').value.trim(); if (!em) return $('#msg').textContent = 'Digite o e-mail acima.'; await sb.auth.resetPasswordForEmail(em, { redirectTo: location.href.split('#')[0] }); toast('Se o e-mail existir, enviamos o link de redefinição.'); };
    $('#go').onclick = async () => {
      const email = $('#em').value.trim(), password = $('#pw').value; $('#msg').textContent = ''; $('#go').disabled = true;
      let r = modo === 'entrar' ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password, options: { data: { nome: ($('#nome').value || '').trim() } } });
      $('#go').disabled = false;
      if (r.error) return $('#msg').textContent = r.error.message.includes('Invalid login') ? 'E-mail ou senha incorretos.' : r.error.message;
      if (!r.data.session) { $('#msg').className = 'ok'; return $('#msg').textContent = 'Conta criada. Confirme o e-mail enviado para entrar.'; }
      await load(); location.hash = '#/trilha'; route();
    };
  }; draw();
}

/* ---------- trilha ---------- */
function pct() { const t = aulas.length || 1; return Math.round(100 * aulas.filter(a => prog[a.id]?.concluida).length / t); }
function viewTrilha() {
  const mods = {}; aulas.forEach(a => (mods[a.modulo] = mods[a.modulo] || []).push(a));
  const next = aulas.find(a => !prog[a.id]?.concluida);
  shell(`<h1>Trilha de onboarding</h1><p class="mut">Siga as aulas na ordem. Cada aula tem vídeo, manual e uma tarefa prática.</p>
  <div class="card"><div class="row"><b>Seu progresso: ${pct()}%</b>${next ? `<a class="btn" href="#/aula/${next.id}" style="margin-left:auto">${aulas.some(a => prog[a.id]) ? 'Continuar' : 'Começar'}: ${esc(next.titulo)}</a>` : '<span class="ok" style="margin-left:auto">Trilha concluída! 🎉</span>'}</div><div class="bar" style="margin-top:10px"><i style="width:${pct()}%"></i></div></div>
  ${Object.entries(mods).map(([m, l]) => `<h2>${esc(m)}</h2><div class="grid">${l.map(a => `<a class="card" href="#/aula/${a.id}" style="text-decoration:none;color:inherit"><div class="row"><span class="pill ${prog[a.id]?.concluida ? 'done' : ''}">${prog[a.id]?.concluida ? '✓ concluída' : 'Aula ' + a.ordem}</span></div><h3 style="margin-top:8px">${esc(a.titulo)}</h3><div class="mut">${esc(a.descricao)}</div></a>`).join('')}</div>`).join('')}`, 'trilha');
}

/* ---------- aula ---------- */
async function viewAula(id) {
  const a = aulas.find(x => x.id === id); if (!a) return viewTrilha(); curAula = a;
  shell(`<p><a href="#/trilha">← Trilha</a></p><h1>${esc(a.titulo)}</h1><p class="mut">${esc(a.modulo)} · ${esc(a.descricao)}</p><div id="vid" class="card mut">Carregando vídeo…</div><div class="row" id="acts"></div><div id="tasks"></div>`, 'trilha');
  const [v, vc, man] = await Promise.all([signed(a.video_path), signed(a.video_celular_path), signed(a.manual_path)]);
  const box = $('#vid');
  if (!v) box.innerHTML = 'Vídeo ainda não disponível. Peça ao administrador para enviá-lo em Administração → Conteúdo.';
  else {
    box.className = ''; box.innerHTML = `<video id="pl" controls preload="metadata" src="${v}" playsinline></video>`;
    const pl = $('#pl'); const st = prog[a.id]?.segundos || 0; pl.addEventListener('loadedmetadata', () => { if (st > 5 && st < pl.duration - 5) pl.currentTime = st; });
    let last = 0; pl.addEventListener('timeupdate', () => { if (Date.now() - last > 15000) { last = Date.now(); saveProg(a.id, { segundos: Math.floor(pl.currentTime) }); } });
    pl.addEventListener('ended', () => saveProg(a.id, { concluida: true, segundos: 0 }, true));
  }
  const done = prog[a.id]?.concluida;
  $('#acts').innerHTML = `${man ? `<a class="btn sec" target="_blank" rel="noopener" href="${man}">📄 ${esc(a.manual_titulo || 'Manual')}</a>` : ''}${vc ? `<a class="btn sec" target="_blank" rel="noopener" href="${vc}">📱 Versão para celular</a>` : ''}<button id="dn" ${done ? 'class="sec"' : ''}>${done ? '✓ Concluída (desmarcar)' : 'Marcar como concluída'}</button><button class="sec" id="hp">💬 Ajude-me com esta aula</button>`;
  $('#dn').onclick = async () => { await saveProg(a.id, { concluida: !done }, true); viewAula(id); };
  $('#hp').onclick = () => openHelp();
  const t = await sb.from('tarefas').select('*').eq('aula_id', a.id); const { data: en } = await sb.from('entregas').select('*').eq('user_id', me.id).order('criado_em', { ascending: false });
  $('#tasks').innerHTML = (t.data || []).map(x => { const mine = (en || []).filter(e => e.tarefa_id === x.id); return `<h2>Tarefa prática</h2><div class="card"><h3>${esc(x.titulo)}</h3><p>${esc(x.enunciado)}</p><textarea id="r${x.id}" rows="5" placeholder="Escreva sua resposta…"></textarea><button data-t="${x.id}" class="send">Enviar para correção da IA</button>${mine.map(e => `<div class="card" style="margin-top:10px"><div class="mut">${fmt(e.criado_em)}</div><div>${esc(e.resposta)}</div>${e.feedback_ia ? `<div class="msg a" style="margin-top:8px"><b>Retorno da IA:</b>\n${esc(e.feedback_ia)}</div>` : '<div class="mut">Retorno pendente.</div>'}</div>`).join('')}</div>`; }).join('');
  document.querySelectorAll('.send').forEach(b => b.onclick = async () => {
    const tid = +b.dataset.t, txt = $('#r' + tid).value.trim(); if (txt.length < 10) return toast('Escreva uma resposta um pouco mais completa.');
    b.disabled = true; b.textContent = 'Corrigindo…'; const tk = t.data.find(z => z.id === tid);
    const ins = await sb.from('entregas').insert({ tarefa_id: tid, user_id: me.id, resposta: txt }).select().single(); if (ins.error) { b.disabled = false; return toast(ins.error.message); }
    const r = await askAI({ modo: 'corrigir', titulo: tk.titulo, enunciado: tk.enunciado, criterios: tk.criterios, resposta: txt, contexto: retrieve(tk.enunciado + ' ' + txt + ' ' + a.titulo, 6) });
    const fb = r.texto || r.erro || 'Retorno indisponível no momento.'; if (!r.sem_ia && !r.erro) await sb.from('entregas').update({ feedback_ia: fb, status: 'corrigida' }).eq('id', ins.data.id);
    viewAula(id);
  });
}
async function saveProg(aid, patch, announce) {
  const row = { user_id: me.id, aula_id: aid, ...(prog[aid] || {}), ...patch, atualizado_em: new Date().toISOString() }; prog[aid] = row;
  const { error } = await sb.from('progresso').upsert(row); if (announce && !error) toast(row.concluida ? 'Aula concluída!' : 'Progresso atualizado');
}

/* ---------- mentorias ---------- */
async function viewMentorias() {
  shell(`<h1>Mentorias online</h1><p class="mut">Sessões individuais e em grupo por videochamada gratuita. A sala abre 15 minutos antes do horário.</p><div id="ml">Carregando…</div>`, 'mentorias');
  const [m, i] = await Promise.all([sb.from('mentorias').select('*').gte('inicio', new Date(Date.now() - 3 * 3600e3).toISOString()).order('inicio'), sb.from('mentoria_inscricoes').select('*').eq('user_id', me.id)]);
  const inscr = new Set((i.data || []).map(x => x.mentoria_id));
  $('#ml').innerHTML = (m.data || []).length ? m.data.map(x => { const t0 = new Date(x.inicio).getTime(), open = Date.now() > t0 - 15 * 60e3 && Date.now() < t0 + (x.duracao_min + 30) * 60e3, mine = inscr.has(x.id) || x.tipo === 'individual';
    return `<div class="card"><div class="row"><span class="pill">${x.tipo === 'grupo' ? 'Em grupo' : 'Individual'}</span><b>${esc(x.titulo)}</b><span class="mut" style="margin-left:auto">${fmt(x.inicio)} · ${x.duracao_min} min</span></div><p class="mut">${esc(x.descricao || '')}</p>
    <div class="row">${x.tipo === 'grupo' ? `<button class="sec insc" data-id="${x.id}" data-on="${inscr.has(x.id) ? 1 : 0}">${inscr.has(x.id) ? 'Cancelar inscrição' : 'Inscrever-me'}</button>` : ''}${mine ? `<a class="btn ${open ? '' : 'sec'}" target="_blank" rel="noopener" href="${C.JITSI}HortiZ-${esc(x.sala)}" ${open ? '' : 'onclick="return false" title="Abre 15 min antes"'}>🎥 Entrar na sala</a>` : ''}</div></div>`; }).join('') : '<div class="card mut">Nenhuma mentoria agendada no momento.</div>';
  document.querySelectorAll('.insc').forEach(b => b.onclick = async () => { const id = +b.dataset.id; if (b.dataset.on === '1') await sb.from('mentoria_inscricoes').delete().eq('mentoria_id', id).eq('user_id', me.id); else await sb.from('mentoria_inscricoes').insert({ mentoria_id: id, user_id: me.id }); viewMentorias(); });
}

/* ---------- progresso ---------- */
async function viewProgresso() {
  const { data: en } = await sb.from('entregas').select('*, tarefas(titulo)').eq('user_id', me.id).order('criado_em', { ascending: false });
  shell(`<h1>Meu progresso</h1><div class="card"><b>${pct()}% concluído</b> · ${aulas.filter(a => prog[a.id]?.concluida).length} de ${aulas.length} aulas<div class="bar" style="margin-top:10px"><i style="width:${pct()}%"></i></div></div>
  <h2>Aulas</h2><div class="card">${aulas.map(a => `<div class="row" style="padding:4px 0"><span class="${prog[a.id]?.concluida ? 'ok' : 'mut'}">${prog[a.id]?.concluida ? '✓' : '○'}</span><a href="#/aula/${a.id}">${a.ordem}. ${esc(a.titulo)}</a></div>`).join('')}</div>
  <h2>Minhas tarefas enviadas</h2>${(en || []).map(e => `<div class="card"><b>${esc(e.tarefas?.titulo || '')}</b> <span class="mut">${fmt(e.criado_em)}</span><div>${esc(e.resposta)}</div>${e.feedback_ia ? `<div class="msg a"><b>Retorno:</b>\n${esc(e.feedback_ia)}</div>` : ''}</div>`).join('') || '<div class="card mut">Nenhuma tarefa enviada ainda.</div>'}`, 'progresso');
}

/* ---------- admin ---------- */
async function viewAdmin(tab) {
  const T = [['alunos', 'Alunos'], ['entregas', 'Tarefas enviadas'], ['mentorias', 'Mentorias'], ['conteudo', 'Conteúdo']];
  shell(`<h1>Administração</h1><div class="tabs">${T.map(t => `<button class="${t[0] === tab ? 'on' : ''}" onclick="location.hash='#/admin/${t[0]}'">${t[1]}</button>`).join('')}</div><div id="ad">Carregando…</div>`, 'admin');
  const ad = $('#ad');
  if (tab === 'alunos') {
    const { data } = await sb.from('v_progresso_alunos').select('*').order('ultimo_acesso', { ascending: false });
    ad.innerHTML = `<div class="card"><table><tr><th>Aluno</th><th>E-mail</th><th>Progresso</th><th>Tarefas</th><th>Último acesso</th></tr>${(data || []).map(r => `<tr><td>${esc(r.nome)}</td><td>${esc(r.email)}</td><td>${r.concluidas}/${r.total_aulas}<div class="bar"><i style="width:${Math.round(100 * r.concluidas / (r.total_aulas || 1))}%"></i></div></td><td>${r.entregas}</td><td>${fmt(r.ultimo_acesso)}</td></tr>`).join('') || '<tr><td colspan=5 class="mut">Nenhum aluno cadastrado ainda.</td></tr>'}</table></div>`;
  }
  if (tab === 'entregas') {
    const { data } = await sb.from('entregas').select('*, tarefas(titulo), profiles:user_id(nome,email)').order('criado_em', { ascending: false }).limit(60);
    ad.innerHTML = (data || []).map(e => `<div class="card"><b>${esc(e.profiles?.nome || '')}</b> <span class="mut">${esc(e.tarefas?.titulo || '')} · ${fmt(e.criado_em)}</span><div>${esc(e.resposta)}</div>${e.feedback_ia ? `<div class="msg a">${esc(e.feedback_ia)}</div>` : '<div class="mut">Sem retorno da IA.</div>'}</div>`).join('') || '<div class="card mut">Nenhuma tarefa enviada.</div>';
  }
  if (tab === 'mentorias') {
    const [m, al] = await Promise.all([sb.from('mentorias').select('*').order('inicio', { ascending: false }).limit(40), sb.from('profiles').select('id,nome,email').eq('papel', 'aluno')]);
    ad.innerHTML = `<div class="card"><h3>Nova mentoria</h3><label>Título</label><input id="mt"><div class="row"><div style="flex:1"><label>Tipo</label><select id="mp"><option value="grupo">Em grupo</option><option value="individual">Individual</option></select></div><div style="flex:1"><label>Início</label><input id="mi" type="datetime-local"></div><div style="flex:1"><label>Duração (min)</label><input id="md" type="number" value="60"></div></div>
    <label>Aluno (só individual)</label><select id="ma"><option value="">—</option>${(al.data || []).map(a => `<option value="${a.id}">${esc(a.nome)} (${esc(a.email)})</option>`).join('')}</select><label>Descrição</label><textarea id="mx" rows="2"></textarea><button id="mk">Criar mentoria</button></div>
    ${(m.data || []).map(x => `<div class="card"><div class="row"><span class="pill">${x.tipo}</span><b>${esc(x.titulo)}</b><span class="mut" style="margin-left:auto">${fmt(x.inicio)}</span><a class="btn sec" target="_blank" rel="noopener" href="${C.JITSI}HortiZ-${esc(x.sala)}">Abrir sala</a><button class="sec del" data-id="${x.id}">Excluir</button></div></div>`).join('')}`;
    $('#mk').onclick = async () => { const r = await sb.from('mentorias').insert({ titulo: $('#mt').value.trim(), tipo: $('#mp').value, inicio: new Date($('#mi').value).toISOString(), duracao_min: +$('#md').value || 60, descricao: $('#mx').value, aluno_id: $('#ma').value || null }); if (r.error) return toast(r.error.message); toast('Mentoria criada'); viewAdmin('mentorias'); };
    document.querySelectorAll('.del').forEach(b => b.onclick = async () => { if (confirm('Excluir esta mentoria?')) { await sb.from('mentorias').delete().eq('id', b.dataset.id); viewAdmin('mentorias'); } });
  }
  if (tab === 'conteudo') {
    ad.innerHTML = `<div class="card"><h3>Enviar vídeos e manuais</h3><p class="mut">Selecione os arquivos. Vídeos (.mp4) vão para a pasta <code>videos/</code> e PDFs para <code>manuais/</code>, com o mesmo nome de arquivo — as 14 aulas já esperam estes nomes.</p><input type="file" id="fl" multiple accept="video/mp4,application/pdf"><button id="up">Enviar</button><div id="ul" class="mut"></div></div>
    <div class="card"><h3>Situação das aulas</h3><div id="st">Verificando…</div></div>`;
    $('#up').onclick = async () => { const fs = [...$('#fl').files]; $('#up').disabled = true; for (const f of fs) { const p = (f.type === 'application/pdf' ? 'manuais/' : 'videos/') + f.name; $('#ul').textContent = 'Enviando ' + f.name + '…'; const { error } = await sb.storage.from(C.BUCKET).upload(p, f, { upsert: true, contentType: f.type }); if (error) { $('#ul').textContent = 'Erro em ' + f.name + ': ' + error.message; break; } $('#ul').textContent = 'Enviado: ' + f.name; } $('#up').disabled = false; viewAdmin('conteudo'); };
    const ls = async d => (await sb.storage.from(C.BUCKET).list(d, { limit: 200 })).data?.map(x => d + '/' + x.name) || []; const have = new Set([...(await ls('videos')), ...(await ls('manuais'))]);
    $('#st').innerHTML = aulas.map(a => `<div>${have.has(a.video_path) ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'} vídeo ${have.has(a.video_celular_path) ? '✓' : '✗'} celular ${have.has(a.manual_path) ? '✓' : '✗'} manual — ${a.ordem}. ${esc(a.titulo)}</div>`).join('');
  }
}

/* ---------- ajude-me ---------- */
async function loadKB() { if (!KB) KB = await (await fetch('kb.json')).json(); return KB; }
const STOP = new Set('a o e de do da dos das em um uma para por com no na nos nas que como se ao os as é ou mais mas já eu meu minha'.split(' '));
const toks = s => (s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{3,}/g) || []).filter(w => !STOP.has(w));
function retrieve(q, n = 5) {
  if (!KB) return ''; const qt = new Set(toks(q)); if (!qt.size) return '';
  return KB.map(c => { const ct = toks(c); let s = 0; const seen = new Set(); ct.forEach(w => { if (qt.has(w) && !seen.has(w)) { seen.add(w); s++; } }); return [s / Math.sqrt(ct.length + 20), c]; }).sort((a, b) => b[0] - a[0]).slice(0, n).filter(x => x[0] > 0).map(x => x[1]).join('\n---\n');
}
async function askAI(body) {
  const { data: { session } } = await sb.auth.getSession();
  try { const r = await fetch(C.SUPABASE_URL + '/functions/v1/ajuda', { method: 'POST', headers: { 'content-type': 'application/json', apikey: C.SUPABASE_KEY, authorization: 'Bearer ' + (session?.access_token || C.SUPABASE_KEY) }, body: JSON.stringify(body) }); return await r.json(); } catch (e) { return { erro: 'Sem conexão com o assistente.' }; }
}
async function openHelp() {
  const p = $('#helpPanel'); await loadKB(); const { data: faq } = await sb.from('faq').select('*').order('id');
  p.classList.remove('hidden');
  p.innerHTML = `<div class="hd"><span>💬 Ajude-me</span><button class="sec" id="hx" style="padding:4px 10px">✕</button></div><div class="bd" id="hb"></div><div class="ft"><input id="hq" placeholder="Digite sua dúvida…"><button id="hs">Enviar</button></div>`;
  const hb = $('#hb'); $('#hx').onclick = () => p.classList.add('hidden');
  hb.innerHTML = `<div class="msg a">Olá, ${esc(me.nome)}! Posso ajudar com o programa. Escolha uma opção ou escreva sua dúvida.</div>
  ${curAula && location.hash.startsWith('#/aula') ? `<p><a class="btn sec" href="#/aula/${curAula.id}" onclick="document.getElementById('helpPanel').classList.add('hidden')">▶ Rever o vídeo desta aula</a></p>` : ''}
  <p class="mut">Perguntas frequentes</p>${(faq || []).map(f => `<details><summary>${esc(f.pergunta)}</summary><div>${esc(f.resposta)}</div></details>`).join('')}<p class="mut">Precisa de conversa ao vivo? Veja <a href="#/mentorias" onclick="document.getElementById('helpPanel').classList.add('hidden')">Mentorias</a>.</p>`;
  const add = (c, t) => { const d = document.createElement('div'); d.className = 'msg ' + c; d.textContent = t; hb.appendChild(d); hb.scrollTop = hb.scrollHeight; return d; };
  const send = async () => { const q = $('#hq').value.trim(); if (!q) return; $('#hq').value = ''; add('u', q); const w = add('a', 'Pensando…'); const ctx = retrieve(q + ' ' + (curAula?.titulo || ''), 6);
    const r = await askAI({ modo: 'ajuda', pergunta: q, contexto: ctx }); w.textContent = r.texto || r.erro || 'Não consegui responder agora.';
    if (r.sem_ia && ctx) w.textContent += '\n\n' + ctx.split('\n---\n').slice(0, 2).join('\n\n').slice(0, 1400);
    sb.from('ajuda_msgs').insert([{ user_id: me.id, papel: 'aluno', conteudo: q, aula_id: curAula?.id || null }, { user_id: me.id, papel: 'ia', conteudo: w.textContent.slice(0, 4000), aula_id: curAula?.id || null }]).then(() => {}); hb.scrollTop = hb.scrollHeight; };
  $('#hs').onclick = send; $('#hq').onkeydown = e => { if (e.key === 'Enter') send(); };
}
$('#helpBtn').onclick = () => { const p = $('#helpPanel'); p.classList.contains('hidden') ? openHelp() : p.classList.add('hidden'); };
boot();
})();
