import { TYPE_NAMES } from '../scripts/quests.js';
import { logo } from './menu.js';

const el = (cls, parent, html = '', tag = 'div') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; parent?.appendChild(e); return e; };
const X = '<svg viewBox="0 0 24 24" fill="none" stroke="#1c1e4a" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const TABS = [['all', 'Все задания'], ['main', 'Основные'], ['side', 'Побочные'], ['daily', 'Ежедневные'], ['dungeon', 'Подземелья']];
const STATUS = { active: 'Активно', locked: 'Недоступно', done: 'Выполнено' };

// Журнал заданий в стиле скриншота: список слева, подробности и награды справа, «Отслеживать» работает.
export function openQuests(host, { quests, onClose }) {
  const root = el('screen panel-screen', host), rail = el('rail', root); rail.appendChild(logo());
  const tabs = el('tabs', rail), body = el('quest-body', root), close = el('close-btn', root, X, 'button');
  let tab = 'all', sel = quests.tracked || 'main1'; close.onclick = () => { root.remove(); onClose?.(); };
  const draw = () => {
    tabs.innerHTML = ''; body.innerHTML = '';
    TABS.forEach(([id, n]) => { const t = el('tab' + (tab === id ? ' on' : ''), tabs, n, 'button'); t.onclick = () => { tab = id; draw(); }; });
    const list = el('q-list', body), det = el('q-detail card', body), all = quests.all().filter(q => tab === 'all' || q.def.type === tab);
    if (!all.some(q => q.def.id === sel) && all[0]) sel = all[0].def.id;
    all.forEach(q => {
      const it = el('q-item' + (q.def.id === sel ? ' on' : '') + (q.status !== 'active' ? ' dim' : ''), list, `<div class="q-t">${q.def.title}${q.tracked ? ' <span class="q-tag">отслеживается</span>' : ''}</div><div class="q-s">${TYPE_NAMES[q.def.type]}, ${q.def.where}. ${STATUS[q.status]}</div>`);
      it.onclick = () => { sel = q.def.id; draw(); };
    });
    const q = all.find(x => x.def.id === sel); if (!q) { det.textContent = 'Заданий нет'; return; }
    const d = q.def; el('card-title', det, d.title); el('note', det, `${TYPE_NAMES[d.type]}, ${d.where}`);
    d.steps.forEach((s, i) => {
      const state = q.status === 'done' || i < q.i ? 'ok' : (i === q.i && q.status === 'active' ? 'now' : '');
      el('q-step ' + state, det, `${state === 'ok' ? 'Выполнено' : state === 'now' ? 'Сейчас' : 'Далее'}: ${s.text}${state === 'now' && q.prog ? ` (${q.prog[0]}/${q.prog[1]})` : ''}`);
    });
    el('row-name q-rew', det, `Награда: ${d.reward.coins} монет, ${d.reward.stones} Камней Истока`);
    if (q.status === 'active') { const b = el('pill wide', det, q.tracked ? 'Отслеживается' : 'Отслеживать', 'button'); b.onclick = () => { quests.track(d.id); draw(); }; }
  };
  draw(); return root;
}
