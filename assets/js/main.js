// Green2Gold — shared behaviour
(function () {
  // Mobile navigation toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Forms without a backend open the visitor's email client, addressed to Green2Gold
  document.querySelectorAll('form[data-mailto]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var subject = form.getAttribute('data-subject') || 'Website inquiry';
      var lines = [];
      new FormData(form).forEach(function (value, key) {
        if (key === 'interest') subject = subject + ' – ' + value;
        if (value) lines.push(key.charAt(0).toUpperCase() + key.slice(1) + ': ' + value);
      });
      window.location.href = 'mailto:' + form.getAttribute('data-mailto') +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
    });
  });

  // Searchable resource library
  var search = document.getElementById('lib-search');
  if (search) {
    var items = Array.prototype.slice.call(document.querySelectorAll('.lib-item'));
    var buttons = document.querySelectorAll('.filters button');
    var count = document.getElementById('lib-count');
    var activeCat = 'all';
    var apply = function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (el) {
        var okCat = activeCat === 'all' || (el.dataset.cat || '').split(' ').indexOf(activeCat) > -1;
        var okText = !q || el.textContent.toLowerCase().indexOf(q) > -1;
        el.hidden = !(okCat && okText);
        if (!el.hidden && el.tagName !== 'H2') shown++;
      });
      var total = items.filter(function (el) { return el.tagName !== 'H2'; }).length;
      if (count) count.textContent = shown + ' of ' + total + ' resources shown';
    };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        activeCat = b.dataset.filter;
        apply();
      });
    });
    search.addEventListener('input', apply);
    var hash = location.hash.replace('#', '');
    if (hash) {
      var target = document.getElementById(hash);
      if (target && target.tagName === 'DETAILS') target.open = true;
    }
    apply();
  }
})();
