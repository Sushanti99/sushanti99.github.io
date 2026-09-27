(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Headline: wrap each word (and each inline image or accent) so they arrive one after another.
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var i = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            var w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--i', i++);
            w.textContent = part;
            frag.appendChild(w);
          }
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1) {
        var wrap = document.createElement('span');
        wrap.className = 'w';
        wrap.style.setProperty('--i', i++);
        node.replaceWith(wrap);
        wrap.appendChild(node);
      }
    });
  });

  // Stagger siblings that rise together.
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (el, n) {
      el.classList.add('rise');
      el.style.setProperty('--d', (0.08 * n) + 's');
    });
  });

  var targets = document.querySelectorAll('.rise, .sec, .case, .foot, .plate');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Project index: a preview image trails the cursor, tilting with its speed.
  var list = document.querySelector('[data-peek-list]');
  if (!list || reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var peek = document.createElement('div');
  peek.className = 'peek';
  peek.setAttribute('aria-hidden', 'true');
  var imgs = {};
  list.querySelectorAll('[data-peek]').forEach(function (a) {
    var src = a.getAttribute('data-peek');
    if (imgs[src]) return;
    var img = new Image();
    img.src = src;
    img.alt = '';
    peek.appendChild(img);
    imgs[src] = img;
  });
  document.body.appendChild(peek);

  var x = 0, y = 0, tx = 0, ty = 0, raf = null;
  function loop() {
    var dx = tx - x;
    x += dx * 0.14;
    y += (ty - y) * 0.14;
    peek.style.setProperty('--x', (x + 24) + 'px');
    peek.style.setProperty('--y', (y - 110) + 'px');
    peek.style.setProperty('--r', Math.max(-8, Math.min(8, dx * 0.08)) + 'deg');
    raf = requestAnimationFrame(loop);
  }

  list.addEventListener('pointermove', function (e) {
    tx = e.clientX;
    ty = e.clientY;
  });

  list.querySelectorAll('[data-peek]').forEach(function (a) {
    a.addEventListener('pointerenter', function (e) {
      if (!raf) {
        x = tx = e.clientX;
        y = ty = e.clientY;
        loop();
      }
      Object.keys(imgs).forEach(function (k) { imgs[k].classList.remove('show'); });
      imgs[a.getAttribute('data-peek')].classList.add('show');
      peek.classList.add('on');
    });
  });

  list.addEventListener('pointerleave', function () {
    peek.classList.remove('on');
    setTimeout(function () {
      if (!peek.classList.contains('on') && raf) { cancelAnimationFrame(raf); raf = null; }
    }, 500);
  });
})();
