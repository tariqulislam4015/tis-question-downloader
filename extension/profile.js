/* Developer profile card (shared by the page panel and the toolbar popup). */
(function (root) {
  'use strict';

  var PROFILE = {
    name: 'তারিকুল ইসলাম (সুমন)',
    position: 'Msc Mathematics',
    initials: 'তা',
    links: [
      { kind: 'yt', label: 'TIS Academy', sub: 'youtube.com/@tis.academy24', url: 'https://www.youtube.com/@tis.academy24' },
      { kind: 'fb', label: 'Facebook', sub: 'facebook.com/tariqul.islam.422531', url: 'https://www.facebook.com/tariqul.islam.422531/' },
      { kind: 'wa', label: 'WhatsApp', sub: 'wa.me/8801755489719', url: 'https://wa.me/8801755489719' },
      { kind: 'gh', label: 'GitHub', sub: 'github.com/tariqulislam4015', url: 'https://github.com/tariqulislam4015' },
      { kind: 'li', label: 'LinkedIn', sub: 'linkedin.com/in/tariqul3315', url: 'https://www.linkedin.com/in/tariqul3315/' }
    ]
  };

  // Simple, self-drawn icons (no external files, work offline)
  var ICONS = {
    yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#FF0000"/><path d="M10 8.6v6.8l5.8-3.4z" fill="#fff"/></svg>',
    fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1877F2"/><path d="M13.3 19.5v-6.2h2.1l.3-2.5h-2.4V9.3c0-.7.2-1.2 1.2-1.2h1.3V5.9c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.8H8.6v2.5h2.1v6.2z" fill="#fff"/></svg>',
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8a10.1 10.1 0 0 0-8.7 15.3L1.9 22.2l5.2-1.4A10.1 10.1 0 1 0 12 1.8z" fill="#25D366"/><path d="M8.6 6.9c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.8 5.9 5.1 2.9 1.1 3.5.9 4.1.8.6-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.7-.4l-2.1-1c-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6z" fill="#fff"/></svg>',
    li: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="1.5" width="21" height="21" rx="4" fill="#0A66C2"/><rect x="5.6" y="9.6" width="2.9" height="8.6" fill="#fff"/><circle cx="7.05" cy="6.6" r="1.7" fill="#fff"/><path d="M10.6 9.6h2.8v1.2c.4-.8 1.4-1.4 2.7-1.4 2.6 0 3.1 1.7 3.1 3.9v4.9h-2.9v-4.3c0-1-.1-2.3-1.4-2.3-1.4 0-1.6 1.1-1.6 2.2v4.4h-2.9z" fill="#fff"/></svg>',
    gh: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#181717"/><circle cx="8.5" cy="7.5" r="1.7" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="8.5" cy="16.5" r="1.7" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="15.5" cy="9.5" r="1.7" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M8.5 9.2v5.6M15.5 11.2c0 2.3-2.2 2.6-4.5 3.4-1 .4-1.9.8-2.3 1.4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /**
   * build(photoUrls) -> HTMLElement
   * photoUrls: list of image URLs to try in order (e.g. photo.jpg, photo.png).
   * If none loads, an animated initial is shown instead.
   */
  function build(photoUrls) {
    var card = el('div', 'tisp-card');

    var avatar = el('div', 'tisp-avatar');
    var ring = el('div', 'tisp-ring');
    var inner = el('div', 'tisp-inner');
    var initials = el('span', 'tisp-initials', PROFILE.initials);
    inner.appendChild(initials);
    avatar.appendChild(ring);
    avatar.appendChild(inner);
    card.appendChild(avatar);

    (function tryPhoto(i) {
      if (!photoUrls || i >= photoUrls.length) return;
      var img = new Image();
      img.alt = PROFILE.name;
      img.className = 'tisp-photo';
      img.onload = function () { inner.innerHTML = ''; inner.appendChild(img); };
      img.onerror = function () { tryPhoto(i + 1); };
      img.src = photoUrls[i];
    })(0);

    card.appendChild(el('div', 'tisp-name', PROFILE.name));

    var pos = el('div', 'tisp-pos');
    pos.appendChild(el('span', 'tisp-rule tisp-rule-l'));
    pos.appendChild(el('span', 'tisp-pos-text', PROFILE.position));
    pos.appendChild(el('span', 'tisp-rule tisp-rule-r'));
    card.appendChild(pos);

    var list = el('div', 'tisp-links');
    PROFILE.links.forEach(function (l, i) {
      var a = el('a', 'tisp-link tisp-' + l.kind);
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = l.url;
      a.style.animationDelay = (0.55 + i * 0.12) + 's';
      var ic = el('span', 'tisp-icon');
      ic.innerHTML = ICONS[l.kind];
      var txt = el('span', 'tisp-txt');
      txt.appendChild(el('span', 'tisp-label', l.label));
      txt.appendChild(el('span', 'tisp-sub', l.sub));
      a.appendChild(ic);
      a.appendChild(txt);
      a.appendChild(el('span', 'tisp-go', '↗'));
      list.appendChild(a);
    });
    card.appendChild(list);
    return card;
  }

  root.TisProfile = { build: build, data: PROFILE };
})(typeof window !== 'undefined' ? window : globalThis);
