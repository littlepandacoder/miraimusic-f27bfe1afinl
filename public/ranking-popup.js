(function () {
  'use strict';

  var SUPA_URL = 'https://tychkyunjfbkksyxknhn.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5Y2hreXVuamZia2tzeXhrbmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDQxOTEsImV4cCI6MjA4NDAyMDE5MX0.5NzAwo1xGI3rOIihsEuBJKfYxAWMpBO60MjI2jUR7Qw';
  var MEDALS = ['🥇', '🥈', '🥉'];

  /* ── inject styles once ─────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '@keyframes rp-backdrop-in{from{opacity:0}to{opacity:1}}',
    '@keyframes rp-card-in{from{opacity:0;transform:translateY(60px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '@keyframes rp-row-in{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}',
    '@keyframes rp-rank-pop{0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)}}',
    '#rp-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:rp-backdrop-in .25s ease both}',
    '#rp-card{width:100%;max-width:360px;margin:0 16px;border-radius:22px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.7);animation:rp-card-in .35s cubic-bezier(.22,1,.36,1) both;background:linear-gradient(160deg,#1a1530 0%,#0f0d1a 100%);border:1px solid rgba(255,45,120,.22)}',
    '#rp-topbar{height:4px;background:linear-gradient(90deg,#FF2D78,#A855F7,#00D4FF)}',
    '#rp-header{padding:18px 20px 12px;display:flex;align-items:flex-start;justify-content:space-between}',
    '#rp-header-text .rp-sub{font-size:.65rem;font-family:"DM Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#8892A4;margin-bottom:2px}',
    '#rp-header-text .rp-title{font-family:"Orbitron",monospace;font-size:1.1rem;font-weight:900;color:#fff;line-height:1.2}',
    '#rp-close{background:none;border:none;color:#8892A4;cursor:pointer;font-size:1.3rem;line-height:1;padding:2px;transition:color .15s}',
    '#rp-close:hover{color:#fff}',
    '#rp-rank-card{margin:0 16px 14px;border-radius:14px;padding:14px;text-align:center;background:rgba(255,45,120,.1);border:1px solid rgba(255,45,120,.28)}',
    '#rp-rank-label{font-size:.68rem;color:#8892A4;font-family:"DM Mono",monospace;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}',
    '#rp-rank-row{display:flex;align-items:center;justify-content:center;gap:10px}',
    '#rp-rank-num{font-family:"Orbitron",monospace;font-size:3.2rem;font-weight:900;color:#FF2D78;text-shadow:0 0 28px rgba(255,45,120,.55);line-height:1;transition:color .3s}',
    '#rp-rank-num.animating{animation:rp-rank-pop .35s ease}',
    '#rp-delta{font-size:.85rem;font-weight:700}',
    '#rp-move-label{font-size:.7rem;margin-top:5px}',
    '#rp-list{padding:0 16px 16px;display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto}',
    '#rp-list::-webkit-scrollbar{width:4px}',
    '#rp-list::-webkit-scrollbar-track{background:transparent}',
    '#rp-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px}',
    '.rp-row{display:flex;align-items:center;gap:10px;border-radius:12px;padding:9px 12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.04);animation:rp-row-in .3s ease both}',
    '.rp-row.me{background:rgba(255,45,120,.12);border-color:rgba(255,45,120,.38)}',
    '.rp-rank-badge{width:26px;text-align:center;font-family:"Orbitron",monospace;font-size:.72rem;font-weight:700;color:#8892A4;flex-shrink:0}',
    '.rp-name{flex:1;font-size:.85rem;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.rp-row.me .rp-name{color:#FF2D78}',
    '.rp-score{font-size:.75rem;font-weight:700;color:#8892A4;flex-shrink:0}',
    '#rp-continue{display:block;width:calc(100% - 32px);margin:0 16px 18px;padding:13px;border:none;border-radius:12px;font-family:"Orbitron",monospace;font-size:.82rem;font-weight:700;letter-spacing:.06em;cursor:pointer;background:linear-gradient(135deg,#FF2D78,#A855F7);color:#fff;box-shadow:0 0 20px rgba(255,45,120,.3);transition:opacity .15s,transform .1s}',
    '#rp-continue:hover{opacity:.9;transform:scale(1.01)}',
    '#rp-spinner{display:flex;justify-content:center;padding:28px 0}',
    '.rp-spin{width:28px;height:28px;border:3px solid rgba(255,45,120,.2);border-top-color:#FF2D78;border-radius:50%;animation:rp-spin 0.7s linear infinite}',
    '@keyframes rp-spin{to{transform:rotate(360deg)}}',
  ].join('');
  document.head.appendChild(styleEl);

  /* ── helpers ────────────────────────────────────── */
  function getAuth() {
    var key = Object.keys(localStorage).find(function (k) { return /^sb-.*-auth-token$/.test(k); });
    if (!key) return null;
    try {
      var s = JSON.parse(localStorage.getItem(key) || '{}');
      var token = s.access_token;
      if (!token) return null;
      var userId = (s.user && s.user.id) || JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
      return { token: token, userId: userId };
    } catch (e) { return null; }
  }

  function prevRankKey(gameId, userId) {
    return 'musicable_prev_rank_game_' + gameId + '_' + userId;
  }

  function animateCounter(el, from, to, duration) {
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = '#' + Math.round(from + (to - from) * eased);
      el.classList.add('animating');
      if (t < 1) requestAnimationFrame(step);
      else {
        el.textContent = '#' + to;
        setTimeout(function () { el.classList.remove('animating'); }, 400);
      }
    }
    requestAnimationFrame(step);
  }

  /* ── main export ────────────────────────────────── */
  window.showRankingPopup = function (gameId, gameLabel) {
    var auth = getAuth();

    /* build overlay */
    var overlay = document.createElement('div');
    overlay.id = 'rp-overlay';
    overlay.innerHTML = [
      '<div id="rp-card">',
        '<div id="rp-topbar"></div>',
        '<div id="rp-header">',
          '<div id="rp-header-text">',
            '<div class="rp-sub">Leaderboard</div>',
            '<div class="rp-title">' + gameLabel + '</div>',
          '</div>',
          '<button id="rp-close" title="Close">✕</button>',
        '</div>',
        '<div id="rp-rank-card">',
          '<div id="rp-rank-label">Your Rank</div>',
          '<div id="rp-rank-row">',
            '<span id="rp-trend"></span>',
            '<span id="rp-rank-num">#—</span>',
            '<span id="rp-delta"></span>',
          '</div>',
          '<div id="rp-move-label"></div>',
        '</div>',
        '<div id="rp-list"><div id="rp-spinner"><div class="rp-spin"></div></div></div>',
        '<button id="rp-continue">CONTINUE</button>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    function close() { overlay.remove(); }
    overlay.querySelector('#rp-close').addEventListener('click', close);
    overlay.querySelector('#rp-continue').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    if (!auth) {
      overlay.querySelector('#rp-rank-num').textContent = '—';
      overlay.querySelector('#rp-list').innerHTML = '<p style="text-align:center;color:#8892A4;font-size:.82rem;padding:20px">Sign in to see rankings</p>';
      return;
    }

    var storedPrev = localStorage.getItem(prevRankKey(gameId, auth.userId));
    var prevRank = storedPrev ? Number(storedPrev) : null;

    /* fetch leaderboard */
    fetch(SUPA_URL + '/rest/v1/rpc/get_game_leaderboard', {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + auth.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_game: gameId, p_limit: 10 }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var entries = (Array.isArray(data) ? data : []).map(function (r) {
        return { rank: Number(r.rank), user_id: r.user_id, display_name: r.display_name, best_acc: r.best_acc, sessions: r.sessions };
      });

      var mine = entries.find(function (e) { return e.user_id === auth.userId; });
      var currentRank = mine ? mine.rank : null;

      if (currentRank !== null) localStorage.setItem(prevRankKey(gameId, auth.userId), String(currentRank));

      /* update rank badge */
      var rankNumEl = overlay.querySelector('#rp-rank-num');
      var trendEl   = overlay.querySelector('#rp-trend');
      var deltaEl   = overlay.querySelector('#rp-delta');
      var moveEl    = overlay.querySelector('#rp-move-label');

      if (currentRank === null) {
        rankNumEl.textContent = '—';
        moveEl.textContent = 'Play more to appear on the board!';
        moveEl.style.color = '#8892A4';
      } else if (prevRank !== null && prevRank !== currentRank) {
        var improved = currentRank < prevRank;
        var diff = Math.abs(prevRank - currentRank);
        animateCounter(rankNumEl, prevRank, currentRank, 900);
        trendEl.textContent = improved ? '↑' : '↓';
        trendEl.style.color = improved ? '#39D98A' : '#FF6B6B';
        trendEl.style.fontSize = '1.6rem';
        deltaEl.textContent = (improved ? '+' : '−') + diff;
        deltaEl.style.color = improved ? '#39D98A' : '#FF6B6B';
        moveEl.textContent  = improved ? 'Moved up from #' + prevRank + ' 🔥' : 'Dropped from #' + prevRank;
        moveEl.style.color  = improved ? '#39D98A' : '#FF6B6B';
      } else {
        rankNumEl.textContent = '#' + currentRank;
        if (prevRank !== null) {
          moveEl.textContent = 'Rank unchanged';
          moveEl.style.color = '#8892A4';
        }
      }

      /* render list */
      var list = overlay.querySelector('#rp-list');
      if (entries.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#8892A4;font-size:.82rem;padding:20px">No rankings yet — you\'re the first!</p>';
        return;
      }

      list.innerHTML = entries.map(function (e, i) {
        var isMe = e.user_id === auth.userId;
        var medal = i < 3 ? MEDALS[i] : String(e.rank);
        var delay = (i * 55) + 'ms';
        return '<div class="rp-row' + (isMe ? ' me' : '') + '" style="animation-delay:' + delay + '">'
          + '<span class="rp-rank-badge">' + medal + '</span>'
          + '<span class="rp-name">' + (isMe ? 'You' : escHtml(e.display_name)) + '</span>'
          + '<span class="rp-score">' + (e.best_acc !== null && e.best_acc !== undefined ? e.best_acc + '%' : '—') + '</span>'
          + '</div>';
      }).join('');
    })
    .catch(function () {
      overlay.querySelector('#rp-list').innerHTML = '<p style="text-align:center;color:#8892A4;font-size:.82rem;padding:20px">Could not load rankings</p>';
    });
  };

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
