(() => {
  const $ = id => document.getElementById(id);
  const API = 'https://api.github.com';
  const ARQUIVO = 'comentarios-ocultos.json';
  const CFG = window.PUB_CONFIG || {};
  const ler = (k, s) => { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } };
  const gravar = (k, v, s) => { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} };
  const apagar = (k, s) => { try { (s ? sessionStorage : localStorage).removeItem(k); } catch (e) {} };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const msg = (e, texto, tipo) => { e.textContent = texto; e.className = 'status' + (tipo ? ' ' + tipo : ''); };

  const est = { repo: '', branch: 'main', token: '', comentarios: [], posts: [], ocultos: [], sha: null, filtro: '' };

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

  // Leitura dos comentários (pública) no Supabase
  function sb(caminho) {
    const h = { apikey: CFG.supabaseKey };
    if (/^eyJ/.test(CFG.supabaseKey)) h.Authorization = 'Bearer ' + CFG.supabaseKey;
    return fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + caminho, { headers: h })
      .then(r => { if (!r.ok) throw new Error('Supabase ' + r.status); return r.json(); });
  }

  const tituloPost = id => { const p = est.posts.find(x => x.id === id); return p ? p.titulo : '(publicação removida)'; };
  const hora = iso => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  // Ocultos de fato: os marcados + as respostas a eles
  function efetivos() {
    const diretos = new Set(est.ocultos), ef = new Set();
    [...est.comentarios].sort((a, b) => a.criado_em.localeCompare(b.criado_em)).forEach(c => {
      if (diretos.has(c.id) || (c.parent_id && ef.has(c.parent_id))) ef.add(c.id);
    });
    return ef;
  }
  function respostas(id) {
    const saida = [];
    const visitar = pai => est.comentarios.filter(c => c.parent_id === pai).forEach(c => { saida.push(c.id); visitar(c.id); });
    visitar(id);
    return saida;
  }

  async function carregarOcultos() {
    try {
      const r = await gh(`/repos/${est.repo}/contents/${ARQUIVO}?ref=${encodeURIComponent(est.branch)}`);
      est.sha = r.sha; est.ocultos = JSON.parse(b64dec(r.content));
      if (!Array.isArray(est.ocultos)) est.ocultos = [];
    } catch (e) {
      if (e.status !== 404) throw e;
      est.sha = null; est.ocultos = [];
    }
  }

  async function salvarOcultos(mensagemCommit) {
    const corpo = { message: mensagemCommit, content: b64enc(JSON.stringify(est.ocultos, null, 2) + '\n'), branch: est.branch };
    if (est.sha) corpo.sha = est.sha;
    try {
      const r = await gh(`/repos/${est.repo}/contents/${ARQUIVO}`, { method: 'PUT', body: JSON.stringify(corpo) });
      est.sha = r.content.sha;
    } catch (e) {
      if (e.status === 409 || e.status === 422) {
        await carregarOcultos(); desenhar();
        throw new Error('Alguém alterou a lista ao mesmo tempo. Ela foi atualizada; tente de novo.');
      }
      throw e;
    }
  }

  function desenhar() {
    const ef = efetivos(), diretos = new Set(est.ocultos);
    const ul = $('lista'); ul.textContent = '';
    const itens = est.comentarios.filter(c => !est.filtro || c.post_id === est.filtro);
    const nOcultos = itens.filter(c => ef.has(c.id)).length;
    $('contagem').textContent = itens.length + (itens.length === 1 ? ' comentário' : ' comentários') + (nOcultos ? ' (' + nOcultos + ' apagado' + (nOcultos > 1 ? 's' : '') + ' do site)' : '');
    if (!itens.length) { ul.append(el('li', 'vazio-c', 'Nenhum comentário.')); return; }
    itens.forEach(c => {
      const oculto = ef.has(c.id);
      const li = el('li', 'com-adm' + (oculto ? ' oculto' : ''));
      const cab = el('div', 'cab');
      cab.append(el('strong', null, c.apelido), el('time', null, hora(c.criado_em)));
      const a = el('a', null, tituloPost(c.post_id)); a.href = 'publicacao.html?id=' + encodeURIComponent(c.post_id); a.target = '_blank'; a.rel = 'noopener';
      cab.append(a); li.append(cab);
      if (c.parent_id) {
        const pai = est.comentarios.find(x => x.id === c.parent_id);
        li.append(el('p', 'resp-em', '↳ em resposta a ' + (pai ? pai.apelido : '(comentário removido)')));
      }
      li.append(el('p', 'txt', c.texto));
      if (!oculto) {
        const b = el('button', 'btn perigo', 'Apagar do site'); b.type = 'button';
        b.addEventListener('click', () => mudar(c, true, b)); li.append(b);
      } else if (diretos.has(c.id)) {
        li.append(el('p', 'resp-em', 'Apagado do site.'));
        const b = el('button', 'btn sec peq', 'Restaurar'); b.type = 'button';
        b.addEventListener('click', () => mudar(c, false, b)); li.append(b);
      } else {
        li.append(el('p', 'resp-em', 'Apagado junto com o comentário ao qual responde.'));
      }
      ul.append(li);
    });
  }

  function preencherFiltro() {
    const s = $('filtro-post'); s.textContent = '';
    const todas = el('option', null, 'Todas as publicações'); todas.value = ''; s.append(todas);
    [...new Set(est.comentarios.map(c => c.post_id))].forEach(id => { const o = el('option', null, tituloPost(id)); o.value = id; s.append(o); });
    s.value = est.filtro;
  }

  async function carregarTudo() {
    if (!CFG.supabaseUrl || !CFG.supabaseKey) throw new Error('O config.js não está preenchido com os dados do Supabase.');
    const [com, posts] = await Promise.all([
      sb('comentarios?select=id,post_id,parent_id,apelido,texto,criado_em&order=criado_em.desc&limit=1000'),
      fetch('publicacoes.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);
    await carregarOcultos();
    est.comentarios = com; est.posts = posts;
    preencherFiltro(); desenhar();
  }

  async function mudar(c, ocultar, botao) {
    const st = $('st-lista');
    if (ocultar) {
      const ef = efetivos();
      const n = respostas(c.id).filter(id => !ef.has(id)).length;
      if (!confirm('Apagar do site o comentário de "' + c.apelido + '"?' + (n ? '\n\nAs ' + n + ' resposta(s) a ele também deixam de aparecer.' : '') + '\n\nVocê pode restaurar depois.')) return;
    }
    const antes = est.ocultos;
    est.ocultos = ocultar ? [...antes, c.id] : antes.filter(x => x !== c.id);
    botao.disabled = true; msg(st, 'Salvando...');
    try {
      await salvarOcultos((ocultar ? 'Apagar do site: comentário de ' : 'Restaurar comentário de ') + c.apelido);
      desenhar();
      msg(st, (ocultar ? 'Comentário apagado do site.' : 'Comentário restaurado.') + ' A mudança aparece em cerca de 1 minuto.', 'ok');
    } catch (e) { est.ocultos = antes; botao.disabled = false; msg(st, e.message, 'erro'); }
  }

  // ---------- Entrada (mesmo login dos outros admins) ----------
  $('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    est.repo = $('repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    est.branch = $('branch').value.trim() || 'main';
    est.token = $('token').value.trim();
    const st = $('st-login'); msg(st, 'Verificando...');
    try {
      const r = await gh('/repos/' + est.repo);
      if (!r.permissions || !r.permissions.push) throw new Error('Esta conta não tem permissão de escrita no repositório.');
      await carregarTudo();
      gravar('repo', est.repo); gravar('branch', est.branch);
      if ($('lembrar').checked) { gravar('token', est.token); apagar('token', true); } else { gravar('token', est.token, true); apagar('token'); }
      msg(st, '');
      $('login').hidden = true; $('painel').hidden = false;
      $('quem').textContent = 'Conectado a ' + est.repo + ' (' + est.branch + ')';
    } catch (err) {
      msg(st, err.status === 401 ? 'Token inválido ou expirado.' : err.status === 404 ? 'Repositório não encontrado. Confira o nome e as permissões do token.' : err.message, 'erro');
    }
  });

  $('filtro-post').addEventListener('change', () => { est.filtro = $('filtro-post').value; desenhar(); });
  $('atualizar').addEventListener('click', async () => {
    const st = $('st-lista'); msg(st, 'Atualizando...');
    try { await carregarTudo(); msg(st, ''); } catch (e) { msg(st, 'Não foi possível atualizar.', 'erro'); }
  });
  $('sair').addEventListener('click', () => { apagar('token'); apagar('token', true); location.reload(); });

  $('repo').value = ler('repo') || '';
  $('branch').value = ler('branch') || 'main';
  const guardado = ler('token', true) || ler('token');
  if (guardado && $('repo').value) {
    $('token').value = guardado;
    $('lembrar').checked = !!ler('token');
    $('form-login').requestSubmit();
  }
})();
