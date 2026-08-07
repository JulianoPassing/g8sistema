/**
 * Quantidade mobile: steppers +/− e resize seguro (não re-renderiza ao abrir teclado).
 */
(function (global) {
  'use strict';

  function escapeAttr(val) {
    return String(val == null ? '' : val)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  /**
   * HTML do stepper: [−] input [+]
   * @param {string} inputId
   * @param {{ value?: string|number, min?: number, placeholder?: string, className?: string, inputmode?: string, name?: string }} [opts]
   */
  function qtyStepperHtml(inputId, opts) {
    opts = opts || {};
    const min = opts.min != null ? Number(opts.min) : 0;
    const value = opts.value != null ? opts.value : min;
    const placeholder = opts.placeholder != null ? opts.placeholder : String(min);
    const className = opts.className ? ' ' + opts.className : '';
    const inputmode = opts.inputmode || 'numeric';
    const nameAttr = opts.name ? ` name="${escapeAttr(opts.name)}"` : '';
    const id = escapeAttr(inputId);

    return (
      `<div class="qty-stepper">` +
      `<button type="button" class="qty-stepper-btn" data-qty-delta="-1" data-qty-target="${id}" aria-label="Diminuir quantidade">−</button>` +
      `<input type="text" inputmode="${escapeAttr(inputmode)}" pattern="[0-9]*" min="${min}" ` +
      `value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" ` +
      `id="${id}" class="qty-stepper-input${className}"${nameAttr} autocomplete="off">` +
      `<button type="button" class="qty-stepper-btn" data-qty-delta="1" data-qty-target="${id}" aria-label="Aumentar quantidade">+</button>` +
      `</div>`
    );
  }

  function parseQty(val) {
    const n = parseInt(String(val == null ? '' : val).trim(), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function applyDelta(input, delta) {
    if (!input) return;
    const minAttr = input.getAttribute('min');
    const min = minAttr != null && minAttr !== '' ? parseInt(minAttr, 10) : 0;
    const next = Math.max(Number.isFinite(min) ? min : 0, parseQty(input.value) + delta);
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function bindDelegation(root) {
    const el = root || document;
    if (el.__g8QtyStepperBound) return;
    el.__g8QtyStepperBound = true;
    el.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('.qty-stepper-btn') : null;
      if (!btn) return;
      e.preventDefault();
      const targetId = btn.getAttribute('data-qty-target');
      const delta = parseInt(btn.getAttribute('data-qty-delta'), 10);
      if (!targetId || !Number.isFinite(delta)) return;
      const input = document.getElementById(targetId);
      applyDelta(input, delta);
    });
  }

  /**
   * Chama callback só quando a largura muda (ignora altura do teclado).
   * Por padrão só dispara se cruzar o breakpoint mobile/desktop.
   * @param {() => void} callback
   * @param {{ breakpointOnly?: boolean }} [opts]
   */
  function onWidthLayoutChange(callback, opts) {
    opts = opts || {};
    const breakpointOnly = opts.breakpointOnly !== false;
    let lastWidth = window.innerWidth;
    let lastMobile =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 768px)').matches
        : lastWidth <= 768;

    window.addEventListener('resize', function () {
      const width = window.innerWidth;
      if (width === lastWidth) return;

      const isMobile =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(max-width: 768px)').matches
          : width <= 768;

      const crossed = isMobile !== lastMobile;
      lastWidth = width;
      lastMobile = isMobile;

      if (breakpointOnly && !crossed) return;
      if (typeof callback === 'function') callback({ width: width, isMobile: isMobile });
    });
  }

  bindDelegation(document);

  /** Campo rotulado + stepper (grades de tamanho no mobile). */
  function qtyLabeledFieldHtml(inputId, label, opts) {
    opts = opts || {};
    const field =
      typeof qtyStepperHtml === 'function'
        ? qtyStepperHtml(inputId, opts)
        : `<input type="text" inputmode="numeric" min="${opts.min != null ? opts.min : 0}" value="${escapeAttr(opts.value != null ? opts.value : 0)}" placeholder="${escapeAttr(opts.placeholder != null ? opts.placeholder : '0')}" id="${escapeAttr(inputId)}">`;
    return `<div class="tamanho-qty-field"><label for="${escapeAttr(inputId)}">${escapeAttr(label)}</label>${field}</div>`;
  }

  global.g8QtyStepperHtml = qtyStepperHtml;
  global.g8QtyLabeledFieldHtml = qtyLabeledFieldHtml;
  global.g8OnWidthLayoutChange = onWidthLayoutChange;
  global.g8BindQtySteppers = bindDelegation;
})(typeof window !== 'undefined' ? window : this);
