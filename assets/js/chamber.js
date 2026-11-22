/*
  Test chambers.

  Each page is a one-point-perspective room drawn with CSS 3D: left wall, right wall,
  floor and ceiling are real 3D faces; the back wall is a flat layer sized to exactly
  where the back of the room projects, so the content mounted on it stays crisp.

  Clicks do everything:
    - portals on the walls fly you into another chamber
    - any white panel takes a portal of your own (dark metal fizzles); click one to warp
    - the ceiling dropper / floor button dispenses a cube; click the cube to disintegrate it
*/
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.getElementById('stage-root');
  var store = document.getElementById('content');
  var hudRoom = document.querySelector('.hud-room');
  var capEl = document.querySelector('.caption');
  var capText = document.querySelector('.caption-text');
  var device = document.querySelector('.device');

  var ROOMS = {
    lobby:    { num: '00', name: 'Lobby',    prev: null,       next: 'about',    seed: 4,  picto: 'person' },
    about:    { num: '01', name: 'About',    prev: 'lobby',    next: 'projects', seed: 9,  picto: 'stairs' },
    projects: { num: '02', name: 'Projects', prev: 'about',    next: 'books',    seed: 15, picto: 'cube' },
    books:    { num: '03', name: 'Books',    prev: 'projects', next: 'lobby',    seed: 22, picto: 'book' }
  };
  var ORDER = ['lobby', 'about', 'projects', 'books'];
  // You go in through blue and come out of orange, so the orange portal behind you leads back.
  function exits(key) {
    var R = ROOMS[key], list = [];
    if (R.prev) list.push({ to: R.prev, color: 'orange', dir: 'prev', title: '&larr; ' + ROOMS[R.prev].name });
    list.push({ to: R.next, color: 'blue', dir: 'next', title: R.next === 'lobby' ? 'Start over &rarr;' : ROOMS[R.next].name + ' &rarr;' });
    return list;
  }

  var LINES = {
    intro: 'Hello, and welcome. This website will now assemble itself. Please stand clear of the panels.',
    lobby: [
      'Welcome to the lobby. The portal on the right leads to the first chamber.',
      'You are back in the lobby. The lobby is pleased to see you. The lobby has no feelings.'
    ],
    about: [
      'Chamber one: the subject’s history. There will not be a quiz. There might be a quiz.',
      'You have returned to the subject’s history. It has not changed. History rarely does.'
    ],
    projects: [
      'Chamber two contains three projects. Each was tested extensively on its creator.',
      'Flip a card to see how it works. The cards are rated for up to one million flips.'
    ],
    books: [
      'Chamber three, the final chamber: the library. Two books in progress. Please do not reveal the endings.',
      'Greenlights has been moved to the finished shelf. Congratulations have been logged.'
    ]
  };
  var SAY = {
    fizzle: [
      'That surface does not accept portals. It never has.',
      'Dark metal is not portal-compatible. This is in the manual.',
      'Please aim for the white panels. The dark ones are load-bearing.'
    ],
    light: 'That is a light. Please do not put a portal in the light.',
    taken: 'There is already a portal there. Portals do not stack.',
    first: 'Portal placed. A portal on its own is only half a thought. Place the other one.',
    pair: 'Two portals. Click either one to go through. Try not to think about it too hard.',
    lonely: 'Portals work in pairs. Place the other one first.',
    warp: [
      'You have travelled a short distance at great expense. Well done.',
      'Teleport successful. Your atoms are approximately where you left them.',
      'Again? Fine. The portals do not get tired. Probably.'
    ],
    cube: 'A cube has been dispensed. Please do not grow attached to it.',
    press: 'Excellent. You pressed a button using a cube. This will be noted on your permanent record.',
    pressed: 'The button is already pressed. By a cube. As designed.',
    gone: 'The cube has been disintegrated. It did not suffer. It was a cube.',
    face: [
      'That is the subject. She is considerably friendlier than this announcer.',
      'Portal colour adjusted. The subject remains unchanged.'
    ],
    clear: 'Portals closed. Your portal device is ready.',
    nothing: 'You have no portals to close. Click a white panel first.'
  };

  var PICTO = {
    person: '<path d="M12 2.4a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4zM8.3 9h7.4l-.9 6.6h-1.7l-.6 6h-1l-.6-6H9.2z"/>',
    stairs: '<path d="M3 21v-4.2h4.5v-4.2H12V8.4h4.5V4.2H21V21z"/>',
    cube: '<path d="M12 2.2 20.6 7 12 11.8 3.4 7z" opacity=".55"/><path d="M3 8.3l8.3 4.7v8.8L3 17.1z"/><path d="M21 8.3 12.7 13v8.8l8.3-4.7z" opacity=".8"/>',
    book: '<path d="M2.5 5.2c3.3-1.3 6.4-1 9 1v14c-2.6-2-5.7-2.3-9-1zM21.5 5.2c-3.3-1.3-6.4-1-9 1v14c2.6-2 5.7-2.3 9-1z"/>'
  };

  /* ------------------------------------------------------------------ helpers */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }
  function px(n) { return Math.round(n * 100) / 100 + 'px'; }
  function place(n, x, y, w, h) {
    n.style.left = px(x); n.style.top = px(y); n.style.width = px(w); n.style.height = px(h);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function other(c) { return c === 'blue' ? 'orange' : 'blue'; }
  function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + PICTO[name] + '</svg>';
  }
  var ROOM_SVG = '<svg class="np-view" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true">' +
    '<rect x="19" y="33" width="22" height="34"/><path d="M0 0 19 33M60 0 41 33M0 100 19 67M60 100 41 67M19 50H0M41 50h19M30 33V0M30 67v33"/></svg>';

  /* ------------------------------------------------------------------ dithered backdrops */

  // Ordered (Bayer 8x8) dithering: drawn once into a small canvas, scaled up with crisp pixels.
  var BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
               3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];

  function ditherCanvas(cssW, cssH, dot, step, shade, cls) {
    var w = Math.max(2, Math.ceil(cssW / dot)), h = Math.max(2, Math.ceil(cssH / dot));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.className = cls;
    c.setAttribute('aria-hidden', 'true');
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data, col = [0, 0, 0];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        shade(x, y, x / (w - 1), y / (h - 1), col);
        var t = (BAYER[((y & 7) << 3) + (x & 7)] + 0.5) / 64 - 0.5;
        var i = (y * w + x) * 4;
        for (var k = 0; k < 3; k++) {
          var v = Math.round((col[k] + t * step) / step) * step;
          d[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function hash2(x, y, seed) {
    var n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function vnoise(x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), e = hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
  }
  function fbm(x, y, seed) {
    var sum = 0, amp = 0.5, f = 1;
    for (var o = 0; o < 4; o++) { sum += amp * vnoise(x * f, y * f, seed + o); f *= 2; amp *= 0.5; }
    return sum;
  }
  function glow(u, v, cu, cv, su, sv) {
    var du = (u - cu) / su, dv = (v - cv) / sv;
    return Math.exp(-(du * du + dv * dv));
  }

  // Back wall: dark metal, lit by whatever portals are on the side walls.
  function backdrop(w, h, room) {
    var hasPrev = !!room.prev;
    return ditherCanvas(w, h, 3, 18, function (x, y, u, v, out) {
      var top = 1 - v;
      var r = 17 + top * 7, g = 20 + top * 8, b = 24 + top * 10;
      var gb = glow(u, v, 1.02, 0.72, 0.32, 0.42) * 0.42;
      var go = hasPrev ? glow(u, v, -0.02, 0.72, 0.32, 0.42) * 0.38 : 0;
      var vig = 1 - 0.55 * ((u - 0.5) * (u - 0.5) + (v - 0.45) * (v - 0.45));
      out[0] = (r + 39 * gb + 255 * go * 0.9) * vig;
      out[1] = (g + 164 * gb + 138 * go * 0.9) * vig;
      out[2] = (b + 255 * gb + 26 * go * 0.9) * vig;
    }, 'dither');
  }

  // Opening: space at the top, dithered cloud in the middle, orange light coming up the shaft.
  function sky(w, h) {
    var aspect = w / h;
    return ditherCanvas(w, h, 3, 24, function (x, y, u, v, out) {
      var r, g, b;
      if (v < 0.55) { var t = v / 0.55; r = 3 + 6 * t; g = 5 + 19 * t; b = 9 + 36 * t; }
      else { var t2 = (v - 0.55) / 0.45; r = 9 + 9 * t2; g = 24 + 22 * t2; b = 45 + 30 * t2; }
      // stars, thinning out towards the clouds
      if (v < 0.6 && hash2(x, y, 3) > 0.9965) { var s = (1 - v / 0.6) * (150 + hash2(y, x, 9) * 105); r += s; g += s; b += s; }
      // cloud band
      var n = fbm(u * 3.2 * aspect, v * 6, 11);
      var band = glow(0, v, 0, 0.66, 1, 0.16);
      var cl = Math.max(0, Math.min(1, (n - 0.42) / 0.3)) * band;
      r += 60 * cl; g += 112 * cl; b += 160 * cl;
      // orange glow from the shaft, and a wide warm haze
      var go = glow(u, v, 0.5, 0.97, 0.16 / aspect * 1.6, 0.11) * 0.95 + glow(u, v, 0.5, 1.05, 0.6, 0.3) * 0.22;
      r += 255 * go; g += 120 * go; b += 24 * go;
      out[0] = r; out[1] = g; out[2] = b;
    }, 'sky');
  }

  /* ------------------------------------------------------------------ geometry */

  var G;
  function measure() {
    var W = window.innerWidth, H = window.innerHeight;
    var mobile = W < 720 || H < 480;
    var s0 = mobile ? 0.93 : (W < 1100 ? 0.77 : 0.735);
    var P = mobile ? 700 : 950;
    var D = P * (1 / s0 - 1);
    var PS = mobile ? 64 : clamp(Math.round(H / 7.2), 92, 132);
    G = {
      W: W, H: H, P: P, D: D, s0: s0, PS: PS, mobile: mobile,
      cx: W / 2, cy: H / 2,
      bl: W * (1 - s0) / 2, bt: H * (1 - s0) / 2, bw: W * s0, bh: H * s0
    };
  }

  // Screen point -> which surface, and where on it (in that surface's own px).
  function pick(sx, sy) {
    var g = G;
    if (sx >= g.bl && sx <= g.bl + g.bw && sy >= g.bt && sy <= g.bt + g.bh) {
      return { face: 'back', lx: sx - g.bl, ly: sy - g.bt };
    }
    var k, Z, o;
    k = (g.cx - sx) / g.cx;                                   // left wall, X = 0
    if (k > g.s0 && k <= 1.001) { o = g.cy + (sy - g.cy) / k; Z = g.P - g.P / k; if (o >= 0 && o <= g.H) return { face: 'left', lx: -Z, ly: o }; }
    k = (sx - g.cx) / (g.W - g.cx);                           // right wall, X = W
    if (k > g.s0 && k <= 1.001) { o = g.cy + (sy - g.cy) / k; Z = g.P - g.P / k; if (o >= 0 && o <= g.H) return { face: 'right', lx: g.D + Z, ly: o }; }
    k = (sy - g.cy) / (g.H - g.cy);                           // floor, Y = H
    if (k > g.s0 && k <= 1.001) { o = g.cx + (sx - g.cx) / k; Z = g.P - g.P / k; if (o >= 0 && o <= g.W) return { face: 'floor', lx: o, ly: g.D + Z }; }
    k = (g.cy - sy) / g.cy;                                   // ceiling, Y = 0
    if (k > g.s0 && k <= 1.001) { o = g.cx + (sx - g.cx) / k; Z = g.P - g.P / k; if (o >= 0 && o <= g.W) return { face: 'ceil', lx: o, ly: -Z }; }
    return null;
  }

  // A point on a surface -> room coordinates (used to ripple animations through space).
  function world(face, x, y) {
    var g = G;
    switch (face) {
      case 'back': return [g.cx + (x - g.bw / 2) / g.s0, g.cy + (y - g.bh / 2) / g.s0, -g.D];
      case 'left': return [0, y, -x];
      case 'right': return [g.W, y, x - g.D];
      case 'floor': return [x, g.H, y - g.D];
      default: return [x, 0, -y];
    }
  }

  /* ------------------------------------------------------------------ building a chamber */

  var PORTALABLE = { w: 1, w2: 1, f: 1, c: 1 };

  function Face(name, node, w, h, cols, rows) {
    this.name = name; this.node = node; this.w = w; this.h = h;
    this.cols = cols; this.rows = rows; this.pw = w / cols; this.ph = h / rows;
    this.grid = []; this.blocks = [];
  }
  Face.prototype.cell = function (x, y) {
    var c = clamp(Math.floor(x / this.pw), 0, this.cols - 1);
    var r = clamp(Math.floor(y / this.ph), 0, this.rows - 1);
    return this.grid[r * this.cols + c];
  };
  Face.prototype.reserve = function (x, y, w, h, type) {
    var c0 = clamp(Math.floor(x / this.pw), 0, this.cols - 1), c1 = clamp(Math.floor((x + w) / this.pw), 0, this.cols - 1);
    var r0 = clamp(Math.floor(y / this.ph), 0, this.rows - 1), r1 = clamp(Math.floor((y + h) / this.ph), 0, this.rows - 1);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) this.grid[r * this.cols + c] = type;
    this.blocks.push({ x: x, y: y, w: w, h: h });
  };
  Face.prototype.blocked = function (x, y, w, h) {
    return this.blocks.some(function (b) {
      return x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y;
    });
  };

  function generate(face, rnd) {
    var n = face.cols * face.rows;
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / face.cols), c = i % face.cols, t;
      if (face.name === 'ceil') {
        t = (r === Math.floor(face.rows / 2) && c % 2 === 1 && c < face.cols - 1) ? 'l' : 'c';
      } else if (face.name === 'floor') {
        t = 'f';
      } else {
        t = r === face.rows - 1 ? 'm' : (rnd() < 0.1 ? 'w2' : 'w');
      }
      face.grid.push(t);
    }
  }

  function paint(face, mode, origin) {
    var html = '';
    var gap = G.mobile ? 1.5 : 2.5;
    for (var i = 0; i < face.grid.length; i++) {
      var r = Math.floor(i / face.cols), c = i % face.cols;
      var x = c * face.pw, y = r * face.ph;
      var style = 'left:' + px(x + gap / 2) + ';top:' + px(y + gap / 2) + ';width:' + px(face.pw - gap) + ';height:' + px(face.ph - gap) + ';';
      var cls = 'pn ' + face.grid[i];
      if (mode === 'intro') {
        var wp = world(face.name, x + face.pw / 2, y + face.ph / 2);
        var d = Math.hypot(wp[0] - origin[0], wp[1] - origin[1], wp[2] - origin[2]);
        var animate = mode === 'intro' && (face.name !== 'back' || Math.random() < 0.7);
        if (animate) {
          var speed = mode === 'intro' ? 1.15 : 3.2;
          var base = mode === 'intro' ? 650 : 120;
          style += '--d:' + Math.round(base + d / speed + Math.random() * 120) + 'ms;--rx:' + Math.round((Math.random() - 0.5) * 200) + 'deg;--ry:' + Math.round((Math.random() - 0.5) * 120) + 'deg;';
          cls += ' fly';
        }
      }
      html += '<i class="' + cls + '" style="' + style + '"></i>';
    }
    var layer = el('div', 'panels');
    layer.innerHTML = html;
    face.node.insertBefore(layer, face.node.firstChild);
  }

  function chamberSign(key) {
    var R = ROOMS[key];
    var icons = ORDER.map(function (k) { return icon(ROOMS[k].picto, k === key ? 'on' : ''); }).join('');
    return '<div class="cs-top"><span class="cs-num">' + R.num + '</span><span class="cs-of">/03</span></div>' +
      '<div class="cs-bar"><i style="width:' + (parseInt(R.num, 10) / 3 * 100) + '%"></i></div>' +
      '<div class="cs-name">' + R.name + '</div>' +
      '<div class="cs-icons">' + icons + '</div>' +
      '<div class="cs-foot">' + ORDER.indexOf(key) + ' of 3 chambers cleared</div>';
  }

  function navPortal(face, ex, x, y, w, h) {
    var to = ex.to, color = ex.color;
    var b = el('button', 'nav-portal portal ' + color, '<span class="swirl"></span>' + ROOM_SVG);
    b.type = 'button';
    b.dataset.go = to;
    b.dataset.color = color;
    b.dataset.dir = ex.dir;
    b.dataset.name = ROOMS[to].name;
    b.setAttribute('aria-label', 'Enter ' + ROOMS[to].name);
    place(b, x - w / 2, y - h / 2, w, h);
    face.node.appendChild(b);

    var lw = Math.min(w * 1.9, G.D * 0.42), lh = Math.min(58, h * 0.28);
    var label = el('div', 'wall-label ' + color, '<b>' + ROOMS[to].num + '</b><span>' + ex.title + '</span>');
    place(label, x - lw / 2, y - h / 2 - lh - 22, lw, lh);
    label.style.fontSize = px(Math.min(lh * 0.5, lw / 5.2));
    face.node.appendChild(label);

    face.reserve(x - lw / 2, y - h / 2 - lh - 22, lw, h + lh + 22, face.name === 'floor' ? 'f' : 'w');
  }

  var stage = null, current = null, faces = null, busy = false;
  var visits = {};

  function buildStage(key, mode) {
    var g = G, R = ROOMS[key], rnd = rng(R.seed + (g.mobile ? 100 : 0));
    var st = el('div', 'stage stage--' + key + (mode === 'intro' ? ' intro' : '') + (mode !== 'none' ? ' assemble' : ''));
    st.dataset.room = key;
    st.style.setProperty('--bw', px(g.bw));
    st.style.setProperty('--bh', px(g.bh));

    var back = el('div', 'back');
    place(back, g.bl, g.bt, g.bw, g.bh);
    var marks = el('div', 'marks');
    var holder = el('div', 'back-content');
    back.appendChild(marks);
    back.appendChild(holder);

    var room = el('div', 'room');
    room.style.perspective = px(g.P);
    var shell = el('div', 'shell');
    room.appendChild(shell);

    var F = {};
    F.back = new Face('back', back, g.bw, g.bh, Math.max(2, Math.round(g.W / g.PS)), Math.max(2, Math.round(g.H / g.PS)));
    var spec = {
      left:  [0, 0, g.D, g.H, '0 50%', 'rotateY(90deg)'],
      right: [g.W - g.D, 0, g.D, g.H, '100% 50%', 'rotateY(-90deg)'],
      floor: [0, g.H - g.D, g.W, g.D, '50% 100%', 'rotateX(90deg)'],
      ceil:  [0, 0, g.W, g.D, '50% 0', 'rotateX(-90deg)']
    };
    Object.keys(spec).forEach(function (name) {
      var s = spec[name];
      var n = el('div', 'face ' + name);
      place(n, s[0], s[1], s[2], s[3]);
      n.style.transformOrigin = s[4];
      n.style.transform = s[5];
      n.appendChild(el('div', 'shade'));
      shell.appendChild(n);
      var cols = Math.max(1, Math.round(s[2] / g.PS)), rows = Math.max(1, Math.round(s[3] / g.PS));
      if (name === 'left' || name === 'right') rows = F.back.rows;
      if (name === 'floor' || name === 'ceil') cols = F.back.cols;
      F[name] = new Face(name, n, s[2], s[3], cols, rows);
    });

    ['back', 'left', 'right', 'floor', 'ceil'].forEach(function (n) { generate(F[n], rnd); });

    // Back wall: dark metal (so, like in the game, it won't take a portal), lit by the side-wall portals.
    F.back.grid = F.back.grid.map(function () { return 'm'; });
    back.insertBefore(backdrop(g.bw, g.bh, R), back.firstChild);

    if (!g.mobile) {
      var D = g.D, H = g.H;
      var pw = clamp(D * 0.27, 64, 104), ph = clamp(H * 0.25, 150, 210);
      var py = H - ph / 2 - F.left.ph * 0.9;
      // left wall: one exit near the front, the chamber sign deeper in
      exits(key).forEach(function (ex) {
        navPortal(ex.dir === 'prev' ? F.left : F.right, ex, D * 0.5, py, pw, ph);
      });

      // cube dropper on the ceiling, button on the floor below it
      var col = F.floor.cols - 3, row = Math.max(0, F.floor.rows - 2);
      var bx = (col + 0.5) * F.floor.pw, by = (row + 0.5) * F.floor.ph;
      var bs = Math.min(F.floor.pw, F.floor.ph) * 0.78;
      var btn = el('button', 'fbutton', '<span class="fb-ring"></span><span class="fb-cap"></span>');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Floor button. Dispense a cube.');
      place(btn, bx - bs / 2, by - bs / 2, bs, bs);
      F.floor.node.appendChild(btn);
      F.floor.reserve(bx - bs / 2, by - bs / 2, bs, bs, 'f');

      var cz = by - g.D;                 // depth of the button
      var dy = -cz;                      // same depth on the ceiling
      var drop = el('button', 'dropper', '<span class="dr-iris"></span>');
      drop.type = 'button';
      drop.setAttribute('aria-label', 'Cube dropper');
      var ds = Math.min(F.ceil.pw, F.ceil.ph) * 0.8;
      place(drop, bx - ds / 2, dy - ds / 2, ds, ds);
      F.ceil.node.appendChild(drop);
      F.ceil.reserve(bx - ds / 2, dy - ds / 2, ds, ds, 'c');

      st._cube = { x: bx, z: cz, size: Math.min(F.floor.pw, F.floor.ph) * 0.62, shell: shell, btn: btn, drop: drop, el: null };
    }

    var origin = mode === 'intro' ? [g.W / 2, g.H / 2, -g.D] : [g.W / 2, g.H / 2, 0];
    ['left', 'right', 'floor', 'ceil'].forEach(function (n) { paint(F[n], mode, origin); });

    // content
    var sec = document.getElementById(key);
    holder.appendChild(sec);
    holder.scrollTop = 0;
    if (g.mobile) holder.appendChild(dock(key));
    st._section = sec;
    Array.prototype.forEach.call(holder.querySelectorAll('.solid, .dock'), function (n, i) {
      n.style.setProperty('--cd', (mode === 'intro' ? 1500 : 60) + i * 70 + 'ms');
    });

    if (mode === 'intro') st.appendChild(el('div', 'dim'));

    st.appendChild(back);
    st.appendChild(room);
    st._faces = F;
    return st;
  }

  function dock(key) {
    var d = el('nav', 'dock');
    d.setAttribute('aria-label', 'Exits');
    exits(key).forEach(function (ex) {
      var b = el('button', 'dock-portal ' + ex.color, '<span class="dp-ring"></span><span class="dp-name"><b>' + ROOMS[ex.to].num + '</b>' + ex.title + '</span>');
      b.type = 'button';
      b.dataset.go = ex.to;
      b.dataset.color = ex.color;
      b.dataset.dir = ex.dir;
      d.appendChild(b);
    });
    return d;
  }

  function retire(st) {
    if (st._section && st.contains(st._section)) store.appendChild(st._section);
    st.remove();
  }

  function mount(key, mode) {
    measure();
    var st = buildStage(key, mode);
    if (stage) retire(stage);
    root.appendChild(st);
    stage = st; faces = st._faces; current = key;
    resetToys();
    markHud(key);
    if (mode !== 'none') setTimeout(function () { st.classList.remove('assemble', 'intro'); }, mode === 'intro' ? 4000 : 900);
  }

  function markHud(key) {
    hudRoom.textContent = ' / ' + ROOMS[key].num + ' ' + ROOMS[key].name;
    document.querySelectorAll('.hud-nav a').forEach(function (a) {
      if (a.dataset.go === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = key === 'lobby' ? 'Sushanti' : ROOMS[key].name + ' · Sushanti';
  }

  function greet(key, first) {
    if (first) { say(LINES.intro, 600); return; }
    var n = visits[key] || 0;
    visits[key] = n + 1;
    say(LINES[key][Math.min(n, LINES[key].length - 1)], 500);
  }

  /* ------------------------------------------------------------------ travelling through a wall portal */

  // A portal-coloured iris opens out of the portal you clicked, the room swaps behind it, then it clears.
  function iris(rect, color, grow, done) {
    var x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    var rw = Math.max(rect.width / 2, 12), rh = Math.max(rect.height / 2, 20);
    var far = Math.max(Math.hypot(x, y), Math.hypot(G.W - x, y), Math.hypot(x, G.H - y), Math.hypot(G.W - x, G.H - y));
    var k = (far / Math.min(rw, rh)) * 1.15;
    var c = el('div', 'iris ' + (color || 'blue'));
    place(c, x - rw, y - rh, rw * 2, rh * 2);
    document.body.appendChild(c);
    var from = grow ? 'scale(1)' : 'scale(' + k + ')', to = grow ? 'scale(' + k + ')' : 'scale(1)';
    var anim = c.animate(
      grow ? [{ transform: from }, { transform: to }] : [{ transform: from, opacity: 1 }, { transform: to, opacity: 0 }],
      { duration: grow ? 260 : 240, easing: grow ? 'cubic-bezier(.55,0,.9,.5)' : 'cubic-bezier(.1,.5,.45,1)', fill: 'forwards' }
    );
    anim.onfinish = function () { done(c); };
  }

  function travel(to, rect, color) {
    if (busy || !stage) return;
    clearFree(false);
    if (reduce) { mount(to, 'none'); greet(to); return; }
    busy = true;
    iris(rect, color, true, function (c) {
      mount(to, 'enter');
      c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' }).onfinish = function () {
        c.remove();
        busy = false;
      };
      greet(to);
    });
  }

  function centreRect() {
    return { left: G.W / 2 - 40, top: G.H / 2 - 70, width: 80, height: 140 };
  }

  function routeKey() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (ROOMS[h]) return h;
    var t = h && document.getElementById(h);
    var sec = t && t.closest && t.closest('[data-room]');
    return sec ? sec.dataset.room : 'lobby';
  }

  function navigate(to, rect, color) {
    if (busy || to === current) return;
    var url = to === 'lobby' ? location.pathname + location.search : '#' + to;
    history.pushState(null, '', url);
    travel(to, rect, color);
  }

  window.addEventListener('popstate', function () {
    var to = routeKey();
    if (to !== current) travel(to, centreRect(), 'blue');
  });

  /* ------------------------------------------------------------------ your own portals */

  var free = { blue: null, orange: null };
  var nextColor = 'blue';
  var lastFizzleSay = 0;

  function portalSize(face) {
    var k = face === 'back' ? G.s0 : 1;
    var w = clamp(G.D * 0.27, 60, 100), h = clamp(G.H * 0.22, 130, 190);
    if (G.mobile) { w = 46; h = 80; k = 1; }
    return [w * k, h * k];
  }

  function shoot(sx, sy) {
    var hit = pick(sx, sy);
    if (!hit) return;
    var f = faces[hit.face];
    var sz = portalSize(hit.face), w = sz[0], h = sz[1];
    var type = f.cell(hit.lx, hit.ly);
    var lx = clamp(hit.lx, w / 2 + 3, f.w - w / 2 - 3);
    var ly = clamp(hit.ly, h / 2 + 3, f.h - h / 2 - 3);

    if (!PORTALABLE[type]) { fizzle(sx, sy, nextColor, type === 'l' ? SAY.light : pickOne(SAY.fizzle)); return; }
    if (f.blocked(lx - w / 2, ly - h / 2, w, h)) { fizzle(sx, sy, nextColor, SAY.taken); return; }
    var mine = free[other(nextColor)];
    if (mine && mine.face === hit.face && Math.abs(mine.x - lx) < w && Math.abs(mine.y - ly) < h) {
      fizzle(sx, sy, nextColor, SAY.taken); return;
    }

    var color = nextColor;
    if (free[color]) free[color].el.remove();
    var p = el('button', 'free-portal portal ' + color, '<span class="swirl"></span>');
    p.type = 'button';
    p.dataset.color = color;
    p.setAttribute('aria-label', color + ' portal. Click to go through.');
    place(p, lx - w / 2, ly - h / 2, w, h);
    (hit.face === 'back' ? stage.querySelector('.marks') : f.node).appendChild(p);
    free[color] = { el: p, face: hit.face, x: lx, y: ly };
    nextColor = other(color);
    burst(sx, sy, color, 10);
    updateDevice();
    if (free.blue && free.orange && !shoot.told) { shoot.told = true; say(SAY.pair); }
  }

  function fizzle(sx, sy, color, line) {
    burst(sx, sy, 'grey', 8);
    var r = el('div', 'fizz ' + color);
    r.style.left = px(sx); r.style.top = px(sy);
    document.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 600);
    var now = Date.now();
    if (now - lastFizzleSay > 3500) { lastFizzleSay = now; say(line); }
  }

  function burst(x, y, color, n) {
    if (reduce) return;
    for (var i = 0; i < n; i++) {
      var s = el('i', 'spark ' + color);
      var a = Math.random() * Math.PI * 2, d = 24 + Math.random() * 46;
      s.style.left = px(x); s.style.top = px(y);
      document.body.appendChild(s);
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + px(Math.cos(a) * d) + '), calc(-50% + ' + px(Math.sin(a) * d) + ')) scale(.2)', opacity: 0 }
      ], { duration: 420 + Math.random() * 260, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = (function (n) { return function () { n.remove(); }; })(s);
    }
  }

  var warpCount = 0;
  function warp(from) {
    var a = free[from], b = free[other(from)];
    if (!a) return;
    if (!b) { say(SAY.lonely); pulse(a.el); return; }
    if (busy) return;
    var line = SAY.warp[Math.min(warpCount++, SAY.warp.length - 1)];
    if (reduce) { pulse(b.el); say(line); return; }
    busy = true;
    iris(a.el.getBoundingClientRect(), from, true, function (c) {
      c.remove();
      iris(b.el.getBoundingClientRect(), other(from), false, function (c2) {
        c2.remove();
        busy = false;
        pulse(b.el);
        say(line);
      });
    });
  }

  function pulse(n) {
    n.classList.remove('pulse');
    void n.offsetWidth;
    n.classList.add('pulse');
  }

  function clearFree(announce) {
    var had = free.blue || free.orange;
    ['blue', 'orange'].forEach(function (c) { if (free[c]) free[c].el.remove(); free[c] = null; });
    nextColor = 'blue';
    updateDevice();
    if (announce) say(had ? SAY.clear : SAY.nothing);
  }

  function updateDevice() {
    if (!device) return;
    device.querySelector('.d-b').classList.toggle('on', !!free.blue);
    device.querySelector('.d-o').classList.toggle('on', !!free.orange);
    device.classList.toggle('armed-orange', nextColor === 'orange');
    var label = device.querySelector('span');
    label.textContent = free.blue && free.orange ? 'Close portals' : 'Portals';
  }

  /* ------------------------------------------------------------------ the cube */

  function resetToys() {
    free = { blue: null, orange: null };
    nextColor = 'blue';
    updateDevice();
  }

  function dispense() {
    var C = stage && stage._cube;
    if (!C) return;
    if (C.el) { say(C.landed ? SAY.pressed : SAY.cube); pulse(C.btn); return; }
    var g = G, s = C.size;
    var cube = el('button', 'cube',
      '<i class="cf f1"></i><i class="cf f2"></i><i class="cf f3"></i><i class="cf f4"></i><i class="cf f5"></i><i class="cf f6"></i>');
    cube.type = 'button';
    cube.setAttribute('aria-label', 'Cube. Click to disintegrate it.');
    cube.style.width = cube.style.height = px(s);
    cube.style.setProperty('--h', px(s / 2));
    C.shell.appendChild(cube);
    C.el = cube; C.landed = false;
    C.drop.classList.add('open');
    say(SAY.cube);

    var X = C.x - s / 2, Z = C.z, y0 = -s * 0.2, y1 = g.H - s - 7;
    function T(y, r) { return 'translate3d(' + px(X) + ',' + px(y) + ',' + px(Z) + ') rotateY(' + r + 'deg)'; }
    cube.style.transform = T(y1, 34);
    if (reduce) { land(); return; }
    cube.animate([
      { transform: T(y0, 0), opacity: 0, easing: 'linear' },
      { transform: T(y0 + s * 0.6, 4), opacity: 1, offset: 0.12, easing: 'cubic-bezier(.5,0,1,1)' },
      { transform: T(y1, 30), offset: 0.7, easing: 'cubic-bezier(0,0,.4,1)' },
      { transform: T(y1 - s * 0.32, 33), offset: 0.84, easing: 'cubic-bezier(.6,0,1,1)' },
      { transform: T(y1, 34), offset: 1 }
    ], { duration: 1150 }).onfinish = land;

    function land() {
      C.landed = true;
      C.drop.classList.remove('open');
      C.btn.classList.add('pressed');
      setTimeout(function () { if (C.el === cube) say(SAY.press); }, 900);
    }
  }

  function disintegrate() {
    var C = stage && stage._cube;
    if (!C || !C.el) return;
    var cube = C.el;
    C.el = null; C.landed = false;
    C.btn.classList.remove('pressed');
    var r = cube.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 'blue', 16);
    cube.classList.add('gone');
    setTimeout(function () { cube.remove(); }, reduce ? 0 : 700);
    say(SAY.gone);
  }

  /* ------------------------------------------------------------------ captions */

  var capTimer = null, typeTimer = null;
  function say(text, delay) {
    clearTimeout(capTimer); clearInterval(typeTimer);
    capTimer = setTimeout(function () {
      capEl.classList.add('on');
      if (reduce) { capText.textContent = text; }
      else {
        var i = 0;
        capText.textContent = '';
        typeTimer = setInterval(function () {
          i += 2;
          capText.textContent = text.slice(0, i);
          if (i >= text.length) clearInterval(typeTimer);
        }, 24);
      }
      capTimer = setTimeout(function () { capEl.classList.remove('on'); }, Math.max(3000, text.length * 48));
    }, delay || 0);
  }

  /* ------------------------------------------------------------------ clicks */

  var UI = 'a, button, input, .solid, .hud-top, .caption, .wall-label, .dock';

  document.addEventListener('click', function (e) {
    if (e.button !== 0) return;
    var t = e.target;
    if (!t.closest) return;

    var side = t.closest('.card.is-prev, .card.is-next');
    if (side) { e.preventDefault(); showProject(projectCards().indexOf(side)); return; }
    if (t.closest('.car-prev')) { showProject(carIndex - 1); return; }
    if (t.closest('.car-next')) { showProject(carIndex + 1); return; }
    var dot = t.closest('.car-dots [data-i]');
    if (dot) { showProject(+dot.dataset.i); return; }

    var go = t.closest('[data-go]');
    if (go) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      navigate(go.dataset.go, go.getBoundingClientRect(), go.dataset.color || 'blue');
      return;
    }
    var fp = t.closest('.free-portal');
    if (fp) { warp(fp.dataset.color); return; }
    if (t.closest('.dropper, .fbutton')) { dispense(); return; }
    if (t.closest('.cube')) { disintegrate(); return; }
    if (t.closest('.device')) { clearFree(true); return; }

    var face = t.closest('.portrait');
    if (face) { face.classList.toggle('is-orange'); say(pickOne(SAY.face)); return; }

    var tab = t.closest('.tabs [data-shelf]');
    if (tab) { showShelf(tab.dataset.shelf); return; }

    if (t.closest(UI)) return;
    if (!t.closest('.stage') || busy) return;
    if (String(window.getSelection ? window.getSelection() : '')) return;
    shoot(e.clientX, e.clientY);
  });

  // Projects: one card at a time, neighbours peeking either side.
  var carIndex = 0;
  function projectCards() { return Array.prototype.slice.call(document.querySelectorAll('.projects .card')); }
  function showProject(i) {
    var cards = projectCards(), n = cards.length;
    if (!n) return;
    carIndex = (i % n + n) % n;
    cards.forEach(function (c, k) {
      var rel = (k - carIndex + n) % n;
      c.classList.toggle('is-current', rel === 0);
      c.classList.toggle('is-next', rel === 1);
      c.classList.toggle('is-prev', rel === n - 1 && n > 2);
      c.setAttribute('aria-hidden', rel === 0 ? 'false' : 'true');
    });
    document.querySelectorAll('.car-dots [data-i]').forEach(function (d) {
      d.setAttribute('aria-current', +d.dataset.i === carIndex ? 'true' : 'false');
    });
  }
  showProject(0);

  document.addEventListener('keydown', function (e) {
    if (current !== 'projects' || busy || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') { showProject(carIndex + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { showProject(carIndex - 1); e.preventDefault(); }
  });

  function showShelf(name) {
    document.querySelectorAll('.tabs [data-shelf]').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.shelf === name ? 'true' : 'false');
    });
    document.querySelectorAll('ul.books[data-shelf]').forEach(function (u) {
      var on = u.dataset.shelf === name;
      u.hidden = !on;
      if (on && !reduce) {
        Array.prototype.forEach.call(u.children, function (li, i) {
          li.animate([
            { opacity: 0, transform: 'perspective(500px) rotateX(-80deg)' },
            { opacity: 1, transform: 'none' }
          ], { duration: 520, delay: i * 45, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'backwards' });
        });
      }
    });
  }
  showShelf('fiction');

  /* ------------------------------------------------------------------ hover tip on portals */

  var tip = el('div', 'tip');
  document.body.appendChild(tip);
  if (fine) {
    document.addEventListener('pointerover', function (e) {
      var portal = e.target.closest && e.target.closest('.nav-portal, .free-portal');
      if (!portal) { tip.classList.remove('on'); return; }
      if (portal.classList.contains('free-portal')) {
        tip.innerHTML = free.blue && free.orange ? '<span>Click to</span>go through' : '<span>Needs a</span>partner';
      } else {
        var lead = portal.dataset.dir === 'prev' ? 'Back to' : (portal.dataset.go === 'lobby' ? 'Start over' : 'Next chamber');
        tip.innerHTML = '<span>' + lead + '</span>' + ROOMS[portal.dataset.go].name;
      }
      tip.className = 'tip on ' + (portal.dataset.color || 'blue');
    });
    document.addEventListener('pointermove', function (e) {
      if (tip.classList.contains('on')) tip.style.transform = 'translate(' + px(e.clientX + 16) + ',' + px(e.clientY + 14) + ')';
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ start */

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var first = false;
  try {
    first = !sessionStorage.getItem('chamber-seen');
    sessionStorage.setItem('chamber-seen', '1');
  } catch (err) { first = true; }

  var startKey = routeKey();
  (function () {
    var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    var i = t ? projectCards().indexOf(t) : -1;
    if (i > -1) showProject(i);
  })();
  var opening = document.querySelector('.opening');
  var forceIntro = /[?&]intro\b/.test(location.search);
  if ((first || forceIntro) && startKey === 'lobby' && opening) {
    runOpening();
  } else {
    if (opening) opening.remove();
    mount(startKey, reduce ? 'none' : (first ? 'intro' : 'enter'));
    greet(startKey, first);
  }

  // The note, then the elevator ride down into the lobby.
  function runOpening() {
    var o = opening, lift = o.querySelector('.lift'), started = false, finished = false;
    o.hidden = false;
    var drawSky = function () {
      var old = o.querySelector('canvas.sky');
      var c = sky(window.innerWidth, window.innerHeight);
      if (old) old.replaceWith(c); else o.insertBefore(c, o.firstChild);
    };
    drawSky();
    window.addEventListener('resize', drawSky);
    document.body.classList.add('in-opening');

    function start() {
      if (started) return;
      started = true;
      if (reduce) { finish(); return; }
      o.classList.add('go');
      setTimeout(function () { lift.classList.add('closed'); }, 650);
      setTimeout(function () { o.classList.add('descend'); }, 1350);
      setTimeout(function () { lift.classList.remove('closed'); o.classList.add('arrive'); }, 4100);
      setTimeout(function () { o.classList.add('out'); }, 4700);
      setTimeout(finish, 5300);
    }
    function finish() {
      if (finished) return;
      finished = true;
      mount('lobby', reduce ? 'none' : 'intro');
      greet('lobby', true);
      window.removeEventListener('resize', drawSky);
      o.remove();
      document.body.classList.remove('in-opening');
    }
    lift.addEventListener('click', start);
    o.querySelector('.opening-cta').addEventListener('click', start);
    o.querySelector('.skip').addEventListener('click', finish);
    setTimeout(function () { lift.focus({ preventScroll: true }); }, 400);
  }

  var rz = null;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (!busy && stage) mount(current, 'none'); }, 180);
  });
})();
