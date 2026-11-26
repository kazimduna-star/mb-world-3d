import * as THREE from 'three';
import { heightAt } from '../scripts/world.js';
import { CONFIG } from '../config.js';

const el = (cls, parent, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; parent?.appendChild(e); return e; };
const MM = 132, SPAN = 100;

export class Hud {
  constructor(host, cb) {
    this.root = el('hud hidden', host); this.fpsT = 0; this.frames = 0; this.toastT = 0;
    const mm = el('minimap', this.root); this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = MM; mm.appendChild(this.cv); this.ctx = this.cv.getContext('2d'); el('mm-n', mm, 'N');
    this.zoneEl = el('zone-name', this.root);
    const tr = el('tracker', this.root); this.trTitle = el('tr-title', tr); this.trText = el('tr-text', tr); this.trDist = el('tr-dist', tr);
    const top = el('top-right', this.root); this.fps = el('pill-info', top, '60 FPS');
    const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const vb = el('round-btn', top, ico('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')); vb.onclick = cb.view;
    const qb = el('round-btn', top, ico('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 9h8M8 13h8"/>')); qb.onclick = cb.quests;
    const pb = el('round-btn', top); pb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 5v14M16 5v14"/></svg>'; pb.onclick = cb.pause;
    const hp = el('hp', this.root); this.lv = el('hp-lv', hp, 'Ур. 1'); const bar = el('hp-bar', hp); this.hpFill = el('hp-fill', bar); this.hpText = el('hp-text', bar);
    this.toastEl = el('toast', this.root); this.dmg = el('dmg-layer', this.root);
    this.map = document.createElement('canvas'); this.map.width = this.map.height = 128; const x = this.map.getContext('2d'), img = x.createImageData(128, 128);
    for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) {
      const h = heightAt((i / 128 - .5) * 400, (j / 128 - .5) * 400); let c = [90, 150, 80];
      if (h < CONFIG.waterY) c = [70, 120, 200]; else if (h < -.3) c = [205, 190, 140]; else if (h > 26) c = [235, 232, 248]; else if (h > 15) c = [125, 122, 140];
      img.data.set([...c, 255], (j * 128 + i) * 4);
    }
    x.putImageData(img, 0, 0);
  }
  show(on) { this.root.classList.toggle('hidden', !on); }
  toast(t, ms = 2600) { this.toastEl.textContent = t; this.toastEl.classList.add('show'); this.toastT = ms / 1000; }
  damage(x, y, z, n, camera) {
    const v = new THREE.Vector3(x, y, z).project(camera); if (v.z > 1) return;
    const d = el('dmg', this.dmg, String(n)); d.style.left = (v.x * .5 + .5) * innerWidth + 'px'; d.style.top = (-v.y * .5 + .5) * innerHeight + 'px'; d.addEventListener('animationend', () => d.remove());
  }
  update(dt, p) {
    this.frames++; this.fpsT += dt; if (this.fpsT >= .5) { this.fps.textContent = Math.round(this.frames / this.fpsT) + ' FPS'; this.frames = 0; this.fpsT = 0; }
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.toastEl.classList.remove('show');
    const pl = p.player; this.lv.textContent = 'Ур. ' + pl.level; this.hpFill.style.width = pl.hp / pl.maxHp * 100 + '%'; this.hpText.textContent = `${Math.ceil(pl.hp)} / ${pl.maxHp}`;
    this.zoneEl.textContent = p.zone || '';
    const q = p.quest.current(); this.trTitle.textContent = p.quest.title; this.trText.textContent = q.text;
    this.trDist.textContent = q.target ? Math.round(Math.hypot(q.target.x - pl.pos.x, q.target.z - pl.pos.z)) + ' м' : '';
    this._minimap(pl, p.yaw, q.target);
  }
  _minimap(pl, yaw, tg) {
    const c = this.ctx, h = MM / 2, sc = h / SPAN, s = Math.sin(yaw), co = Math.cos(yaw);
    c.clearRect(0, 0, MM, MM); c.save(); c.beginPath(); c.arc(h, h, h - 2, 0, 7); c.clip(); c.fillStyle = '#1b1e4a'; c.fillRect(0, 0, MM, MM);
    c.translate(h, h); c.rotate(yaw); c.translate(-pl.pos.x * sc, -pl.pos.z * sc); c.imageSmoothingEnabled = true; c.drawImage(this.map, -200 * sc, -200 * sc, 400 * sc, 400 * sc); c.restore();
    for (const zn of CONFIG.zones) {   // метки деревень и важных мест на мини-карте
      if (!zn.poi) continue; const rx = zn.x - pl.pos.x, rz = zn.z - pl.pos.z, mx = (rx * co - rz * s) * sc, my = (rx * s + rz * co) * sc; if (Math.hypot(mx, my) > h - 12) continue;
      c.fillStyle = zn.poi; c.strokeStyle = '#1b1e4a'; c.lineWidth = 1.5; c.beginPath(); c.arc(h + mx, h + my, 4.5, 0, 7); c.fill(); c.stroke();
    }
    if (tg) {
      const rx = tg.x - pl.pos.x, rz = tg.z - pl.pos.z; let mx = (rx * co - rz * s) * sc, my = (rx * s + rz * co) * sc; const l = Math.hypot(mx, my), lim = h - 10; if (l > lim) { mx *= lim / l; my *= lim / l; }
      c.save(); c.translate(h + mx, h + my); c.rotate(Math.PI / 4); c.fillStyle = '#ffd86b'; c.strokeStyle = '#2a1a66'; c.lineWidth = 2; c.fillRect(-5, -5, 10, 10); c.strokeRect(-5, -5, 10, 10); c.restore();
    }
    const fx = Math.sin(pl.facing), fz = Math.cos(pl.facing), ang = Math.atan2(fx * co - fz * s, -(fx * s + fz * co));
    c.save(); c.translate(h, h); c.rotate(ang); c.fillStyle = '#4fd8ff'; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 7); c.lineTo(0, 3); c.lineTo(-6, 7); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 3; c.beginPath(); c.arc(h, h, h - 2, 0, 7); c.stroke();
  }
}
