(() => {
  const html = document.documentElement;
  const $ = id => document.getElementById(id);
  const CFG = window.PUB_CONFIG || {};
  const ler = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const T = {
    pt: {
      pub_tit: 'Notícias e ensaios', pub_sub: 'o que acontece e o que pensamos na Fraternidade',
      todas: 'Todas', noticias: 'Notícias', ensaios: 'Ensaios', noticia: 'Notícia', ensaio: 'Ensaio',
      vazio: 'Nenhuma publicação ainda.', erro: 'Não foi possível carregar as publicações.',
      mais: 'Mostrar mais', voltar: '← Todas as publicações', naoachou: 'Publicação não encontrada.',
      com: 'Comentários', semcom: 'Seja o primeiro a comentar.',
      aviso: 'Os comentários são 100% anônimos: não pedimos conta, e-mail nem nome. Escolha um apelido e escreva com respeito.',
      apelido: 'Apelido', coment: 'Seu comentário', enviar: 'Comentar', responder: 'Responder', cancelar: 'cancelar',
      respA: 'Respondendo a', enviando: 'Enviando...', ok: 'Comentário publicado.',
      falha: 'Não foi possível enviar. Tente de novo.', espere: 'Aguarde alguns segundos antes de comentar de novo.',
      semcfg: 'Os comentários ainda não foram configurados neste site.', erroC: 'Não foi possível carregar os comentários.',
      carregando: 'Carregando comentários...', soPt: 'Este texto está disponível apenas em português.', sufixo: 'Fraternidade do Santíssimo Sacramento'
    },
    es: {
      pub_tit: 'Noticias y ensayos', pub_sub: 'lo que ocurre y lo que pensamos en la Fraternidad',
      todas: 'Todas', noticias: 'Noticias', ensaios: 'Ensayos', noticia: 'Noticia', ensaio: 'Ensayo',
      vazio: 'Aún no hay publicaciones.', erro: 'No se pudieron cargar las publicaciones.',
      mais: 'Mostrar más', voltar: '← Todas las publicaciones', naoachou: 'Publicación no encontrada.',
      com: 'Comentarios', semcom: 'Sé la primera persona en comentar.',
      aviso: 'Los comentarios son 100% anónimos: no pedimos cuenta, correo ni nombre. Elige un apodo y escribe con respeto.',
      apelido: 'Apodo', coment: 'Tu comentario', enviar: 'Comentar', responder: 'Responder', cancelar: 'cancelar',
      respA: 'Respondiendo a', enviando: 'Enviando...', ok: 'Comentario publicado.',
      falha: 'No se pudo enviar. Inténtalo de nuevo.', espere: 'Espera unos segundos antes de volver a comentar.',
      semcfg: 'Los comentarios aún no se han configurado en este sitio.', erroC: 'No se pudieron cargar los comentarios.',
      carregando: 'Cargando comentarios...', soPt: 'Este texto solo está disponible en portugués.', sufixo: 'Fraternidad del Santísimo Sacramento'
    }
  };
  const lang = () => html.dataset.idioma === 'es' ? 'es' : 'pt';
  const t = k => T[lang()][k];
  const loc = () => lang() === 'es' ? 'es' : 'pt-BR';

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const fmtData = d => new Date(d + 'T00:00:00Z').toLocaleDateString(loc(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const fmtHora = iso => new Date(iso).toLocaleString(loc(), { dateStyle: 'short', timeStyle: 'short' });
  // texto no idioma escolhido; se não houver tradução, cai para o português
  const tit = p => (lang() === 'es' && p.es && p.es.titulo) || p.titulo;
  const txt = p => (lang() === 'es' && p.es && p.es.texto) || p.texto;
  const traduzido = p => !!(p.es && p.es.titulo && p.es.texto);
  const foto = p => (p.foto && /^imagens\//.test(p.foto)) ? p.foto : '';
  const paragrafos = (txt, alvo) => String(txt || '').split(/\n\s*\n/).forEach(x => { if (x.trim()) alvo.append(el('p', null, x.trim())); });
  const tagEl = p => el('span', 'tag ' + (p.tag === 'ensaio' ? 'ensaio' : 'noticia'), t(p.tag === 'ensaio' ? 'ensaio' : 'noticia'));

  function textosFixos() {
    document.querySelectorAll('[data-k]').forEach(e => { e.textContent = t(e.dataset.k); });
    document.querySelectorAll('[data-kp]').forEach(e => { e.placeholder = t(e.dataset.kp); });
  }

  let posts = null; // null = carregando, false = erro
  const carregarPosts = () => fetch('publicacoes.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(j => { posts = j.sort((a, b) => b.date.localeCompare(a.date)); })
    .catch(() => { posts = false; });

  // =============== LISTA ===============
  const grade = $('grade');
  let filtro = 'todas', limite = 9;

  function renderLista() {
    grade.textContent = '';
    document.querySelectorAll('.filtros button').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === filtro));
    const maisBtn = $('mais'); maisBtn.hidden = true;
    if (posts === null) return;
    if (posts === false) { grade.append(el('p', null, t('erro'))); return; }
    const itens = posts.filter(p => filtro === 'todas' || p.tag === filtro);
    if (!itens.length) { grade.append(el('p', null, t('vazio'))); return; }
    itens.slice(0, limite).forEach(p => {
      const a = el('a', 'cartao'); a.href = 'publicacao.html?id=' + encodeURIComponent(p.id);
      const f = el('div', 'foto');
      if (foto(p)) { const i = el('img'); i.src = foto(p); i.alt = ''; i.loading = 'lazy'; f.append(i); }
      else { f.classList.add('sem-foto'); const i = el('img'); i.src = 'logo.png'; i.alt = ''; f.append(i); }
      const meta = el('div', 'meta'); const tm = el('time', null, fmtData(p.date)); tm.dateTime = p.date;
      meta.append(tagEl(p), tm);
      const h = el('h3', null, tit(p));
      const primeiro = String(txt(p) || '').split(/\n\s*\n/)[0].trim();
      const ex = el('p', 'resumo', primeiro.length > 170 ? primeiro.slice(0, 167).trimEnd() + '…' : primeiro);
      a.append(f, meta, h, ex); grade.append(a);
    });
    maisBtn.hidden = itens.length <= limite;
  }

  // =============== POSTAGEM ===============
  const artigo = $('artigo');
  const id = new URLSearchParams(location.search).get('id');
  let postAtual = null, comentarios = [], paiAtual = null, ultimo = 0, comErro = false, comCarregando = true;

  function renderPost() {
    artigo.textContent = '';
    const voltar = el('a', 'voltar', t('voltar')); voltar.href = 'publicacoes.html';
    artigo.append(voltar);
    if (posts === null) return;
    if (posts === false) { artigo.append(el('p', null, t('erro'))); return; }
    postAtual = posts.find(p => p.id === id);
    $('comentarios').hidden = !postAtual;
    if (!postAtual) { artigo.append(el('p', null, t('naoachou'))); return; }
    const p = postAtual;
    document.title = tit(p) + ' | ' + t('sufixo');
    const meta = el('div', 'meta'); const tm = el('time', null, fmtData(p.date)); tm.dateTime = p.date;
    meta.append(tagEl(p), tm);
    artigo.append(meta, el('h1', null, tit(p)));
    if (foto(p)) { const fg = el('figure'); const i = el('img'); i.src = foto(p); i.alt = tit(p); fg.append(i); artigo.append(fg); }
    if (lang() === 'es' && !traduzido(p)) artigo.append(el('p', 'aviso-idioma', t('soPt')));
    const corpo = el('div', 'corpo'); paragrafos(txt(p), corpo); artigo.append(corpo);
  }

  // ----- Supabase (REST) -----
  const configurado = () => !!(CFG.supabaseUrl && CFG.supabaseKey);
  function sb(caminho, opcoes = {}) {
    const h = { apikey: CFG.supabaseKey, 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
    if (/^eyJ/.test(CFG.supabaseKey)) h.Authorization = 'Bearer ' + CFG.supabaseKey;
    return fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + caminho, { ...opcoes, headers: h })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.status === 204 ? null : r.json(); });
  }

  function arvore() {
    const m = new Map(); comentarios.forEach(c => m.set(c.id, { ...c, f: [] }));
    const raiz = [];
    m.forEach(c => { const pai = c.parent_id && m.get(c.parent_id); (pai ? pai.f : raiz).push(c); });
    return raiz;
  }

  function no(c, prof) {
    const li = el('li', 'comentario'); li.id = 'c-' + c.id;
    const cab = el('div', 'cab'); const tm = el('time', null, fmtHora(c.criado_em)); tm.dateTime = c.criado_em;
    cab.append(el('strong', null, c.apelido), tm);
    const b = el('button', 'btn-link', t('responder')); b.type = 'button';
    b.addEventListener('click', () => responderA(c, b));
    li.append(cab, el('p', null, c.texto), b);
    if (c.f.length) { const ul = el('ul', 'filhos' + (prof >= 3 ? ' plano' : '')); c.f.forEach(x => ul.append(no(x, prof + 1))); li.append(ul); }
    return li;
  }

  function renderComentarios() {
    if (!artigo) return;
    cancelarResposta();
    const lista = $('c-lista'); lista.textContent = '';
    $('c-tit').textContent = t('com') + (comentarios.length ? ' (' + comentarios.length + ')' : '');
    $('form-com').hidden = !configurado();
    if (!configurado()) { lista.append(el('li', 'vazio-c', t('semcfg'))); return; }
    if (comCarregando) { lista.append(el('li', 'vazio-c', t('carregando'))); return; }
    if (comErro) { lista.append(el('li', 'vazio-c', t('erroC'))); return; }
    if (!comentarios.length) { lista.append(el('li', 'vazio-c', t('semcom'))); return; }
    arvore().forEach(c => lista.append(no(c, 0)));
  }

  async function carregarComentarios() {
    if (!configurado()) { comCarregando = false; renderComentarios(); return; }
    try {
      comentarios = await sb('comentarios?select=id,parent_id,apelido,texto,criado_em&post_id=eq.' + encodeURIComponent(id) + '&order=criado_em.asc&limit=1000');
      comErro = false;
    } catch (e) { comErro = true; }
    comCarregando = false; renderComentarios();
  }

  function responderA(c, botao) {
    paiAtual = c;
    botao.after($('form-com'));
    $('resp-txt').textContent = t('respA') + ' ' + c.apelido;
    $('resp-a').hidden = false;
    $('c-texto').focus();
  }
  function cancelarResposta() {
    paiAtual = null;
    $('resp-a').hidden = true;
    const slot = $('slot-form'); if (!slot.contains($('form-com'))) slot.append($('form-com'));
  }
  const msgC = (txt, tipo) => { const s = $('c-st'); s.textContent = txt; s.className = 'status' + (tipo ? ' ' + tipo : ''); };

  if (artigo) {
    $('resp-x').addEventListener('click', cancelarResposta);
    $('c-apelido').value = ler('apelido') || '';
    $('form-com').addEventListener('submit', async e => {
      e.preventDefault();
      if ($('c-site').value) return; // isca anti-robô
      const agora = Date.now();
      if (agora - ultimo < 20000) { msgC(t('espere'), 'erro'); return; }
      const apelido = $('c-apelido').value.trim(), texto = $('c-texto').value.trim();
      if (!apelido || !texto) return;
      const btn = $('c-enviar'); btn.disabled = true; msgC(t('enviando'));
      try {
        const r = await sb('comentarios', {
          method: 'POST', headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ post_id: id, parent_id: paiAtual ? paiAtual.id : null, apelido, texto })
        });
        comentarios.push(r[0]); ultimo = agora; guardar('apelido', apelido);
        $('c-texto').value = '';
        renderComentarios();
        msgC(t('ok'), 'ok');
        const novo = document.getElementById('c-' + r[0].id); if (novo) novo.scrollIntoView({ block: 'center' });
      } catch (err) { msgC(t('falha'), 'erro'); }
      btn.disabled = false;
    });
  }

  // =============== Início ===============
  function tudo() {
    textosFixos();
    if (grade) renderLista();
    if (artigo) { renderPost(); if (postAtual || posts === null) renderComentarios(); }
  }
  if (grade) {
    document.querySelectorAll('.filtros button').forEach(b => b.addEventListener('click', () => { filtro = b.dataset.f; limite = 9; renderLista(); }));
    $('mais').addEventListener('click', () => { limite += 9; renderLista(); });
  }
  new MutationObserver(tudo).observe(html, { attributes: true, attributeFilter: ['data-idioma'] });
  tudo();
  carregarPosts().then(() => {
    tudo();
    if (artigo && postAtual) carregarComentarios();
  });
})();
