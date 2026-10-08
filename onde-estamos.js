(() => {
  const html = document.documentElement;
  const $ = id => document.getElementById(id);
  const ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const W = 960, H = 500;

  const T = {
    pt: {
      sub: 'os países onde a Fraternidade está presente',
      plenos: 'Membros plenos', outras: 'Membros de outras denominações', obs: 'Observadores',
      clique: 'Clique para visitar o site da', toque: 'Visitar o site da',
      erroMapa: 'Não foi possível carregar o mapa. A lista de países abaixo continua disponível.',
      legenda: 'Os países pintados são aqueles onde a Fraternidade está presente. Passe o mouse (ou toque) para ver os números.',
      lista: 'Países', zin: 'Aproximar', zout: 'Afastar', zreset: 'Mapa inteiro', fechar: 'Fechar',
      vazio: 'Nenhum país cadastrado ainda.', semsite: 'Sem site cadastrado'
    },
    es: {
      sub: 'los países donde la Fraternidad está presente',
      plenos: 'Miembros plenos', outras: 'Miembros de otras denominaciones', obs: 'Observadores',
      clique: 'Haz clic para visitar el sitio de la', toque: 'Visitar el sitio de la',
      erroMapa: 'No se pudo cargar el mapa. La lista de países de abajo sigue disponible.',
      legenda: 'Los países pintados son aquellos donde la Fraternidad está presente. Pasa el mouse (o toca) para ver las cifras.',
      lista: 'Países', zin: 'Acercar', zout: 'Alejar', zreset: 'Mapa completo', fechar: 'Cerrar',
      vazio: 'Aún no hay países registrados.', semsite: 'Sin sitio registrado'
    }
  };
  const lang = () => html.dataset.idioma === 'es' ? 'es' : 'pt';
  const t = k => T[lang()][k];
  const loc = () => lang() === 'es' ? 'es' : 'pt-BR';
  const tr = o => (o && (o[lang()] || o.pt)) || '';
  const num = n => (n === null || n === undefined || n === '') ? '—' : Number(n).toLocaleString(loc());
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const siteOk = d => /^https?:\/\//i.test(d.site || '');

  let dados = [], g = null, svg = null, zoom = null, fixo = null;

  function textosFixos() {
    document.querySelectorAll('[data-k]').forEach(e => { e.textContent = t(e.dataset.k); });
    document.querySelectorAll('[data-ka]').forEach(e => { e.setAttribute('aria-label', t(e.dataset.ka)); });
  }

  // ---------- Janelinha ----------
  const tip = () => $('dica-mapa');

  function conteudo(d, comLink) {
    const box = tip(); box.textContent = '';
    box.append(el('strong', 'dica-pais', tr(d.pais)));
    const dl = el('dl');
    [['plenos', d.plenos], ['outras', d.outras], ['obs', d.observadores]].forEach(([k, v]) => {
      const linha = el('div'); linha.append(el('dt', null, t(k)), el('dd', null, num(v))); dl.append(linha);
    });
    box.append(dl);
    if (siteOk(d)) {
      if (comLink) {
        const a = el('a', 'btn peq', t('toque') + ' ' + tr(d.igreja)); a.href = d.site; a.target = '_blank'; a.rel = 'noopener';
        box.append(a);
      } else box.append(el('p', 'dica-clique', t('clique') + ' ' + tr(d.igreja)));
    }
    if (comLink) {
      const x = el('button', 'btn-link', t('fechar')); x.type = 'button'; x.addEventListener('click', esconder); box.append(x);
    }
  }

  function posicionar(x, y) {
    const box = tip(), area = $('mapa-wrap').getBoundingClientRect();
    const w = box.offsetWidth, h = box.offsetHeight;
    let l = x - area.left + 14, tp = y - area.top + 14;
    if (l + w > area.width) l = x - area.left - w - 14;
    if (l < 4) l = 4;
    if (tp + h > area.height) tp = y - area.top - h - 14;
    if (tp < 4) tp = 4;
    box.style.left = l + 'px'; box.style.top = tp + 'px';
  }
  function mostrar(d, x, y, comLink) {
    const box = tip(); conteudo(d, comLink); box.hidden = false; box.classList.toggle('fixa', !!comLink);
    posicionar(x, y);
  }
  function esconder() { fixo = null; const b = tip(); b.hidden = true; b.classList.remove('fixa'); }

  const abrir = d => { if (siteOk(d)) window.open(d.site, '_blank', 'noopener'); };

  // ---------- Mapa ----------
  function desenharMapa(topo) {
    const todos = topojson.feature(topo, topo.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
    const porNome = new Map(dados.filter(d => d.mapa).map(d => [String(d.mapa).trim().toLowerCase(), d]));
    const nomesMapa = new Set(todos.map(f => f.properties.name.toLowerCase()));
    dados.forEach(d => { if (!nomesMapa.has(String(d.mapa || '').trim().toLowerCase())) console.warn('[Onde estamos] "' + d.mapa + '" não bate com nenhum país do mapa. Abra onde-estamos.html?lista para ver os nomes aceitos.'); });

    const proj = d3.geoNaturalEarth1().fitSize([W, H], { type: 'FeatureCollection', features: todos });
    const path = d3.geoPath(proj);
    const host = d3.select('#mapa');
    host.selectAll('*').remove();
    svg = host.append('svg').attr('viewBox', '0 0 ' + W + ' ' + H).attr('role', 'group').attr('data-ka', 'legenda').attr('aria-label', t('legenda'));
    g = svg.append('g');

    g.selectAll('path').data(todos).join('path')
      .attr('d', path)
      .attr('class', f => porNome.has(f.properties.name.toLowerCase()) ? 'pais ativo' : 'pais')
      .each(function (f) {
        const d = porNome.get(f.properties.name.toLowerCase());
        if (!d) return;
        const p = d3.select(this);
        p.attr('tabindex', 0).attr('role', 'link').attr('aria-label', tr(d.pais) + ': ' + t('plenos') + ' ' + num(d.plenos) + ', ' + t('outras') + ' ' + num(d.outras) + ', ' + t('obs') + ' ' + num(d.observadores));
        p.on('pointerenter pointermove', e => { if (e.pointerType !== 'touch' && !fixo) mostrar(d, e.clientX, e.clientY, false); });
        p.on('pointerleave', e => { if (e.pointerType !== 'touch' && !fixo) esconder(); });
        p.on('click', e => {
          e.stopPropagation();
          if (e.pointerType === 'touch') { fixo = d; mostrar(d, e.clientX, e.clientY, true); } else abrir(d);
        });
        p.on('focus', function () {
          const r = this.getBoundingClientRect(); mostrar(d, r.left + r.width / 2, r.top + r.height / 2, false);
        });
        p.on('blur', () => { if (!fixo) esconder(); });
        p.on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(d); } });
      });

    // Zoom: arrastar e botões; roda do mouse só com Ctrl (para não travar a rolagem da página)
    zoom = d3.zoom().scaleExtent([1, 8]).extent([[0, 0], [W, H]]).translateExtent([[0, 0], [W, H]])
      .filter(e => !e.button && (e.type === 'wheel' ? e.ctrlKey : !e.ctrlKey))
      .on('start', esconder)
      .on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom).style('touch-action', 'pan-y');
    svg.on('click', esconder);
  }

  // ---------- Lista (também serve de alternativa acessível) ----------
  function desenharLista() {
    const ul = $('lista-paises'); ul.textContent = '';
    if (!dados.length) { ul.append(el('li', 'vazio-c', t('vazio'))); return; }
    [...dados].sort((a, b) => tr(a.pais).localeCompare(tr(b.pais), loc())).forEach(d => {
      const li = el('li');
      const topo = el('div', 'lp-nome'); topo.append(el('h3', null, tr(d.pais)), el('p', null, tr(d.igreja)));
      const nums = el('dl', 'lp-nums');
      [['plenos', d.plenos], ['outras', d.outras], ['obs', d.observadores]].forEach(([k, v]) => {
        const linha = el('div'); linha.append(el('dt', null, t(k)), el('dd', null, num(v))); nums.append(linha);
      });
      li.append(topo, nums);
      if (siteOk(d)) { const a = el('a', 'mais', tr(d.igreja)); a.href = d.site; a.target = '_blank'; a.rel = 'noopener'; li.append(a); }
      ul.append(li);
    });
  }

  function atualizarIdioma() {
    textosFixos();
    desenharLista();
    if (g) {
      g.selectAll('path.ativo').each(function (f) {
        const d = dados.find(x => String(x.mapa).trim().toLowerCase() === f.properties.name.toLowerCase());
        if (d) this.setAttribute('aria-label', tr(d.pais) + ': ' + t('plenos') + ' ' + num(d.plenos) + ', ' + t('outras') + ' ' + num(d.outras) + ', ' + t('obs') + ' ' + num(d.observadores));
      });
    }
    esconder();
  }

  // ---------- Início ----------
  $('z-in').addEventListener('click', () => svg && svg.transition().duration(250).call(zoom.scaleBy, 1.7));
  $('z-out').addEventListener('click', () => svg && svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.7));
  $('z-reset').addEventListener('click', () => svg && svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity));
  document.addEventListener('click', e => { if (fixo && !tip().contains(e.target)) esconder(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') esconder(); });
  new MutationObserver(atualizarIdioma).observe(html, { attributes: true, attributeFilter: ['data-idioma'] });
  textosFixos();

  fetch('paises.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .catch(() => [])
    .then(j => { dados = Array.isArray(j) ? j : []; desenharLista(); return fetch(ATLAS); })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(topo => {
      desenharMapa(topo);
      if (/[?&]lista\b/.test(location.search)) {
        const nomes = topojson.feature(topo, topo.objects.countries).features.map(f => f.properties.name).sort();
        const box = $('nomes-mapa'); box.hidden = false;
        box.append(el('h2', null, 'Nomes aceitos no campo "mapa"'), el('p', null, nomes.join(' · ')));
      }
    })
    .catch(() => { $('mapa').textContent = ''; $('mapa').append(el('p', 'vazio-c', t('erroMapa'))); });
})();
