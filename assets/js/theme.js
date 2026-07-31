(function () {
  var root = document.documentElement;
  var button = document.getElementById('theme-toggle');

  function setIcon(theme) {
    button.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  setIcon(root.getAttribute('data-theme'));

  button.addEventListener('click', function () {
    var current = root.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setIcon(next);
  });
})();
