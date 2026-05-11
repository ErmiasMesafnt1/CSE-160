/**
 * First-person camera: eye, at, up, view and projection matrices.
 * Movement and pan follow the CSE160 assignment specification.
 */
class Camera {
  constructor(canvas) {
    this.fov = 60;
    this.eye = new Vector3([16, 2.4, 28]);
    this.at = new Vector3([16, 2.4, 16]);
    this.up = new Vector3([0, 1, 0]);
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
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
    var f = new Vector3();
    f.set(this.at).sub(this.eye).normalize().mul(speed);
    this.eye.add(f);
    this.at.add(f);
    this.updateView();
  }

  moveBackwards(speed) {
    var b = new Vector3();
    b.set(this.eye).sub(this.at).normalize().mul(speed);
    this.eye.add(b);
    this.at.add(b);
    this.updateView();
  }

  moveLeft(speed) {
    var f = new Vector3();
    f.set(this.at).sub(this.eye).normalize();
    var s = Vector3.cross(this.up, f);
    s.normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
    this.updateView();
  }

  moveRight(speed) {
    var f = new Vector3();
    f.set(this.at).sub(this.eye).normalize();
    var s = Vector3.cross(f, this.up);
    s.normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
    this.updateView();
  }

  panLeft(alpha) {
    var f = new Vector3();
    f.set(this.at).sub(this.eye);
    var rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(
      alpha,
      this.up.elements[0],
      this.up.elements[1],
      this.up.elements[2]
    );
    var fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye).add(fPrime);
    this.updateView();
  }

  panRight(alpha) {
    var f = new Vector3();
    f.set(this.at).sub(this.eye);
    var rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(
      -alpha,
      this.up.elements[0],
      this.up.elements[1],
      this.up.elements[2]
    );
    var fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye).add(fPrime);
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
    var f = new Vector3();
    f.set(this.at).sub(this.eye);
    var right = Vector3.cross(f, this.up);
    if (right.magnitude() < 1e-6) {
      return;
    }
    right.normalize();
    var rot = new Matrix4();
    rot.setRotate(degrees, right.elements[0], right.elements[1], right.elements[2]);
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
