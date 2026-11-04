(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function get(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }).catch(function () { return null; });
  }
  function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
  function fmtTokens(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
    return fmtInt(n);
  }
  function fmtUsd(n) { return '$' + n.toFixed(2); }
  function fmtHours(n) { return n < 1 ? Math.round(n * 60) + ' min' : n.toFixed(1) + ' h'; }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  /* Theme toggle */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  $('theme').addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* Counters */
  function countUp(el, target, fmt) {
    if (reduce || target === 0) { el.textContent = fmt(target); return; }
    var start = null, dur = 1200;
    el.textContent = fmt(0);
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(target);
    }
    requestAnimationFrame(tick);
  }
  function renderCounters(stats) {
    var ul = $('counters');
    var t = stats && stats.totals;
    var tk = t && t.tokens ? (t.tokens.input || 0) + (t.tokens.output || 0) + (t.tokens.cacheRead || 0) + (t.tokens.cacheWrite || 0) : null;
    var items = [
      ['Spent on AI', t && num(t.costUsd), fmtUsd],
      ['Tokens processed', tk, fmtTokens],
      ['Agent runs', t && num(t.agentRuns), fmtInt],
      ['PRs merged', t && num(t.prsMerged), fmtInt],
      ['Days running', stats && num(stats.daysRunning), fmtInt]
    ];
    items.forEach(function (it) {
      var val = h('span', { 'class': 'val', text: '—' });
      var li = h('li', {}, [val, h('span', { 'class': 'lab', text: it[0] })]);
      ul.appendChild(li);
      if (it[1] !== null) countUp(val, it[1], it[2]);
    });
    if (t && stats.medians) {
      var m = stats.medians, extra = [];
      if (num(m.hoursIssueToLive) !== null) extra.push('median idea to live: ' + fmtHours(m.hoursIssueToLive));
      if (num(m.costUsdPerFeature) !== null) extra.push('median cost per feature: ' + fmtUsd(m.costUsdPerFeature));
      if (num(t.bugsFixed) !== null && t.bugsFiled) extra.push('bugs auto-fixed: ' + t.bugsFixed + ' of ' + t.bugsFiled);
      if (stats.generatedAt) extra.push('data generated ' + new Date(stats.generatedAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC');
      $('stamp').textContent = extra.length ? extra.join(' · ') : '';
    }
    if (!stats) $('stamp').textContent = 'Live numbers are unavailable right now.';
    if (stats && stats.repoUrl) $('repo-link').href = stats.repoUrl;
  }

  /* Team */
  function renderTeam(content, stats) {
    var grid = $('team-grid');
    var list = content && content.team || [];
    list.forEach(function (m) {
      var key = String(m.role).toLowerCase();
      var s = stats && stats.byRole && stats.byRole[key];
      var dl = h('dl', { 'class': 'nums' });
      function add(label, val) { dl.appendChild(h('div', {}, [h('dt', { text: label }), h('dd', { text: val })])); }
      if (s && num(s.runs)) {
        add('Runs', fmtInt(s.runs));
        add('Spend', fmtUsd(s.costUsd || 0));
        add('Avg cost', fmtUsd(s.avgCostUsd || 0));
        add('Avg turns', num(s.avgTurns) !== null ? s.avgTurns.toFixed(0) : '—');
        if (num(s.rejectionRate) !== null) add('Rejection rate', Math.round(s.rejectionRate * 100) + '%');
        else if (num(s.toolCalls)) add('Tool calls', fmtInt(s.toolCalls));
        if (s.topTools && s.topTools[0]) add('Top tool', s.topTools[0].tool);
      } else if (key === 'release' && stats && stats.totals) {
        add('Deploys', fmtInt(stats.totals.deploys || 0));
        add('Failed', fmtInt(stats.totals.failedDeploys || 0));
        add('PRs merged', fmtInt(stats.totals.prsMerged || 0));
      } else {
        dl.appendChild(h('div', { 'class': 'none', text: 'No runs recorded yet.' }));
      }
      grid.appendChild(h('article', { 'class': 'card' }, [
        h('h3', { text: m.role }),
        h('p', { 'class': 'one', text: m.oneLiner }),
        h('p', {}, [h('span', { 'class': 'k', text: 'Trigger' }), m.trigger]),
        h('p', {}, [h('span', { 'class': 'k', text: 'Does' }), m.does]),
        h('p', {}, [h('span', { 'class': 'k', text: 'Cannot' }), m.cannot]),
        dl
      ]));
    });
  }

  /* Workflow diagram */
  function renderWorkflow(wf) {
    if (!wf) return;
    $('wf-title').textContent = wf.title;
    $('wf-summary').textContent = wf.summary;
    var ol = $('flow');
    (wf.stages || []).forEach(function (s) {
      function row(label, text, cls) {
        return h('div', cls ? { 'class': cls } : {}, [h('dt', { text: label }), h('dd', { text: text })]);
      }
      ol.appendChild(h('li', { 'class': 'step' }, [
        h('span', { 'class': 'badge', 'aria-hidden': 'true', text: String(s.step) }),
        h('header', {}, [h('h3', { text: s.name }), h('span', { 'class': 'who', text: s.who })]),
        h('div', { 'class': 'body' }, [
          h('p', { 'class': 'what', text: s.what }),
          h('dl', { 'class': 'meta' }, [
            row('Trigger', s.trigger),
            row('Output', s.output),
            row('Human control point', s.humanControl, 'human')
          ])
        ])
      ]));
    });
    (wf.keyPoints || []).forEach(function (k) { $('keypoints').appendChild(h('li', { text: k })); });
  }

  function renderWays(w) {
    if (!w) return;
    $('ways-title').textContent = w.title;
    $('ways-summary').textContent = w.summary;
    (w.paths || []).forEach(function (p) {
      var ol = h('ol');
      (p.steps || []).forEach(function (s) { ol.appendChild(h('li', { text: s })); });
      $('ways-grid').appendChild(h('article', { 'class': 'card way' }, [
        h('h3', { text: p.title }),
        h('p', {}, [h('span', { 'class': 'k', text: 'Best for' }), p.bestFor]),
        ol,
        p.example ? h('pre', {}, [h('code', { text: p.example })]) : null,
        p.note ? h('p', { 'class': 'note', text: p.note }) : null
      ]));
    });
  }

  function renderRest(c) {
    var lead = $('lead-list');
    ((c.intro && c.intro.forLeadership) || []).forEach(function (t) {
      var i = t.indexOf(':');
      lead.appendChild(h('li', {}, i > 0 && i < 40 ? [h('b', { text: t.slice(0, i) }), t.slice(i + 1).trim()] : [t]));
    });
    (c.stack || []).forEach(function (s) {
      $('stack-list').appendChild(h('div', {}, [h('span', { 'class': 'r', text: s.role }), h('dt', { text: s.name }), h('dd', { text: s.detail })]));
    });
    if (c.safety) {
      $('guard-title').textContent = c.safety.title;
      (c.safety.items || []).forEach(function (i) {
        $('guards').appendChild(h('li', {}, [h('h3', { text: i.title }), h('p', { text: i.detail })]));
      });
    }
    if (c.whenThingsGoWrong) {
      $('wrong-title').textContent = c.whenThingsGoWrong.title;
      (c.whenThingsGoWrong.scenarios || []).forEach(function (s) {
        $('scen').appendChild(h('li', {}, [h('b', { text: s.scenario }), h('span', { text: s.whatHappens })]));
      });
    }
    if (c.customising) {
      $('custom-title').textContent = c.customising.title;
      (c.customising.layers || []).forEach(function (l) {
        $('layers').appendChild(h('li', {}, [h('span', { 'class': 'w', text: l.where }), h('span', { 'class': 'a', text: l.affects }), h('span', { 'class': 'e', text: l.example })]));
      });
      $('custom-note').textContent = c.customising.note || '';
    }
    (c.glossary || []).forEach(function (g) {
      $('gloss').appendChild(h('div', {}, [h('dt', { text: g.term }), h('dd', { text: g.meaning })]));
    });
    renderFaq(c.faq);
  }

  function renderFaq(faq) {
    if (!faq) return;
    $('faq-title').textContent = faq.title;
    $('faq-intro').textContent = faq.intro;
    var items = faq.items || [];
    var list = $('faq-list'), filters = $('faq-filters');
    var nodes = items.map(function (it) {
      var tags = [h('span', { text: it.q })];
      if (it.asked) tags.push(h('span', { 'class': 'tag asked', text: 'asked during the build' }));
      tags.push(h('span', { 'class': 'tag', text: it.audience }));
      var d = h('details', {}, [h('summary', {}, tags), h('p', { 'class': 'ans', text: it.a })]);
      list.appendChild(d);
      return { el: d, audience: it.audience };
    });
    var opts = [['all', 'All'], ['leadership', 'Leadership'], ['developers', 'Developers']];
    function apply(v) {
      Array.prototype.forEach.call(filters.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === v)); });
      nodes.forEach(function (n) { n.el.hidden = !(v === 'all' || n.audience === 'everyone' || n.audience === v); });
    }
    opts.forEach(function (o) {
      var b = h('button', { type: 'button', 'data-v': o[0], text: o[1], 'aria-pressed': 'false' });
      b.addEventListener('click', function () { apply(o[0]); });
      filters.appendChild(b);
    });
    apply('all');
  }

  /* Build log */
  function renderLog(log, features) {
    var ol = $('log-list');
    if (!log || !log.length) { ol.parentNode.insertBefore(h('p', { 'class': 'empty', text: 'No build-log entries yet.' }), ol); return; }
    var byIssue = {};
    (features || []).forEach(function (f) { byIssue[f.issue] = f; });
    log.forEach(function (e) {
      var f = e.issue ? byIssue[e.issue] : null;
      var chips = [];
      if (f) {
        chips.push(h('span', { 'class': 'chip', text: 'state: ' + f.state }));
        if (num(f.costUsd)) chips.push(h('span', { 'class': 'chip', text: fmtUsd(f.costUsd) }));
        if (num(f.reviewRounds)) chips.push(h('span', { 'class': 'chip', text: f.reviewRounds + ' review round' + (f.reviewRounds === 1 ? '' : 's') }));
        if (num(f.hoursToLive) !== null) chips.push(h('span', { 'class': 'chip', text: 'idea to live: ' + fmtHours(f.hoursToLive) }));
        if (num(f.additions) || num(f.deletions)) chips.push(h('span', { 'class': 'chip', text: '+' + (f.additions || 0) + ' / −' + (f.deletions || 0) + ' lines' }));
        if (f.url && /^https:\/\//.test(f.url)) chips.push(h('span', { 'class': 'chip' }, [h('a', { href: f.url, text: 'issue #' + f.issue })]));
      }
      ol.appendChild(h('li', {}, [
        h('div', { 'class': 'meta-l' }, [h('time', { datetime: e.date, text: e.date }), h('span', { text: e.role })]),
        h('h3', { text: e.title }),
        h('p', { text: e.summary }),
        chips.length ? h('div', { 'class': 'chips' }, chips) : null
      ]));
    });
  }

  Promise.all([
    get('data/stats.json'), get('data/features.json'),
    get('content/how-it-works.json'), get('build-log.json')
  ]).then(function (r) {
    var stats = r[0], features = r[1], content = r[2], log = r[3];
    renderCounters(stats);
    if (content) {
      if (content.intro) {
        $('intro-headline').textContent = content.intro.headline;
        $('intro-summary').textContent = content.intro.summary;
      }
      renderTeam(content, stats);
      renderWorkflow(content.workflow);
      renderWays(content.waysToWork);
      renderRest(content);
    } else {
      var e = $('load-error');
      e.hidden = false;
      e.textContent = 'The explanation content could not be loaded.';
    }
    renderLog(log, features);
  });
})();
