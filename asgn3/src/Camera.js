/**
 * First-person camera: eye, at, up, view and projection matrices.
 * Movement and pan follow the CSE160 assignment specification.
 * Scratch vectors/matrices are reused to avoid per-frame allocations (performance rubric).
 */
class Camera {
  constructor(canvas) {
    this.fov = 60;
    this.eye = new Vector3([16, 2.4, 28]);
    this.at = new Vector3([16, 2.4, 16]);
    this.up = new Vector3([0, 1, 0]);
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this._f = new Vector3();
    this._s = new Vector3();
    this._rot = new Matrix4();
    this.updateView();
    this.updateProjection(canvas);
  }

  updateView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0],
      this.eye.elements[1],
      this.eye.elements[2],
      this.at.elements[0],
      this.at.elements[1],
      this.at.elements[2],
      this.up.elements[0],
      this.up.elements[1],
      this.up.elements[2]
    );
  }

  updateProjection(canvas) {
    var aspect = canvas.width / canvas.height;
    this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 1000);
  }

  moveForward(speed) {
    var f = this._f;
    f.set(this.at).sub(this.eye).normalize().mul(speed);
    this.eye.add(f);
    this.at.add(f);
    this.updateView();
  }

  moveBackwards(speed) {
    var b = this._f;
    b.set(this.eye).sub(this.at).normalize().mul(speed);
    this.eye.add(b);
    this.at.add(b);
    this.updateView();
  }

  moveLeft(speed) {
    var f = this._f;
    var s = this._s;
    f.set(this.at).sub(this.eye).normalize();
    crossVec3InPlace(s, this.up, f);
    s.normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
    this.updateView();
  }

  moveRight(speed) {
    var f = this._f;
    var s = this._s;
    f.set(this.at).sub(this.eye).normalize();
    crossVec3InPlace(s, f, this.up);
    s.normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
    this.updateView();
  }

  panLeft(alpha) {
    this._yawAroundWorldUp(alpha);
  }

  panRight(alpha) {
    this._yawAroundWorldUp(-alpha);
  }

  /**
   * Fast yaw with world up = (0,1,0): avoids Matrix4 + multiplyVector3 allocations.
   */
  _yawAroundWorldUp(alphaDeg) {
    var ex = this.at.elements[0] - this.eye.elements[0];
    var ey = this.at.elements[1] - this.eye.elements[1];
    var ez = this.at.elements[2] - this.eye.elements[2];
    var rad = (alphaDeg * Math.PI) / 180;
    var c = Math.cos(rad);
    var s = Math.sin(rad);
    var nx = c * ex + s * ez;
    var ny = ey;
    var nz = -s * ex + c * ez;
    this.at.elements[0] = this.eye.elements[0] + nx;
    this.at.elements[1] = this.eye.elements[1] + ny;
    this.at.elements[2] = this.eye.elements[2] + nz;
    this.updateView();
  }

  /**
   * Mouse look: yaw around world up (same sense as E / panRight with positive key step).
   */
  applyYaw(degrees) {
    this.panRight(degrees);
  }

  /**
   * Pitch: rotate forward direction around camera right axis.
   */
  applyPitch(degrees) {
    var f = this._f;
    var r = this._s;
    f.set(this.at).sub(this.eye);
    crossVec3InPlace(r, f, this.up);
    if (r.magnitude() < 1e-6) {
      return;
    }
    r.normalize();
    var rot = this._rot;
    rot.setRotate(degrees, r.elements[0], r.elements[1], r.elements[2]);
    var fPrime = rot.multiplyVector3(f);
    var fe = fPrime.elements;
    var ny = fe[1] / Math.max(1e-6, Math.sqrt(fe[0] * fe[0] + fe[1] * fe[1] + fe[2] * fe[2]));
    if (ny > 0.92 || ny < -0.92) {
      return;
    }
    this.at.set(this.eye).add(fPrime);
    this.updateView();
  }
}

function crossVec3InPlace(out, a, b) {
  var ax = a.elements[0];
  var ay = a.elements[1];
  var az = a.elements[2];
  var bx = b.elements[0];
  var by = b.elements[1];
  var bz = b.elements[2];
  out.elements[0] = ay * bz - az * by;
  out.elements[1] = az * bx - ax * bz;
  out.elements[2] = ax * by - ay * bx;
  return out;
}
