/**
 * Camera poses for the Chase and Cinematic views (imperative, allocation-free per frame).
 *  - Chase: a third-person "free look" orbit around the locomotive. The rig lags a little behind
 *    the train's position and heading, the player can orbit (yaw/pitch) and zoom, and after a few
 *    idle seconds it eases back behind the train. It never dips below the ground or a tunnel's hill.
 *  - Cinematic: an automatic director that cuts between film-style shots every few seconds:
 *    lineside (fixed camera that pans as the train passes), a slow helicopter orbit, a parallel
 *    tracking dolly, a low head-on shot, and a high establishing shot. Shots that would sit in a
 *    tunnel are skipped.
 */
import { Vector3 } from "three";
import type { GameState } from "@/game/simulation/GameState";
import type { Route, RoutePoint } from "@/game/simulation/route";
import { stationS } from "@/game/simulation/rules";
import { damp } from "@/lib/math";
import type { TerrainField } from "@/render/world/terrain";
import { LOCO_LENGTH } from "@/render/train/trainModels";
import { trainFx } from "./trainFx";

export interface CameraPose {
  pos: Vector3;
  look: Vector3;
  fov: number;
}

/** Seconds without input before the chase camera swings back behind the train. */
const RECENTER_DELAY = 3;
const CHASE_FOV = 50;
/** Height of the look target above the rail bed (roughly the loco's boiler). */
const LOOK_HEIGHT = 1.4;

const p: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const v = new Vector3();

/** Ground (or the hill over a tunnel) under (x, z). */
function groundAt(field: TerrainField, x: number, z: number): number {
  const t = field.tunnels.near(x);
  return t && x >= t.x0 - 1 && x <= t.x1 + 1 ? field.coverHeight(x, z) : field.heightAt(x, z);
}

function keepAboveGround(field: TerrainField, pos: Vector3, clearance: number) {
  pos.y = Math.max(pos.y, groundAt(field, pos.x, pos.z) + clearance);
}

function inTunnelHill(field: TerrainField, x: number): boolean {
  return field.tunnels.near(x) !== null;
}

/** Middle of the locomotive, at boiler height. */
function locoCenter(route: Route, trainS: number, out: Vector3): Vector3 {
  route.pointAt(trainS - LOCO_LENGTH / 2, p);
  return out.set(p.x, p.y + LOOK_HEIGHT, p.z);
}

export class ChaseRig {
  private readonly target = new Vector3();
  private readonly heading = new Vector3(1, 0, 0);
  private initialised = false;

  update(
    dt: number,
    route: Route,
    field: TerrainField,
    trainS: number,
    reducedMotion: boolean,
    out: CameraPose,
  ) {
    const c = trainFx.chase;
    locoCenter(route, trainS, v);
    const hx = p.dx;
    const hz = p.dz;
    if (!this.initialised) {
      this.target.copy(v);
      this.heading.set(hx, 0, hz).normalize();
      this.initialised = true;
    }
    // Lazy follow: position catches up quickly, heading more slowly (the rig swings on curves).
    this.target.lerp(v, damp(8, dt));
    this.heading.lerp(v.set(hx, 0, hz), damp(2.5, dt)).normalize();

    c.idle += dt;
    if (!reducedMotion && c.idle > RECENTER_DELAY) c.yaw *= 1 - damp(1.2, dt);

    // Behind the train, swung by yaw around the vertical, raised by pitch.
    const bx = -this.heading.x;
    const bz = -this.heading.z;
    const cos = Math.cos(c.yaw);
    const sin = Math.sin(c.yaw);
    const flat = Math.cos(c.pitch) * c.distance;
    out.pos.set(
      this.target.x + (bx * cos + bz * sin) * flat,
      this.target.y + Math.sin(c.pitch) * c.distance,
      this.target.z + (-bx * sin + bz * cos) * flat,
    );
    keepAboveGround(field, out.pos, 1.5);
    out.look.copy(this.target);
    out.fov = CHASE_FOV;
  }

  reset() {
    this.initialised = false;
  }
}

/** Platforms and station buildings stand on the train's right; side shots there need open line. */
const STATION_CLEARANCE = 45;

type DirectorState = Pick<GameState, "trainS" | "trainV" | "station">;
type Shot = "lineside" | "orbit" | "dolly" | "headOn" | "establishing";
const SHOTS: Shot[] = ["lineside", "orbit", "dolly", "headOn", "establishing"];

export class CinematicDirector {
  private index = -1;
  private time = 0;
  private side = 1;
  private readonly anchor = new Vector3();
  private anchorS = 0;
  private orbitStart = 0;
  /** True on the frame a new shot starts: the rig cuts instead of blending. */
  cut = false;

  update(
    dt: number,
    route: Route,
    field: TerrainField,
    state: DirectorState,
    reducedMotion: boolean,
    out: CameraPose,
  ) {
    const length = reducedMotion ? 11 : 7;
    this.time += dt;
    this.cut = false;
    const passed = this.shot === "lineside" && state.trainS - this.anchorS > 28;
    if (this.index < 0 || this.time > length || passed) this.next(route, field, state);
    this.pose(route, field, state.trainS, reducedMotion, out);
    keepAboveGround(field, out.pos, 1);
  }

  private get shot(): Shot {
    return SHOTS[Math.max(0, this.index) % SHOTS.length];
  }

  private next(route: Route, field: TerrainField, state: DirectorState) {
    this.time = 0;
    this.cut = true;
    // Left of the line (+1) is always open; the right only away from the platforms.
    const nearStation = [state.station, state.station + 1].some(
      (k) => Math.abs(stationS(k) - state.trainS) < STATION_CLEARANCE,
    );
    this.side = nearStation ? 1 : -this.side;
    this.orbitStart += 2.1;
    route.pointAt(state.trainS, p);
    const trainInHill = inTunnelHill(field, p.x);
    for (let tries = 0; tries < SHOTS.length; tries++) {
      this.index++;
      const shot = this.shot;
      if (trainInHill && (shot === "headOn" || shot === "dolly")) continue;
      if (shot === "lineside") {
        // Set up ahead of the train, where it will be in a few seconds.
        this.anchorS = state.trainS + Math.min(60, Math.max(14, state.trainV * 4));
        route.pointAt(this.anchorS, p);
        if (inTunnelHill(field, p.x)) continue;
        this.anchor.set(p.x - p.dz * 11 * this.side, 0, p.z + p.dx * 11 * this.side);
        this.anchor.y = Math.max(p.y, groundAt(field, this.anchor.x, this.anchor.z)) + 2.5;
      }
      return;
    }
    this.index = SHOTS.indexOf("orbit");
  }

  private pose(
    route: Route,
    field: TerrainField,
    trainS: number,
    reducedMotion: boolean,
    out: CameraPose,
  ) {
    const t = reducedMotion ? 0 : this.time;
    const s = this.side;
    locoCenter(route, trainS, out.look);
    // p now holds the loco's centre point and heading; (-dz, dx) is its left side.
    const lx = -p.dz * s;
    const lz = p.dx * s;
    switch (this.shot) {
      case "lineside":
        out.pos.copy(this.anchor);
        out.fov = 38;
        break;
      case "orbit": {
        const a = this.orbitStart + t * 0.14;
        out.pos.set(out.look.x + Math.cos(a) * 24, out.look.y + 11, out.look.z + Math.sin(a) * 24);
        out.fov = 40;
        break;
      }
      case "dolly":
        out.pos.set(out.look.x + lx * 13, out.look.y + 2.5, out.look.z + lz * 13);
        out.look.set(out.look.x + p.dx * 2, out.look.y, out.look.z + p.dz * 2);
        out.fov = 34;
        break;
      case "headOn":
        route.pointAt(trainS + 9 + t * 0.4, p);
        out.pos.set(p.x - p.dz * 2.6 * s, p.y + 0.9, p.z + p.dx * 2.6 * s);
        route.pointAt(trainS, p);
        out.look.set(p.x, p.y + LOOK_HEIGHT, p.z);
        out.fov = 46;
        break;
      case "establishing":
        out.pos.set(
          out.look.x + lx * (42 - t * 1.2) + p.dx * 26,
          out.look.y + 34,
          out.look.z + lz * (42 - t * 1.2) + p.dz * 26,
        );
        out.look.set(out.look.x + p.dx * 12, out.look.y, out.look.z + p.dz * 12);
        out.fov = 40;
        break;
    }
  }
}
