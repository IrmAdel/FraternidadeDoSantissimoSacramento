(() => {
  const $ = id => document.getElementById(id);
  const API = 'https://api.github.com';
  const ARQUIVO = 'posts.json';
  const ler = (k, s) => { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } };
  const gravar = (k, v, s) => { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} };
  const apagar = (k, s) => { try { (s ? sessionStorage : localStorage).removeItem(k); } catch (e) {} };

  const est = { repo: '', branch: 'main', token: '', posts: [], sha: null, editando: null };

  // Texto <-> base64 com suporte a acentos
  const b64enc = s => { let b = ''; new TextEncoder().encode(s).forEach(x => b += String.fromCharCode(x)); return btoa(b); };
  const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));

  async function gh(caminho, opcoes = {}) {
    const r = await fetch(API + caminho, {
      ...opcoes,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + est.token,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opcoes.headers || {})
      }
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(dados.message || r.statusText); e.status = r.status; throw e; }
    return dados;
  }

  const msg = (el, texto, tipo) => { el.textContent = texto; el.className = 'status' + (tipo ? ' ' + tipo : ''); };
  const hoje = () => new Date().toISOString().slice(0, 10);

  // ---------- Dados ----------
  async function carregar() {
    try {
      const r = await gh(`/repos/${est.repo}/contents/${ARQUIVO}?ref=${encodeURIComponent(est.branch)}`);
      est.sha = r.sha;
      est.posts = JSON.parse(b64dec(r.content));
    } catch (e) {
      if (e.status !== 404) throw e;
      est.sha = null; est.posts = [];
    }
    est.posts.sort((a, b) => b.date.localeCompare(a.date));
  }

  async function salvar(mensagemCommit) {
    const corpo = { message: mensagemCommit, content: b64enc(JSON.stringify(est.posts, null, 2) + '\n'), branch: est.branch };
    if (est.sha) corpo.sha = est.sha;
    try {
      const r = await gh(`/repos/${est.repo}/contents/${ARQUIVO}`, { method: 'PUT', body: JSON.stringify(corpo) });
      est.sha = r.content.sha;
    } catch (e) {
      if (e.status === 409 || e.status === 422) {
        await carregar(); desenhar();
        throw new Error('Alguém alterou as novidades ao mesmo tempo. A lista foi atualizada; tente de novo.');
      }
      throw e;
    }
  }

  // ---------- Interface ----------
  function desenhar() {
    const ul = $('lista');
    ul.textContent = '';
    if (!est.posts.length) { const li = document.createElement('li'); li.textContent = 'Nenhuma novidade publicada.'; ul.append(li); return; }
    est.posts.forEach(p => {
      const li = document.createElement('li');
      const t = document.createElement('time'); t.textContent = p.date.split('-').reverse().join('/');
      const n = document.createElement('span'); n.textContent = p.pt.titulo;
      const bts = document.createElement('div'); bts.className = 'bts';
      const ed = document.createElement('button'); ed.type = 'button'; ed.className = 'btn sec peq'; ed.textContent = 'Editar';
      ed.addEventListener('click', () => editar(p.id));
      const ex = document.createElement('button'); ex.type = 'button'; ex.className = 'btn perigo'; ex.textContent = 'Excluir';
      ex.addEventListener('click', () => excluir(p.id));
      bts.append(ed, ex); li.append(t, n, bts); ul.append(li);
    });
  }

  function limparForm() {
    est.editando = null;
    $('form-post').reset();
    $('data').value = hoje();
    $('titulo-form').textContent = 'Nova novidade';
    $('publicar').textContent = 'Publicar';
    $('cancelar').hidden = true;
  }

  function editar(id) {
    const p = est.posts.find(x => x.id === id); if (!p) return;
    est.editando = id;
    $('data').value = p.date;
    $('t-pt').value = p.pt.titulo; $('x-pt').value = p.pt.texto;
    $('t-es').value = (p.es && p.es.titulo) || ''; $('x-es').value = (p.es && p.es.texto) || '';
    $('titulo-form').textContent = 'Editar novidade';
    $('publicar').textContent = 'Salvar alterações';
    $('cancelar').hidden = false;
    msg($('st-post'), '');
    $('form-post').scrollIntoView({ behavior: 'smooth' });
  }

  async function excluir(id) {
    const p = est.posts.find(x => x.id === id); if (!p) return;
    if (!confirm('Excluir "' + p.pt.titulo + '"?')) return;
    const antes = est.posts;
    est.posts = est.posts.filter(x => x.id !== id);
    try {
      await salvar('Remover novidade: ' + p.pt.titulo);
      if (est.editando === id) limparForm();
      desenhar(); msg($('st-post'), 'Novidade excluída. O site atualiza em cerca de 1 minuto.', 'ok');
    } catch (e) { est.posts = antes; msg($('st-post'), e.message, 'erro'); }
  }

  function abrirPainel() {
    $('login').hidden = true; $('painel').hidden = false;
    $('quem').textContent = 'Conectado a ' + est.repo + ' (' + est.branch + ')';
    limparForm(); desenhar();
  }

  // ---------- Eventos ----------
  $('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    est.repo = $('repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    est.branch = $('branch').value.trim() || 'main';
    est.token = $('token').value.trim();
    const st = $('st-login');
    msg(st, 'Verificando...');
    try {
      const r = await gh('/repos/' + est.repo);
      if (!r.permissions || !r.permissions.push) throw new Error('Esta conta não tem permissão de escrita no repositório.');
      await carregar();
      gravar('repo', est.repo); gravar('branch', est.branch);
      if ($('lembrar').checked) { gravar('token', est.token); apagar('token', true); } else { gravar('token', est.token, true); apagar('token'); }
      msg(st, ''); abrirPainel();
    } catch (err) {
      msg(st, err.status === 401 ? 'Token inválido ou expirado.' : err.status === 404 ? 'Repositório não encontrado. Confira o nome e as permissões do token.' : err.message, 'erro');
    }
  });

  $('form-post').addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('st-post');
    const novo = {
      id: est.editando || Date.now().toString(36),
      date: $('data').value,
      pt: { titulo: $('t-pt').value.trim(), texto: $('x-pt').value.trim() },
      es: { titulo: $('t-es').value.trim(), texto: $('x-es').value.trim() }
    };
    const antes = est.posts;
    est.posts = est.editando ? est.posts.map(p => p.id === est.editando ? novo : p) : [novo, ...est.posts];
    est.posts.sort((a, b) => b.date.localeCompare(a.date));
    $('publicar').disabled = true; msg(st, 'Publicando...');
    try {
      await salvar((est.editando ? 'Editar novidade: ' : 'Nova novidade: ') + novo.pt.titulo);
      limparForm(); desenhar();
      msg(st, 'Publicado. O site atualiza em cerca de 1 minuto.', 'ok');
    } catch (err) { est.posts = antes; msg(st, err.message, 'erro'); }
    $('publicar').disabled = false;
  });

  $('cancelar').addEventListener('click', () => { limparForm(); msg($('st-post'), ''); });
  $('sair').addEventListener('click', () => { apagar('token'); apagar('token', true); location.reload(); });

  // ---------- Início ----------
  $('repo').value = ler('repo') || '';
  $('branch').value = ler('branch') || 'main';
  const guardado = ler('token', true) || ler('token');
  if (guardado && $('repo').value) {
    $('token').value = guardado;
    $('lembrar').checked = !!ler('token');
    $('form-login').requestSubmit();
  }
})();
