// Every page: UI language switch and pronunciation buttons.
(function () {
  var root = document.documentElement;

  function mark() {
    document.querySelectorAll('.langs button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.set === root.dataset.ui));
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    mark();
    document.querySelectorAll('.langs button').forEach(function (b) {
      b.addEventListener('click', function () {
        root.dataset.ui = b.dataset.set;
        try { localStorage.setItem('ui', b.dataset.set); } catch (e) {}
        mark();
      });
    });

    // Japanese text to speech, like the app's pronunciation button (browser voices only).
    if (!('speechSynthesis' in window)) return;
    function hasJa() { return speechSynthesis.getVoices().some(function (v) { return /^ja/i.test(v.lang); }); }
    function show() {
      if (!hasJa()) return;
      document.querySelectorAll('.speak').forEach(function (b) { b.hidden = false; });
    }
    show();
    speechSynthesis.addEventListener('voiceschanged', show);
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.speak');
      if (!b) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(b.dataset.say);
      u.lang = 'ja-JP';
      speechSynthesis.speak(u);
    });
  });
})();
