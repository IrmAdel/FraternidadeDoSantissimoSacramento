(() => {
  const $ = id => document.getElementById(id);
  const API = 'https://api.github.com';
  const ARQUIVO = 'paises.json';
  const ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const ler = (k, s) => { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } };
  const gravar = (k, v, s) => { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} };
  const apagar = (k, s) => { try { (s ? sessionStorage : localStorage).removeItem(k); } catch (e) {} };

  const est = { repo: '', branch: 'main', token: '', itens: [], sha: null, editando: null, nomes: [] };

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
  const num = n => (n === null || n === undefined) ? '—' : n;
  const ordenar = () => est.itens.sort((a, b) => ((a.pais && a.pais.pt) || a.mapa).localeCompare((b.pais && b.pais.pt) || b.mapa, 'pt'));

  // ---------- Dados ----------
  async function carregar() {
    try {
      const r = await gh(`/repos/${est.repo}/contents/${ARQUIVO}?ref=${encodeURIComponent(est.branch)}`);
      est.sha = r.sha;
      est.itens = JSON.parse(b64dec(r.content));
    } catch (e) {
      if (e.status !== 404) throw e;
      est.sha = null; est.itens = [];
    }
    ordenar();
  }

  async function salvar(mensagemCommit) {
    const corpo = { message: mensagemCommit, content: b64enc(JSON.stringify(est.itens, null, 2) + '\n'), branch: est.branch };
    if (est.sha) corpo.sha = est.sha;
    try {
      const r = await gh(`/repos/${est.repo}/contents/${ARQUIVO}`, { method: 'PUT', body: JSON.stringify(corpo) });
      est.sha = r.content.sha;
    } catch (e) {
      if (e.status === 409 || e.status === 422) {
        await carregar(); desenhar();
        throw new Error('Alguém alterou o mapa ao mesmo tempo. A lista foi atualizada; tente de novo.');
      }
      throw e;
    }
  }

  // Nomes de países aceitos pelo mapa (para a lista de sugestões)
  fetch(ATLAS).then(r => r.json()).then(j => {
    est.nomes = j.objects.countries.geometries.map(g => g.properties && g.properties.name).filter(n => n && n !== 'Antarctica').sort();
    const dl = $('nomes-paises'); dl.textContent = '';
    est.nomes.forEach(n => { const o = document.createElement('option'); o.value = n; dl.append(o); });
  }).catch(() => { /* sem a lista, o campo aceita texto livre */ });

  // ---------- Interface ----------
  function desenhar() {
    const ul = $('lista'); ul.textContent = '';
    if (!est.itens.length) { const li = document.createElement('li'); li.textContent = 'Nenhum país cadastrado.'; ul.append(li); return; }
    est.itens.forEach(p => {
      const li = document.createElement('li');
      const nome = document.createElement('strong'); nome.textContent = (p.pais && p.pais.pt) || p.mapa;
      const res = document.createElement('span');
      res.textContent = 'Plenos: ' + num(p.plenos) + ' · Outras denominações: ' + num(p.outras) + ' · Observadores: ' + num(p.observadores);
      const bts = document.createElement('div'); bts.className = 'bts';
      const ed = document.createElement('button'); ed.type = 'button'; ed.className = 'btn sec peq'; ed.textContent = 'Editar';
      ed.addEventListener('click', () => editar(p.mapa));
      const ex = document.createElement('button'); ex.type = 'button'; ex.className = 'btn perigo'; ex.textContent = 'Excluir';
      ex.addEventListener('click', () => excluir(p.mapa));
      bts.append(ed, ex); li.append(nome, res, bts); ul.append(li);
    });
  }

  function limparForm() {
    est.editando = null;
    $('form-post').reset();
    $('titulo-form').textContent = 'Novo país';
    $('publicar').textContent = 'Adicionar ao mapa';
    $('cancelar').hidden = true;
  }

  function editar(chave) {
    const p = est.itens.find(x => x.mapa === chave); if (!p) return;
    limparForm();
    est.editando = chave;
    $('m-pais').value = p.mapa;
    $('m-pt').value = (p.pais && p.pais.pt) || ''; $('m-es').value = (p.pais && p.pais.es) || '';
    $('m-ig-pt').value = (p.igreja && p.igreja.pt) || ''; $('m-ig-es').value = (p.igreja && p.igreja.es) || '';
    $('m-plenos').value = p.plenos ?? ''; $('m-outras').value = p.outras ?? ''; $('m-obs').value = p.observadores ?? '';
    $('m-site').value = p.site || '';
    $('titulo-form').textContent = 'Editar país';
    $('publicar').textContent = 'Salvar alterações';
    $('cancelar').hidden = false;
    msg($('st-post'), '');
    $('form-post').scrollIntoView({ behavior: 'smooth' });
  }

  async function excluir(chave) {
    const p = est.itens.find(x => x.mapa === chave); if (!p) return;
    if (!confirm('Tirar "' + ((p.pais && p.pais.pt) || p.mapa) + '" do mapa?')) return;
    const antes = est.itens;
    est.itens = est.itens.filter(x => x.mapa !== chave);
    try {
      await salvar('Remover país do mapa: ' + p.mapa);
      if (est.editando === chave) limparForm();
      desenhar(); msg($('st-post'), 'País removido. O site atualiza em cerca de 1 minuto.', 'ok');
    } catch (e) { est.itens = antes; msg($('st-post'), e.message, 'erro'); }
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
    const st = $('st-login'); msg(st, 'Verificando...');
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
    const digitado = $('m-pais').value.trim();
    const achado = est.nomes.find(n => n.toLowerCase() === digitado.toLowerCase());
    if (est.nomes.length && !achado) { msg(st, 'Escolha o país na lista de sugestões (nome em inglês, como Brazil).', 'erro'); return; }
    const mapa = achado || digitado;
    if (est.itens.some(i => i.mapa.toLowerCase() === mapa.toLowerCase() && i.mapa !== est.editando)) { msg(st, 'Esse país já está no mapa. Edite o que já existe.', 'erro'); return; }
    const site = $('m-site').value.trim();
    if (site && !/^https?:\/\//i.test(site)) { msg(st, 'O site precisa começar com http:// ou https://', 'erro'); return; }
    const n = id => { const v = $(id).value.trim(); return v === '' ? null : Math.max(0, parseInt(v, 10) || 0); };
    const novo = {
      mapa,
      pais: { pt: $('m-pt').value.trim(), es: $('m-es').value.trim() },
      igreja: { pt: $('m-ig-pt').value.trim(), es: $('m-ig-es').value.trim() },
      plenos: n('m-plenos'), outras: n('m-outras'), observadores: n('m-obs'),
      site
    };
    const antes = est.itens;
    est.itens = est.editando ? est.itens.map(i => i.mapa === est.editando ? novo : i) : [...est.itens, novo];
    ordenar();
    $('publicar').disabled = true; msg(st, 'Salvando...');
    try {
      await salvar((est.editando ? 'Editar país do mapa: ' : 'Novo país no mapa: ') + mapa);
      limparForm(); desenhar();
      msg(st, 'Salvo. O site atualiza em cerca de 1 minuto.', 'ok');
    } catch (err) { est.itens = antes; msg(st, err.message, 'erro'); }
    $('publicar').disabled = false;
  });

  $('cancelar').addEventListener('click', () => { limparForm(); msg($('st-post'), ''); });
  $('sair').addEventListener('click', () => { apagar('token'); apagar('token', true); location.reload(); });

  // ---------- Início (reaproveita o login dos outros admins) ----------
  $('repo').value = ler('repo') || '';
  $('branch').value = ler('branch') || 'main';
  const guardado = ler('token', true) || ler('token');
  if (guardado && $('repo').value) {
    $('token').value = guardado;
    $('lembrar').checked = !!ler('token');
    $('form-login').requestSubmit();
  }
})();
