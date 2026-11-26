import { CONFIG } from '../config.js';
// Система заданий: основные, побочные, ежедневные и задания подземелий. Состояние сохраняется вместе с игрой.
const Z = id => CONFIG.zones.find(z => z.id === id), P = id => ({ x: Z(id).x, z: Z(id).z });
const NPC = id => { for (const z of CONFIG.zones) for (const n of z.npcs || []) if (n.id === id) return { x: n.x, z: n.z, name: n.name }; };
const near = (p, t, r) => Math.hypot(p.x - t.x, p.z - t.z) < r;
const AR = CONFIG.teleports.arena;

export const DEFS = [
  { id: 'main1', type: 'main', title: 'Пробуждение забытого мира', where: 'Долина Пробуждения', reward: { coins: 1000, stones: 50 }, steps: [
    { text: 'Осмотрите древний камень', target: { x: 12, z: -16 }, done: w => w.flags.beacon },
    { text: 'Найдите деревню Тихий Ручей', target: P('village'), done: (w, p) => near(p, P('village'), 20) },
    { text: 'Поговорите со старостой Борином', target: NPC('borin'), done: w => w.flags.talk_borin },
    { text: 'Победите тренировочную мишень', target: { x: -10, z: -22 }, done: w => w.flags.dummy },
    { text: 'Дойдите до Древних руин', target: P('ruins'), done: (w, p) => near(p, P('ruins'), 22) }] },
  { id: 'main2', type: 'main', title: 'Испытание древнего портала', where: 'Древний портал', requires: 'main1', reward: { coins: 500, stones: 40 }, steps: [
    { text: 'Найдите древний портал', target: P('portal'), done: (w, p) => near(p, P('portal'), 14) },
    { text: 'Активируйте портал', target: P('portal'), done: w => w.flags.portalUsed },
    { text: 'Победите Аватара Люцифера', target: { x: AR.x, z: AR.z - 8 }, done: w => (w.flags['kill_lucifer-avatar'] || 0) > 0 },
    { text: 'Откройте сундук с наградой', target: { x: AR.x, z: AR.z - 17 }, done: w => w.flags.arenaChest },
    { text: 'Вернитесь в открытый мир через портал', target: { x: AR.x, z: AR.z + 18 }, done: (w, p) => Math.abs(p.x) < 300 }] },
  { id: 'side1', type: 'side', title: 'Помощь жителям', where: 'Деревня Тихий Ручей', reward: { coins: 800, stones: 20 }, steps: [
    { text: 'Поговорите со старостой Борином', target: NPC('borin'), done: w => w.flags.talk_borin },
    { text: 'Победите гниющих ходоков', target: { x: 40, z: 33 }, kill: { key: 'kill_rotwalker', n: 2 } },
    { text: 'Вернитесь к старосте Борину', target: NPC('borin'), done: w => w.flags.borinReport }] },
  { id: 'side2', type: 'side', title: 'Потерянный амулет', where: 'Деревня Каменный Брод', reward: { coins: 1200, stones: 30 }, steps: [
    { text: 'Поговорите с охотницей Лисой', target: NPC('lisa'), done: w => w.flags.talk_lisa },
    { text: 'Найдите амулет у алтаря в руинах', target: { x: Z('ruins').x + 3, z: Z('ruins').z }, done: w => w.flags.amulet },
    { text: 'Верните амулет Лисе', target: NPC('lisa'), done: w => w.flags.lisaReport }] },
  { id: 'daily1', type: 'daily', title: 'Уничтожение монстров', where: 'Любая местность', reward: { coins: 300, stones: 10 }, steps: [
    { text: 'Победите 3 монстров', target: null, kill: { key: 'kills', n: 3 } }] },
  { id: 'dungeon1', type: 'dungeon', title: 'Зов подземелья', where: 'Вход в подземелье', reward: { coins: 2000, stones: 60 }, steps: [
    { text: 'Войдите в подземелье', target: P('dungeon_gate'), done: (w, p) => p.x < -300 },
    { text: 'Победите отступника', target: { x: Z('dungeon').x, z: Z('dungeon').z + 18 }, done: w => (w.flags['kill_the-apostate'] || 0) > 0 },
    { text: 'Откройте сундук подземелья', target: { x: Z('dungeon').x, z: Z('dungeon').z + 22 }, done: w => w.flags.dungeonChest },
    { text: 'Вернитесь в открытый мир', target: P('dungeon_gate'), done: (w, p) => Math.abs(p.x) < 300 }] }
];
export const TYPE_NAMES = { main: 'Основное', side: 'Побочное', daily: 'Ежедневное', dungeon: 'Подземелье' };
const GENERIC = { mira: ['Свежие яблоки! Берите, пока не разобрали.', 'Говорят, на востоке есть древний портал. Но я туда не пойду.'], ion: ['Рыба не клюёт. Наверное, из-за монстров.', 'Каменный Брод держится только благодаря Лисе.'] };

export class Quests {
  constructor(world, hud, player) {
    this.w = world; this.hud = hud; this.pl = player; this.today = new Date().toDateString(); this.st = {}; this.tracked = 'main1';
    DEFS.forEach(d => { this.st[d.id] = { i: 0, done: false, base: null, date: null }; });
  }
  def(id) { return DEFS.find(d => d.id === id); }
  status(d) { const s = this.st[d.id]; return s.done ? 'done' : (d.requires && !this.st[d.requires].done) ? 'locked' : 'active'; }
  progress(d) {
    const s = d.steps[this.st[d.id].i]; if (!s?.kill) return null; const b = this.st[d.id].base ?? (this.w.flags[s.kill.key] || 0);
    return [Math.max(0, Math.min(s.kill.n, (this.w.flags[s.kill.key] || 0) - b)), s.kill.n];
  }
  all() { return DEFS.map(d => ({ def: d, status: this.status(d), i: this.st[d.id].i, tracked: this.tracked === d.id, prog: this.progress(d) })); }
  get title() { return this.def(this.tracked)?.title || ''; }
  current() {
    const d = this.def(this.tracked); if (!d || this.status(d) !== 'active') return { text: 'Выберите задание в журнале', target: null };
    const s = d.steps[this.st[d.id].i], pr = this.progress(d); return { text: s.text + (pr ? ` (${pr[0]}/${pr[1]})` : ''), target: s.target || null };
  }
  track(id) { this.tracked = id; }
  _next() { const d = DEFS.find(x => this.status(x) === 'active'); this.tracked = d ? d.id : ''; }
  _reward(d) {
    this.pl.inv.coins += d.reward.coins; this.pl.inv.stones += d.reward.stones;
    this.hud.toast(`Задание выполнено: ${d.title}. Награда: ${d.reward.coins} монет, ${d.reward.stones} Камней Истока`, 5000);
  }
  update(p) {
    for (const d of DEFS) {
      if (this.status(d) !== 'active') continue; const st = this.st[d.id], s = d.steps[st.i]; if (!s) continue;
      if (s.kill && st.base === null) st.base = this.w.flags[s.kill.key] || 0;
      const ok = s.kill ? (this.w.flags[s.kill.key] || 0) - st.base >= s.kill.n : s.done(this.w, p); if (!ok) continue;
      st.i++; st.base = null;
      if (st.i >= d.steps.length) { st.done = true; st.date = this.today; this._reward(d); if (this.tracked === d.id) this._next(); }
      else this.hud.toast('Задание обновлено: ' + d.title);
    }
  }
  talk(id) {
    const f = this.w.flags, n = NPC(id); let say;
    if (id === 'borin') {
      if (!f.talk_borin) { f.talk_borin = true; say = 'Добро пожаловать в Тихий Ручей! Гниющие ходоки бродят у восточной дороги. Победи двоих, и я тебя отблагодарю.'; }
      else if (!this.st.side1.done && this.st.side1.i >= 2 && !f.borinReport) { f.borinReport = true; say = 'Дорога снова безопасна. Спасибо тебе, вот награда!'; }
      else if (!this.st.side1.done) say = 'Гниющие ходоки на восточной дороге. Победи двоих и возвращайся.';
      else say = 'Спасибо за помощь, героиня. Тихий Ручей тебя не забудет.';
    } else if (id === 'lisa') {
      if (!f.talk_lisa) { f.talk_lisa = true; say = 'Я потеряла родовой амулет у алтаря в Древних руинах, на северо-западе от нас. Принеси его, пожалуйста.'; }
      else if (!f.amulet) say = 'Амулет должен лежать у алтаря в Древних руинах. Будь осторожна с призраками.';
      else if (!f.lisaReport) { f.lisaReport = true; say = 'Это он! Спасибо, ты меня очень выручила.'; }
      else say = 'Каменный Брод в долгу перед тобой.';
    } else { const l = GENERIC[id] || ['Добрый день.']; say = l[Math.floor(Math.random() * l.length)]; }
    this.hud.toast(`${n?.name || 'Житель'}: ${say}`, 6500);
  }
  serialize() { return { tracked: this.tracked, st: this.st }; }
  restore(o) {
    if (!o?.st) return; for (const id in o.st) if (this.st[id]) Object.assign(this.st[id], o.st[id]); if (o.tracked !== undefined) this.tracked = o.tracked;
    for (const d of DEFS) if (d.type === 'daily' && this.st[d.id].done && this.st[d.id].date !== this.today) this.st[d.id] = { i: 0, done: false, base: null, date: null };
  }
}
