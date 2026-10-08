(() => {
  const $ = id => document.getElementById(id);
  const API = 'https://api.github.com';
  const ARQUIVO = 'publicacoes.json';
  const ler = (k, s) => { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } };
  const gravar = (k, v, s) => { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} };
  const apagar = (k, s) => { try { (s ? sessionStorage : localStorage).removeItem(k); } catch (e) {} };

  const est = { repo: '', branch: 'main', token: '', posts: [], sha: null, editando: null, fotoAtual: '', fotoNova: null, removerFoto: false };

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
  const rotuloTag = t => t === 'ensaio' ? 'Ensaio' : 'Notícia';

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
        throw new Error('Alguém alterou as publicações ao mesmo tempo. A lista foi atualizada; tente de novo.');
      }
      throw e;
    }
  }

  // ---------- Fotos ----------
  // Reduz para no máximo 1600 px e converte em JPEG (arquivos leves, site rápido)
  function reduzir(arquivo) {
    return new Promise((ok, falha) => {
      const img = new Image(), url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const e = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * e); c.height = Math.round(img.height * e);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = () => falha(new Error('Não foi possível ler essa imagem. Use JPG, PNG ou WebP.'));
      img.src = url;
    });
  }

  async function enviarFoto(id, b64, titulo) {
    const caminho = `imagens/${id}-${Date.now().toString(36)}.jpg`;
    await gh(`/repos/${est.repo}/contents/${caminho}`, { method: 'PUT', body: JSON.stringify({ message: 'Foto: ' + titulo, content: b64, branch: est.branch }) });
    return caminho;
  }

  async function apagarArquivo(caminho) {
    if (!caminho) return;
    try {
      const r = await gh(`/repos/${est.repo}/contents/${caminho}?ref=${encodeURIComponent(est.branch)}`);
      await gh(`/repos/${est.repo}/contents/${caminho}`, { method: 'DELETE', body: JSON.stringify({ message: 'Remover foto', sha: r.sha, branch: est.branch }) });
    } catch (e) { /* se falhar, a foto fica órfã no repositório; não atrapalha o site */ }
  }

  function previa(src) {
    const box = $('previa'); box.textContent = '';
    $('rem-foto').hidden = !src;
    if (!src) return;
    const i = document.createElement('img'); i.className = 'previa'; i.alt = 'Prévia da foto'; i.src = src; box.append(i);
  }

  // ---------- Interface ----------
  function desenhar() {
    const ul = $('lista'); ul.textContent = '';
    if (!est.posts.length) { const li = document.createElement('li'); li.textContent = 'Nenhuma publicação ainda.'; ul.append(li); return; }
    est.posts.forEach(p => {
      const li = document.createElement('li');
      const t = document.createElement('time'); t.textContent = p.date.split('-').reverse().join('/');
      const n = document.createElement('span'); n.textContent = '[' + rotuloTag(p.tag) + (p.es && p.es.titulo && p.es.texto ? ' · ES' : '') + '] ' + p.titulo;
      const bts = document.createElement('div'); bts.className = 'bts';
      const ver = document.createElement('a'); ver.className = 'btn sec peq'; ver.textContent = 'Ver'; ver.href = 'publicacao.html?id=' + encodeURIComponent(p.id); ver.target = '_blank'; ver.rel = 'noopener';
      const ed = document.createElement('button'); ed.type = 'button'; ed.className = 'btn sec peq'; ed.textContent = 'Editar';
      ed.addEventListener('click', () => editar(p.id));
      const ex = document.createElement('button'); ex.type = 'button'; ex.className = 'btn perigo'; ex.textContent = 'Excluir';
      ex.addEventListener('click', () => excluir(p.id));
      bts.append(ver, ed, ex); li.append(t, n, bts); ul.append(li);
    });
  }

  function limparForm() {
    est.editando = null; est.fotoAtual = ''; est.fotoNova = null; est.removerFoto = false;
    $('form-post').reset(); $('data').value = hoje(); previa('');
    $('titulo-form').textContent = 'Nova publicação';
    $('publicar').textContent = 'Publicar';
    $('cancelar').hidden = true;
  }

  function editar(id) {
    const p = est.posts.find(x => x.id === id); if (!p) return;
    limparForm();
    est.editando = id; est.fotoAtual = p.foto || '';
    $('tag').value = p.tag === 'ensaio' ? 'ensaio' : 'noticia';
    $('data').value = p.date; $('titulo').value = p.titulo; $('texto').value = p.texto;
    $('t-es').value = (p.es && p.es.titulo) || ''; $('x-es').value = (p.es && p.es.texto) || '';
    previa(p.foto || '');
    $('titulo-form').textContent = 'Editar publicação';
    $('publicar').textContent = 'Salvar alterações';
    $('cancelar').hidden = false;
    msg($('st-post'), '');
    $('form-post').scrollIntoView({ behavior: 'smooth' });
  }

  async function excluir(id) {
    const p = est.posts.find(x => x.id === id); if (!p) return;
    if (!confirm('Excluir "' + p.titulo + '"? Os comentários dela deixam de aparecer no site.')) return;
    const antes = est.posts;
    est.posts = est.posts.filter(x => x.id !== id);
    try {
      await salvar('Remover publicação: ' + p.titulo);
      await apagarArquivo(p.foto);
      if (est.editando === id) limparForm();
      desenhar(); msg($('st-post'), 'Publicação excluída. O site atualiza em cerca de 1 minuto.', 'ok');
    } catch (e) { est.posts = antes; msg($('st-post'), e.message, 'erro'); }
  }

  function abrirPainel() {
    $('login').hidden = true; $('painel').hidden = false;
    $('quem').textContent = 'Conectado a ' + est.repo + ' (' + est.branch + ')';
    limparForm(); desenhar();
  }

  // ---------- Eventos ----------
  $('foto').addEventListener('change', async () => {
    const f = $('foto').files[0]; if (!f) return;
    try { est.fotoNova = await reduzir(f); est.removerFoto = false; previa('data:image/jpeg;base64,' + est.fotoNova); msg($('st-post'), ''); }
    catch (e) { est.fotoNova = null; $('foto').value = ''; msg($('st-post'), e.message, 'erro'); }
  });
  $('rem-foto').addEventListener('click', () => {
    est.fotoNova = null; est.removerFoto = true; $('foto').value = ''; previa('');
  });

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
    const id = est.editando || Date.now().toString(36);
    const titulo = $('titulo').value.trim();
    const antes = est.posts, fotoAntiga = est.fotoAtual;
    $('publicar').disabled = true; msg(st, est.fotoNova ? 'Enviando a foto e publicando...' : 'Publicando...');
    try {
      let fotoFinal = est.removerFoto ? '' : est.fotoAtual;
      if (est.fotoNova) fotoFinal = await enviarFoto(id, est.fotoNova, titulo);
      const novo = { id, date: $('data').value, tag: $('tag').value, titulo, texto: $('texto').value.trim(), foto: fotoFinal };
      const tEs = $('t-es').value.trim(), xEs = $('x-es').value.trim();
      if (tEs || xEs) novo.es = { titulo: tEs, texto: xEs };
      est.posts = est.editando ? est.posts.map(p => p.id === est.editando ? novo : p) : [novo, ...est.posts];
      est.posts.sort((a, b) => b.date.localeCompare(a.date));
      await salvar((est.editando ? 'Editar publicação: ' : 'Nova publicação: ') + titulo);
      if (fotoAntiga && fotoAntiga !== fotoFinal) await apagarArquivo(fotoAntiga);
      limparForm(); desenhar();
      msg(st, 'Publicado. O site atualiza em cerca de 1 minuto.', 'ok');
    } catch (err) { est.posts = antes; msg(st, err.message, 'erro'); }
    $('publicar').disabled = false;
  });

  $('cancelar').addEventListener('click', () => { limparForm(); msg($('st-post'), ''); });
  $('sair').addEventListener('click', () => { apagar('token'); apagar('token', true); location.reload(); });

  // ---------- Início (reaproveita o login do admin.html) ----------
  $('repo').value = ler('repo') || '';
  $('branch').value = ler('branch') || 'main';
  const guardado = ler('token', true) || ler('token');
  if (guardado && $('repo').value) {
    $('token').value = guardado;
    $('lembrar').checked = !!ler('token');
    $('form-login').requestSubmit();
  }
})();
