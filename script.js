(() => {
  const html = document.documentElement;
  const ler = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // ---------- Menu e submenus ----------
  const hamb = document.getElementById('hamburger');
  const lista = document.getElementById('nav-links');
  hamb.addEventListener('click', () => hamb.setAttribute('aria-expanded', lista.classList.toggle('show')));

  const atual = location.pathname.split('/').pop() || 'index.html';
  lista.querySelectorAll('a').forEach(a => {
    if (a.getAttribute('href') === atual) {
      a.setAttribute('aria-current', 'page');
      const pai = a.closest('.tem-sub');
      if (pai) pai.querySelector('.sub-btn').classList.add('ativo');
    }
  });

  const subs = [...lista.querySelectorAll('.tem-sub')];
  subs.forEach(li => {
    const b = li.querySelector('.sub-btn');
    b.addEventListener('click', e => {
      e.stopPropagation();
      const abrir = !li.classList.contains('aberto');
      subs.forEach(o => { o.classList.remove('aberto'); o.querySelector('.sub-btn').setAttribute('aria-expanded', 'false'); });
      li.classList.toggle('aberto', abrir);
      b.setAttribute('aria-expanded', abrir);
    });
  });
  const fecharSubs = () => subs.forEach(o => { o.classList.remove('aberto'); o.querySelector('.sub-btn').setAttribute('aria-expanded', 'false'); });
  document.addEventListener('click', fecharSubs);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharSubs(); });

  // ---------- Tema (escuro por padrão) ----------
  document.getElementById('tema').addEventListener('click', () => {
    const novo = html.dataset.tema === 'claro' ? 'escuro' : 'claro';
    html.dataset.tema = novo;
    guardar('tema', novo);
  });

  // ---------- Novidades (lidas de posts.json) ----------
  const caixas = [...document.querySelectorAll('[data-posts]')];
  let posts = null; // null = carregando, false = erro
  const MSG = {
    pt: { vazio: 'Nenhuma novidade publicada ainda.', erro: 'Não foi possível carregar as novidades.' },
    es: { vazio: 'Aún no hay novedades publicadas.', erro: 'No se pudieron cargar las novedades.' }
  };
  function renderPosts() {
    const lang = html.dataset.idioma === 'es' ? 'es' : 'pt';
    caixas.forEach(box => {
      box.textContent = '';
      if (posts === null) return;
      if (posts === false || !posts.length) {
        const p = document.createElement('p');
        p.textContent = MSG[lang][posts === false ? 'erro' : 'vazio'];
        box.append(p);
        return;
      }
      const limite = Number(box.dataset.limit) || Infinity;
      [...posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limite).forEach(p => {
        const c = p[lang] && p[lang].titulo ? p[lang] : p.pt;
        const art = document.createElement('article');
        const t = document.createElement('time');
        t.dateTime = p.date;
        t.textContent = new Date(p.date + 'T00:00:00Z').toLocaleDateString(lang === 'es' ? 'es' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        const d = document.createElement('div');
        const h = document.createElement('h3');
        h.textContent = c.titulo;
        d.append(h);
        (c.texto || '').split(/\n\s*\n/).forEach(par => {
          if (!par.trim()) return;
          const e = document.createElement('p');
          e.textContent = par.trim();
          d.append(e);
        });
        art.append(t, d);
        box.append(art);
      });
    });
  }

  // ---------- Idioma (o texto original do HTML é o português) ----------
  const ES = {
    brand:'Santísimo Sacramento',
    n_inicio:'Inicio', n_quem:'Quiénes somos', n_sobre:'Sobre nosotros', n_hist:'Nuestra historia', n_regra:'Regla de vida',
    n_lit:'Liturgia', n_adoracao:'Adoración', n_loc:'Libro de Oración Común', n_nov:'Novedades', n_contato:'Contacto',
    t_inicio:'Inicio | Fraternidad del Santísimo Sacramento', t_sobre:'Sobre nosotros | Fraternidad del Santísimo Sacramento',
    t_hist:'Nuestra historia | Fraternidad del Santísimo Sacramento', t_regra:'Regla de vida | Fraternidad del Santísimo Sacramento',
    t_adoracao:'Adoración | Fraternidad del Santísimo Sacramento', t_loc:'LOC | Fraternidad del Santísimo Sacramento',
    t_nov:'Novedades | Fraternidad del Santísimo Sacramento', t_contato:'Contacto | Fraternidad del Santísimo Sacramento',
    aria_menu:'Abrir menú', aria_tema:'Cambiar tema', alt_brasao:'Escudo de la Fraternidad del Santísimo Sacramento',
    h_pre:'fraternidad episcopal anglicana del', h_tit:'Santísimo Sacramento',
    h_desc:'Una comunidad de oración en torno a la Eucaristía, en la tradición anglicana.', h_btn:'Ver horarios de adoración',
    hm_tit:'Conoce la Fraternidad', mais:'Saber más',
    c1_t:'Una fraternidad eucarística', c1_p:'Laicos y clérigos reunidos en torno a la Eucaristía, en la tradición anglocatólica.',
    c2_t:'Vigilia ante el Sacramento', c2_p:'Ven a orar en silencio. Mira los horarios de la semana.',
    c3_t:'Libro de Oración Común', c3_p:'Lee o descarga el libro que guía nuestra oración.',
    nov:'Novedades', nov_all:'Ver todas las novedades', nv_sub:'lo que ha pasado en la Fraternidad',
    s_tit:'Sobre nosotros', s_sub:'nuestra fe y nuestra oración',
    so_e1:'Nuestra identidad', so_h1:'Tradición anglocatólica', so_e2:'Nuestra vocación', so_h2:'Del altar al mundo',
    s_p1:'La Fraternidad reúne a laicos y clérigos de la Iglesia Episcopal Anglicana de Brasil en torno a la Eucaristía, fuente y centro de la vida cristiana. Nuestra oración nace del altar y vuelve al mundo en forma de servicio.',
    s_p2:'Herederos de la tradición anglocatólica, cultivamos la adoración a Cristo presente en el Sacramento, el Oficio Diario y la liturgia bien celebrada.',
    s_cit:'Yo soy el pan vivo que bajó del cielo.', s_cite:'Evangelio según Juan, capítulo 6',
    hi_tit:'Nuestra historia', hi_sub:'cómo comenzamos', hi_e1:'Los comienzos', hi_h1:'Un deseo compartido', hi_e2:'Hoy', hi_h2:'Camino en comunidad',
    hi_p1:'La Fraternidad nació del deseo de laicos y clérigos de profundizar la vida eucarística en la Iglesia Episcopal Anglicana de Brasil.',
    hi_p2:'Desde entonces nos reunimos para la adoración, el estudio y el servicio, siempre en torno al altar.',
    r_tit:'Regla de vida', r_sub:'cuatro compromisos',
    r1_e:'Culto', r1_t:'Eucaristía', r1_p:'Participar de la Santa Cena los domingos y en las fiestas principales del año cristiano. Allí recibimos lo que después compartimos.',
    r2_e:'Silencio', r2_t:'Adoración', r2_p:'Dedicar una hora de vigilia al mes ante el Santísimo Sacramento, en silencio y oración.',
    r3_e:'Cada día', r3_t:'Oración diaria', r3_p:'Rezar el Oficio Diario o, al menos, la oración de la mañana y la de la noche.',
    r4_e:'En el mundo', r4_t:'Servicio', r4_p:'Llevar el pan compartido al prójimo, en gestos concretos de cuidado.',
    a_tit:'Adoración', a_sub:'Entra en silencio. Todos son bienvenidos.',
    d0:'Domingo', d2:'Martes', d4:'Jueves', d5:'Primer viernes',
    h0:'Santa Eucaristía, 9:30', h2:'Adoración y Oficio de la Noche, 19:30', h4:'Eucaristía con adoración, 19:30', h5:'Vigilia mensual, 20:00 a 22:00', hoje:'Hoy',
    l_tit:'Libro de Oración Común', l_sub:'el libro de oración de nuestra Iglesia', l_btn:'Descargar el LOC (PDF)',
    l_fb:'Tu navegador no muestra el PDF aquí. Usa el botón de arriba para descargarlo.',
    c_tit:'Contáctanos', c_sub:'dudas, peticiones de oración y visitas', c_nome:'Nombre', c_email:'Correo electrónico', c_msg:'Mensaje', c_enviar:'Enviar mensaje',
    f_desc:'Comunidad de oración en torno a la Eucaristía, en la Iglesia Episcopal Anglicana de Brasil.', f_nav:'Navegación', f_cont:'Contacto',
    f_admin:'Administración',
    rodape:'© Fraternidad Episcopal Anglicana del Santísimo Sacramento · Iglesia Episcopal Anglicana de Brasil'
  };
  const ATRS = [['data-i18n', null], ['data-i18n-aria', 'aria-label'], ['data-i18n-alt', 'alt']];
  const originais = new WeakMap();
  const btnLang = document.getElementById('idioma');

  function aplicarIdioma(lang) {
    ATRS.forEach(([attr, alvo]) => {
      document.querySelectorAll('[' + attr + ']').forEach(el => {
        const m = originais.get(el) || {};
        if (!(attr in m)) { m[attr] = alvo ? el.getAttribute(alvo) : el.textContent; originais.set(el, m); }
        const chave = el.getAttribute(attr);
        const valor = lang === 'es' && ES[chave] ? ES[chave] : m[attr];
        if (alvo) el.setAttribute(alvo, valor); else el.textContent = valor;
      });
    });
    html.lang = lang === 'es' ? 'es' : 'pt-br';
    btnLang.textContent = lang === 'es' ? 'PT' : 'ES';
    btnLang.setAttribute('aria-label', lang === 'es' ? 'Mudar para português' : 'Cambiar a español');
    html.dataset.idioma = lang;
    renderPosts();
  }
  btnLang.addEventListener('click', () => {
    const novo = html.dataset.idioma === 'es' ? 'pt' : 'es';
    aplicarIdioma(novo);
    guardar('idioma', novo);
  });
  if (ler('idioma') === 'es') aplicarIdioma('es'); else html.dataset.idioma = 'pt';

  if (caixas.length) {
    fetch('posts.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => { posts = j; renderPosts(); })
      .catch(() => { posts = false; renderPosts(); });
  }

  // ---------- Adoração de hoje ----------
  const hoje = new Date();
  document.querySelectorAll('.agenda li').forEach(li => {
    let marca = Number(li.dataset.dia) === hoje.getDay();
    if (li.dataset.primeira) marca = marca && hoje.getDate() <= 7;
    li.classList.toggle('hoje', marca);
  });
})();
