(() => {
  const layer = document.createElement('div');
  layer.className = 'code-rain';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const snippets = [
    'const agent = NOCTTY;', 'await observe();', 'if (quiet) hold();',
    'proof.verify(π);', 'state = "watch";', 'sign(silence);',
    '0x7f → 0x01', 'while (night) {', '  await decide();', '}',
    'hash(prev, now)', 'policy.lock();', 'return HOLD;',
    'history.append(π);', '01001110 01001111', 'verify(signature)',
    '// every silence signed', 'proof !== null'
  ];
  const colors = ['#39ff14', '#39d353', '#80e6b1', '#2e9bff'];
  function layout() {
    layer.replaceChildren();
    if (window.innerWidth <= 900) return;
    const gutter = (window.innerWidth - 680) / 2;
    const count = Math.min(10, Math.max(3, Math.floor(gutter / 65)));
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < count; i++) {
        const item = document.createElement('span');
        item.className = 'code-drop';
        item.textContent = snippets[(i * 3 + side * 7) % snippets.length];
        const width = Math.min(190, gutter - 20);
        item.style.width = width + 'px';
        item.style.left = (side ? window.innerWidth - gutter : 0) + 10 + Math.random() * Math.max(0, gutter - width - 20) + 'px';
        item.style.color = colors[(i + side) % colors.length];
        item.style.setProperty('--duration', (22 + Math.random() * 20) + 's');
        item.style.setProperty('--delay', (-Math.random() * 42) + 's');
        layer.appendChild(item);
      }
    }
  }
  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(layout, 180);
  });
  document.addEventListener('visibilitychange', () => {
    layer.classList.toggle('paused', document.hidden);
  });
  layout();
})();