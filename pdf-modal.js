"use strict";
/**
 *
 * HOW TO USE
 * ----------
 * 1. Build to plain JS, e.g.: tsc resource-modal.ts --target ES2017 --lib DOM,ES2017
 * 2. Host the compiled .js somewhere with a stable URL (GitHub Pages,
 *    Netlify, etc. — same setup as the existing nav-loader script).
 * 3. Send me the URL and which page(s) to wire it into. I'll load it via
 *    the onerror-injection trick (an <img onerror="..."> that creates a
 *    <script> tag pointing at your hosted file), the same workaround
 *    already used for the nav-loader, since Milemarker's sanitizer strips
 *    literal <script> tags submitted through the page-builder API.
 *
 * SCOPE NOTE: I don't have a way to create a GitHub repo, push commits, or
 * deploy to any hosting service from this session — hosting this is on
 * your side (or say the word and I can help think through that setup).
 */
(function () {
    'use strict';
    const OVERLAY_ID = 'resource-modal-overlay';
    const PANEL_ID = 'resource-modal-panel';
    const CLOSE_ID = 'resource-modal-close';
    const LABEL_ID = 'resource-modal-label';
    const TITLE_ID = 'resource-modal-title';
    const BODY_ID = 'resource-modal-body';
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;');
    }
    function injectStyles() {
        if (document.getElementById('resource-modal-styles'))
            return;
        const style = document.createElement('style');
        style.id = 'resource-modal-styles';
        style.textContent = `
      #${OVERLAY_ID} {
        display: none;
        position: fixed;
        inset: 0;
        background-color: rgba(15, 23, 42, .75);
        z-index: 9999;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      #${PANEL_ID} {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        max-width: 460px;
        width: 100%;
        padding: 26px 26px 22px 26px;
        position: relative;
      }
      #${PANEL_ID}.resource-modal-wide {
        max-width: 900px;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 800px;
      }
      #${CLOSE_ID} {
        position: absolute;
        top: 10px;
        right: 14px;
        color: #94a3b8;
        font-size: 20px;
        text-decoration: none;
        cursor: pointer;
        z-index: 1;
      }
      #${CLOSE_ID}:hover { color: #e2e8f0; }
      #${LABEL_ID} {
        color: #C5A572;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      #${TITLE_ID} {
        color: #e2e8f0;
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      #${PANEL_ID}.resource-modal-wide #${LABEL_ID},
      #${PANEL_ID}.resource-modal-wide #${TITLE_ID} {
        padding: 26px 26px 0 26px;
        margin-bottom: 12px;
      }
      #${BODY_ID} iframe {
        width: 100%;
        border: none;
        background-color: #0f172a;
      }
      #${PANEL_ID}:not(.resource-modal-wide) #${BODY_ID} iframe {
        height: 420px;
        border-radius: 8px;
      }
      #${PANEL_ID}.resource-modal-wide #${BODY_ID} {
        flex: 1;
        display: flex;
      }
      #${PANEL_ID}.resource-modal-wide #${BODY_ID} iframe {
        flex: 1;
      }
    `;
        document.head.appendChild(style);
    }
    function injectModal() {
        if (document.getElementById(OVERLAY_ID))
            return;
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.setAttribute('onclick', "if(event.target===this)document.getElementById('" + OVERLAY_ID + "').style.display='none'");
        overlay.innerHTML = `
      <div id="${PANEL_ID}">
        <a href="javascript:void(0)" id="${CLOSE_ID}">&times;</a>
        <div id="${LABEL_ID}"></div>
        <div id="${TITLE_ID}"></div>
        <div id="${BODY_ID}"></div>
      </div>
    `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay)
                closeResourceModal();
        });
        const closeBtn = document.getElementById(CLOSE_ID);
        if (closeBtn)
            closeBtn.addEventListener('click', closeResourceModal);
    }
    function closeResourceModal() {
        const overlay = document.getElementById(OVERLAY_ID);
        const body = document.getElementById(BODY_ID);
        if (overlay)
            overlay.style.display = 'none';
        if (body)
            body.innerHTML = ''; // stop any playing video / drop the iframe
    }
    function readResourceInfo(el) {
        return {
            type: (el.getAttribute('data-resource-type') || 'pdf').toLowerCase(),
            title: el.getAttribute('data-resource-title') || 'Resource',
            label: el.getAttribute('data-resource-label'),
            url: el.getAttribute('data-resource-url') || '',
            path: el.getAttribute('data-resource-path') || '',
        };
    }
    function openResourceModal(info) {
        const type = info.type;
        const title = info.title;
        const label = info.label
            ? (type === 'video' ? 'Video' : 'PDF') + ' · ' + info.label
            : type === 'video' ? 'Video' : 'PDF';
        const url = info.url;
        const path = info.path;
        const overlay = document.getElementById(OVERLAY_ID);
        const panel = document.getElementById(PANEL_ID);
        const labelEl = document.getElementById(LABEL_ID);
        const titleEl = document.getElementById(TITLE_ID);
        const bodyEl = document.getElementById(BODY_ID);
        if (!overlay || !panel || !labelEl || !titleEl || !bodyEl)
            return;
        labelEl.textContent = label;
        titleEl.textContent = title;
        if (url) {
            panel.classList.add('resource-modal-wide');
            const safeUrl = escapeAttr(url);
            bodyEl.innerHTML =
                type === 'video'
                    ? `<iframe src="${safeUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
                    : `<iframe src="${safeUrl}" title="${escapeAttr(title)}"></iframe>`;
        }
        else {
            panel.classList.remove('resource-modal-wide');
            bodyEl.innerHTML = `
        <div style="color:#64748b;font-size:12px;line-height:1.6;margin-bottom:6px;">Local file &mdash; not yet hosted.</div>
        ${path ? `<div style="color:#94a3b8;font-size:11px;line-height:1.5;font-family:monospace;word-break:break-all;">${escapeHtml(path)}</div>` : ''}
      `;
        }
        overlay.style.display = 'flex';
    }
    function isPdfHref(href) {
        try {
            const url = new URL(href, window.location.href);
            return /\.pdf$/i.test(url.pathname);
        }
        catch (_a) {
            return /\.pdf(\?|#|$)/i.test(href);
        }
    }
    function handleDocumentClick(e) {
        var _a;
        const target = e.target;
        if (!target)
            return;
        // Primary convention: data-resource-type tiles (the reusable pattern)
        const resourceEl = target.closest('[data-resource-type]');
        if (resourceEl) {
            e.preventDefault();
            openResourceModal(readResourceInfo(resourceEl));
            return;
        }
        // Fallback: a plain <a href="....pdf"> link with no data attributes,
        // opted in via data-pdf-modal="true", or opted out via "false"
        const link = target.closest('a[href]');
        if (link) {
            const optOut = link.getAttribute('data-pdf-modal') === 'false';
            if (optOut)
                return;
            const optIn = link.getAttribute('data-pdf-modal') === 'true';
            if (optIn || isPdfHref(link.href)) {
                e.preventDefault();
                openResourceModal({
                    type: 'pdf',
                    title: link.getAttribute('data-pdf-title') || ((_a = link.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || 'PDF',
                    label: null,
                    url: link.href,
                    path: '',
                });
            }
        }
    }
    function init() {
        injectStyles();
        injectModal();
        document.addEventListener('click', handleDocumentClick);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
})();
