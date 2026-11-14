// Runs before the page renders: pick the UI language (saved choice, else the browser's).
(function(){var d=document.documentElement,l=null;try{l=localStorage.getItem('ui')}catch(e){}
if(!l){var n=(navigator.language||'').toLowerCase();l=n.indexOf('my')==0?'my':n.indexOf('ja')==0?'ja':'en'}d.dataset.ui=l})();
