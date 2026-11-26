import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { heightAt } from './world.js';

// Паки Fallen и Undead содержат НЕанимированные FBX. Пока нет скелета (Mixamo), движение процедурное: смещение, наклон, выпад.
export const TIERS = {
  low: { hp: 60, dmg: 6, speed: 2.4, aggro: 12, lvl: 2 }, mid: { hp: 140, dmg: 10, speed: 3, aggro: 14, lvl: 6 },
  high: { hp: 300, dmg: 16, speed: 3.4, aggro: 16, lvl: 12 }, boss: { hp: 900, dmg: 30, speed: 3.2, aggro: 25, lvl: 20 }
};
export const MONSTERS = {
  'rotwalker': { pack: 'undead', name: 'Гниющий ходок', tier: 'low' }, 'ossuary-legionary': { pack: 'undead', name: 'Костяной легионер', tier: 'low' },
  'chainwraith': { pack: 'undead', name: 'Цепной призрак', tier: 'mid' }, 'broken-cherub': { pack: 'fallen', name: 'Сломанный херувим', tier: 'mid' },
  'blind-seraph': { pack: 'fallen', name: 'Слепой серафим', tier: 'mid' }, 'necromancer': { pack: 'undead', name: 'Некромант', tier: 'high' },
  'the-apostate': { pack: 'fallen', name: 'Отступник', tier: 'high' }, 'burning-reliquary': { pack: 'fallen', name: 'Пылающая реликвия', tier: 'high' },
  'the-unborn': { pack: 'undead', name: 'Нерождённый', tier: 'high' }, 'lucifer-avatar': { pack: 'fallen', name: 'Аватар Люцифера', tier: 'boss' }
};

const templates = new Map(), fbx = new FBXLoader(), tex = new THREE.TextureLoader();
function loadTemplate(id, full) {
  const key = id + (full ? ':full' : ':lite');
  if (!templates.has(key)) templates.set(key, (async () => {
    const d = MONSTERS[id], base = `assets/monsters/${d.pack}/${id}/`, obj = await fbx.loadAsync(`${base}${id}.fbx`);
    const t = (n, srgb) => { const x = tex.load(`${base}textures/${id}_${n}.png`); if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 4; return x; };
    const mat = new THREE.MeshStandardMaterial({ map: t('basecolor', true), normalMap: t('normal') });
    if (full) { mat.roughnessMap = t('roughness'); mat.metalnessMap = t('metallic'); mat.roughness = 1; mat.metalness = 1; }
    obj.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = true; o.frustumCulled = false; } });
    const g = new THREE.Group(); g.add(obj); g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g), k = 1.85 / (b.max.y - b.min.y);   // единый рост 1.85 м, пропорции сохраняются
    obj.scale.multiplyScalar(k); g.updateMatrixWorld(true); const c = new THREE.Box3().setFromObject(g);
    obj.position.set(-(c.min.x + c.max.x) / 2, -c.min.y, -(c.min.z + c.max.z) / 2); return g;
  })());
  return templates.get(key);
}

class Monster {
  constructor(id, model, x, z, world) {
    const d = MONSTERS[id], T = TIERS[d.tier]; this.world = world; this.def = d; this.T = T; this.id = id;
    this.name = d.name; this.level = T.lvl; this.maxHp = this.hp = T.hp; this.alive = true; this.r = .8; this.x = x; this.z = z;
    this.root = new THREE.Group(); this.root.add(model.clone(true)); this.yaw = Math.random() * 6.28; this.t = Math.random() * 10;
    this.flash = 0; this.atk = 0; this.cd = 0; this.dead = 0; this.moving = false; this.done = false;
  }
  hit(n) {
    if (!this.alive) return; this.hp -= n; this.flash = .15;
    if (this.hp <= 0) { this.alive = false; this.world.flags['kill_' + this.id] = (this.world.flags['kill_' + this.id] || 0) + 1; this.world.flags.kills = (this.world.flags.kills || 0) + 1; }
  }
  update(dt, pl) {
    this.t += dt; const r = this.root, y = heightAt(this.x, this.z);
    if (!this.alive) { this.dead += dt; r.rotation.x = -Math.min(1.45, this.dead * 3); r.position.set(this.x, y, this.z); if (this.dead > 8) r.visible = false; return; }
    this.flash = Math.max(0, this.flash - dt); this.cd -= dt;
    const dx = pl.pos.x - this.x, dz = pl.pos.z - this.z, d = Math.hypot(dx, dz); this.moving = false; let lunge = 0;
    if (this.atk > 0) {
      this.atk -= dt; lunge = Math.sin(Math.min(1, (.55 - this.atk) / .55) * Math.PI) * .6;
      if (!this.done && this.atk < .25) { this.done = true; if (d < 2.3 && pl.invuln <= 0 && !pl.dead) { pl.damage(this.T.dmg); this.world.onPlayerHit?.(this.T.dmg); } }
      if (this.atk <= 0) this.cd = 1.4;
    } else if (d < this.T.aggro && !pl.dead) {
      this.yaw = Math.atan2(dx, dz);
      if (d > 1.7) { const nx = this.x + dx / d * this.T.speed * dt, nz = this.z + dz / d * this.T.speed * dt; if (heightAt(nx, nz) > -2) { this.x = nx; this.z = nz; this.moving = true; } }
      else if (this.cd <= 0) { this.atk = .55; this.done = false; }
    }
    r.rotation.set(this.moving ? .12 : 0, this.yaw, 0); r.scale.setScalar(1 + this.flash * .4);
    const f = Math.sin(this.t * (this.moving ? 9 : 2)); r.position.set(this.x + Math.sin(this.yaw) * lunge, y + (this.moving ? Math.abs(f) * .08 : f * .01), this.z + Math.cos(this.yaw) * lunge);
  }
}

export async function spawnMonsters(def, world, full) {
  const group = new THREE.Group(), list = [];
  for (const s of def.monsters) {
    try { const m = new Monster(s.id, await loadTemplate(s.id, full), s.x, s.z, world); group.add(m.root); list.push(m); }
    catch (e) { console.warn('Монстр не загружен', s.id, e); }
  }
  return { group, targets: list, update(dt) { if (world.player) list.forEach(m => m.update(dt, world.player)); } };
}
