import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { heightAt, areaFor, clampToArea } from './world.js';

const C = CONFIG.camera, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class CameraRig {
  constructor(camera, world) { this.camera = camera; this.world = world; this.yaw = 0; this.pitch = .38; this.dist = C.dist; this.cur = C.dist; this.target = new THREE.Vector3(); this.first = true; }
  update(dt, player, input, sens, mode) {
    const d = input.consumeCam(), z = input.consumeZoom();
    this.yaw += d.x * .0055 * sens; this.pitch = mode === 'first' ? clamp(this.pitch - d.y * .0045 * sens, -1.2, 1.2) : clamp(this.pitch - d.y * .0045 * sens, C.pitchMin, C.pitchMax); this.dist = clamp(this.dist - z * .02, C.min, C.max);
    this._follow(dt, player, mode);
  }
  // Режим меню: медленное вращение вокруг героини без ввода
  idle(dt, player) { this.yaw += dt * .12; this._follow(dt, player); }
  _follow(dt, player, mode) {
    const goal = new THREE.Vector3(player.pos.x, player.pos.y + 1.25, player.pos.z);
    if (mode === 'first') {   // вид от первого лица: камера на уровне головы, направление то же, что и у вида от третьего лица
      const cp = Math.cos(this.pitch), dir = new THREE.Vector3(-Math.sin(this.yaw) * cp, -Math.sin(this.pitch), -Math.cos(this.yaw) * cp), eye = new THREE.Vector3(player.pos.x, player.pos.y + 1.6, player.pos.z).addScaledVector(dir, .12);
      this.target.copy(goal); this.camera.position.copy(eye); this.camera.lookAt(eye.clone().add(dir)); return;
    }
    if (this.first) { this.target.copy(goal); this.first = false; } else this.target.lerp(goal, 1 - Math.exp(-dt * 12));
    const cp = Math.cos(this.pitch), dir = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    let allowed = this.dist; const p = new THREE.Vector3();
    for (let t = .6; t <= this.dist; t += .4) {   // проверка стен, деревьев и рельефа вдоль луча камеры
      p.copy(this.target).addScaledVector(dir, t); let hit = p.y < heightAt(p.x, p.z) + .35;
      if (!hit) for (const c of this.world.colliders) { if (c.active === false) continue; if ((p.x - c.x) ** 2 + (p.z - c.z) ** 2 < (c.r + .35) ** 2 && p.y < heightAt(c.x, c.z) + c.h) { hit = true; break; } }
      if (hit) { allowed = Math.max(1.2, t - .4); break; }
    }
    this.cur = allowed < this.cur ? allowed : this.cur + (allowed - this.cur) * (1 - Math.exp(-dt * 4));
    this.camera.position.copy(this.target).addScaledVector(dir, this.cur);
    const ar = areaFor(player.pos.x, player.pos.z); if (ar) { const [cx, cz] = clampToArea(ar, this.camera.position.x, this.camera.position.z, .6); this.camera.position.x = cx; this.camera.position.z = cz; }
    this.camera.position.y = Math.max(this.camera.position.y, heightAt(this.camera.position.x, this.camera.position.z) + .4);
    this.camera.lookAt(this.target);
  }
}
