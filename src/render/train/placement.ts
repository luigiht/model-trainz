import { Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { Route, RoutePoint } from "@/game/simulation/route";

const front: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const back: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const fwd = new Vector3();
const side = new Vector3();
const up = new Vector3();
const basis = new Matrix4();
const WORLD_UP = new Vector3(0, 1, 0);
const q = new Quaternion();

/** Places a vehicle between two bogie points sampled on the route (articulates on curves). */
export function placeOnRoute(
  route: Route,
  object: Object3D,
  centerS: number,
  halfBase: number,
  sway = 0,
) {
  route.pointAt(centerS + halfBase, front);
  route.pointAt(centerS - halfBase, back);
  fwd.set(front.x - back.x, front.y - back.y, front.z - back.z).normalize();
  side.crossVectors(fwd, WORLD_UP).normalize();
  up.crossVectors(side, fwd).normalize();
  basis.makeBasis(fwd, up, side);
  q.setFromRotationMatrix(basis);
  object.position.set((front.x + back.x) / 2, (front.y + back.y) / 2, (front.z + back.z) / 2);
  object.quaternion.copy(q);
  object.rotateX(sway);
}
