import { state as S, setPreset, setGfx, setCtl, resetControls } from '../scripts/settings.js';
import { PRESET_NAMES, GFX_ROWS } from '../config.js';
import { logo } from './menu.js';

const el = (cls, parent, html = '', tag = 'div') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; parent?.appendChild(e); return e; };
const X = '<svg viewBox="0 0 24 24" fill="none" stroke="#1c1e4a" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export function openSettings(host, { input, onClose }) {
  const root = el('screen panel-screen', host), rail = el('rail', root); rail.appendChild(logo());
  const tabs = el('tabs', rail), body = el('settings-body', root), close = el('close-btn', root, X, 'button');
  let tab = 'gfx';
  const done = () => { root.remove(); onClose?.(); }; close.onclick = done;
  const draw = () => {
    tabs.innerHTML = ''; body.innerHTML = '';
    [['gfx', 'Графика'], ['ctl', 'Управление']].forEach(([id, name]) => { const t = el('tab' + (tab === id ? ' on' : ''), tabs, name, 'button'); t.onclick = () => { tab = id; draw(); }; });
    const card = el('card', body);
    if (tab === 'gfx') {
      el('card-title', card, 'Общее качество'); const pr = el('chips', card);
      PRESET_NAMES.forEach((n, i) => { const b = el('chip' + (S.gfx.preset === i ? ' on' : ''), pr, n, 'button'); b.onclick = () => { setPreset(i); draw(); }; });
      if (S.gfx.preset === 'custom') el('note', card, 'Выбраны индивидуальные параметры');
      GFX_ROWS.forEach(([key, name, info]) => {
        const row = el('row', card), head = el('row-head', row); el('row-name', head, name); el('row-info', head, info(S.gfx[key]));
        const seg = el('seg', row); for (let i = 0; i < 5; i++) { const s = el('seg-i' + (S.gfx[key] === i ? ' on' : ''), seg, PRESET_NAMES[i].replace('Очень высокое', 'Оч. высокое').replace('Максимальное', 'Макс.'), 'button'); s.onclick = () => { setGfx(key, i); draw(); }; }
      });
      el('note', card, 'Качество персонажа появится вместе с моделью Аэлии. Оно не будет снижать оригинальную модель и текстуры.');
    } else {
      const c = S.ctl; el('card-title', card, 'Управление');
      const slider = (name, key, min, max, step, fmt) => {
        const row = el('row', card), head = el('row-head', row); el('row-name', head, name); const v = el('row-info', head, fmt(c[key]));
        const r = el('', row, '', 'input'); Object.assign(r, { type: 'range', min, max, step, value: c[key] }); r.oninput = () => { setCtl(key, +r.value); v.textContent = fmt(+r.value); input.applyLayout(); };
      };
      slider('Размер джойстика', 'joySize', .7, 1.5, .05, v => Math.round(v * 100) + '%'); slider('Размер кнопок', 'btnSize', .7, 1.4, .05, v => Math.round(v * 100) + '%');
      slider('Прозрачность элементов', 'opacity', .3, 1, .05, v => Math.round(v * 100) + '%'); slider('Чувствительность камеры', 'camSens', .4, 2.5, .05, v => '×' + v.toFixed(2));
      const tg = el('row toggle', card), tl = el('', tg, '<div class="row-name">Автоматический бег</div><div class="row-info">Бег при полном отклонении джойстика</div>'); const sw = el('switch' + (c.autoRun ? ' on' : ''), tg, '', 'button'); sw.onclick = () => { setCtl('autoRun', !S.ctl.autoRun); draw(); };
      const fp = el('row toggle', card, '<div><div class="row-name">Вид от первого лица</div><div class="row-info">Выключено: вид от третьего лица</div></div>'), fsw = el('switch' + (c.camMode === 'first' ? ' on' : ''), fp, '', 'button');
      fsw.onclick = () => { setCtl('camMode', S.ctl.camMode === 'first' ? 'third' : 'first'); draw(); };
      const e = el('pill wide', card, 'Изменить расположение кнопок', 'button'); e.onclick = () => { root.remove(); input.beginEdit(() => openSettings(host, { input, onClose })); };
      const r = el('pill wide ghost', card, 'Вернуть стандартную раскладку', 'button'); r.onclick = () => { resetControls(); input.runToggle = false; input.els.run.classList.remove('on'); input.applyLayout(); draw(); };
    }
  };
  draw(); return root;
}
