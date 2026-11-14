// Dictionary search (same rules as the app) and the word of the day (same pick as the app).
(function () {
  var index = null;
  function load() {
    if (!index) index = fetch('/search.json').then(function (r) { return r.json(); });
    return index;
  }
  // Index row: [id, jp, kana, ruby, romaji, en, en_aliases, mm, abbr, category]

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toHiragana(s) {
    return s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
  }

  // Japanese and Burmese match anywhere; Latin-only queries match English, romaji
  // and abbreviations at the start of a word ("ses" finds SES, not "phases").
  function search(rows, raw) {
    var q = raw.normalize('NFC').trim().toLowerCase();
    if (!q) return null;
    var hits = [];
    if (/^[\x00-\x7f]+$/.test(q)) {
      var re = new RegExp('(^|[^a-z0-9])' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      rows.forEach(function (r) {
        var abbr = r[8].toLowerCase(), en = r[5].toLowerCase();
        var score = abbr === q ? 0 : en.indexOf(q) === 0 ? 1 : re.test(en) ? 2
          : re.test(r[6].toLowerCase()) || re.test(r[4].toLowerCase()) || re.test(abbr) ? 3 : -1;
        if (score >= 0) hits.push([score, r]);
      });
    } else {
      var h = toHiragana(q);
      rows.forEach(function (r) {
        var score = r[1] === q || r[2] === h ? 0 : r[1].indexOf(q) === 0 || r[2].indexOf(h) === 0 ? 1
          : r[1].indexOf(q) >= 0 || r[2].indexOf(h) >= 0 ? 2 : r[7].indexOf(q) >= 0 ? 3 : -1;
        if (score >= 0) hits.push([score, r]);
      });
    }
    hits.sort(function (a, b) { return a[0] - b[0] || a[1][0] - b[1][0]; });
    return hits.slice(0, 60).map(function (x) { return x[1]; });
  }

  function row(r) {
    return '<li><a class="row" href="/w/' + r[0] + '/">' +
      '<span class="row-jp" lang="ja">' + esc(r[1]) + '</span>' +
      (r[8] ? '<span class="abbr">' + esc(r[8]) + '</span>' : '') +
      '<span class="row-kana" lang="ja">' + esc(r[2]) + '</span>' +
      '<span class="row-en" lang="en">' + esc(r[5]) + '</span>' +
      '<span class="row-mm mm" lang="my">' + esc(r[7]) + '</span></a></li>';
  }

  // --- Word of the day: a port of kotlin.random.Random(seed) (XorWow), as in the app's
  // WordOfDay.kt: termIds sorted by id, Random(today.toEpochDay()).nextInt(size).
  function kotlinRandom(seedLo, seedHi) {
    var x = seedLo | 0, y = seedHi | 0, z = 0, w = 0, v = ~seedLo, addend = (seedLo << 10) ^ (seedHi >>> 4);
    function next() {
      var t = x;
      t = t ^ (t >>> 2);
      x = y; y = z; z = w;
      var v0 = v;
      w = v0;
      t = (t ^ (t << 1)) ^ v0 ^ (v0 << 4);
      v = t;
      addend = (addend + 362437) | 0;
      return (t + addend) | 0;
    }
    for (var i = 0; i < 64; i++) next();
    return {
      nextInt: function (n) {
        if ((n & -n) === n) {
          var bits = 31 - Math.clz32(n);
          return (next() >>> (32 - bits)) & ((-bits) >> 31);
        }
        var b, val;
        do { b = next() >>> 1; val = b % n; } while (((b - val + (n - 1)) | 0) < 0);
        return val;
      }
    };
  }
  function epochDay(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
  window.genbaWordOfDayIndex = function (size, date) {
    var day = epochDay(date || new Date());
    return kotlinRandom(day, Math.floor(day / 4294967296)).nextInt(size);
  };

  function masuHtml(r) {
    var jp = r[1], readings = r[3] ? r[3].split('|') : [];
    if (!/^[ぁ-ゖァ-ヺー々一-鿿]+$/.test(jp))
      return '<div class="headword" lang="ja">' + esc(jp) + '</div>';
    var chars = Array.from(jp);
    if (readings.length !== chars.length) readings = chars.map(function () { return ''; });
    return '<div class="masu" role="img" lang="ja" aria-label="' + esc(jp + '（' + r[2] + '）') + '">' +
      chars.map(function (c, i) {
        return '<span class="sq"><span class="fr">' + esc(readings[i]) + '</span><span class="ch">' + esc(c) + '</span></span>';
      }).join('') + '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var q = document.getElementById('q');
    if (q) {
      q.form.addEventListener('submit', function (e) { e.preventDefault(); });
      var results = document.getElementById('results'), idle = document.getElementById('idle'),
        hint = document.getElementById('hint'), empty = document.getElementById('empty');
      var initial = new URLSearchParams(location.search).get('q');
      if (initial) q.value = initial;
      var run = function () {
        load().then(function (rows) {
          var hits = search(rows, q.value);
          idle.hidden = hint.hidden = !!hits;
          results.hidden = !hits || !hits.length;
          empty.hidden = !hits || !!hits.length;
          results.innerHTML = hits ? hits.map(row).join('') : '';
        });
      };
      q.addEventListener('input', run);
      if (initial) run();
    }

    var wod = document.getElementById('wod');
    if (wod) {
      load().then(function (rows) {
        var r = rows[window.genbaWordOfDayIndex(rows.length)];
        document.getElementById('wod-masu').innerHTML = masuHtml(r);
        document.getElementById('wod-en').textContent = r[5];
        document.getElementById('wod-mm').textContent = r[7];
        document.getElementById('wod-link').href = '/w/' + r[0] + '/';
        wod.hidden = false;
      });
    }
  });
})();
