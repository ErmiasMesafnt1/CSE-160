var VSHADER_SOURCE =
  'precision mediump float;\n' +
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_GlobalRotateMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjectionMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

var canvas;
var gl;
var a_Position;
var u_FragColor;
var u_ModelMatrix;
var u_GlobalRotateMatrix;
var u_ViewMatrix;
var u_ProjectionMatrix;

var g_cubeBuffer = null;
var g_cubeVertexCount = 0;
var g_pyramidBuffer = null;
var g_pyramidVertexCount = 0;

var g_globalAngle = 0;
var g_mouseXAngle = 12;
var g_mouseYAngle = 18;
var g_isDragging = false;
var g_lastMouseX = 0;
var g_lastMouseY = 0;

var g_startTime = performance.now() / 1000.0;
var g_seconds = 0;
var g_animationOn = true;
var g_isPoking = false;
var g_pokeStart = 0;
var g_pokeDuration = 0.9;

var g_jointAngles = {
  neck: 5,
  head: -6,
  tail: 15,
  frontLeftUpper: 10,
  frontLeftLower: -20,
  frontLeftHoof: 6,
  frontRightUpper: -10,
  frontRightLower: -20,
  frontRightHoof: 6,
  backLeftUpper: -8,
  backLeftLower: -16,
  backLeftHoof: 3,
  backRightUpper: 8,
  backRightLower: -16,
  backRightHoof: 3
};

var g_jointAnimationOffsets = {
  neck: 0,
  head: 0,
  tail: 0,
  frontLeftUpper: 0,
  frontLeftLower: 0,
  frontLeftHoof: 0,
  frontRightUpper: 0,
  frontRightLower: 0,
  frontRightHoof: 0,
  backLeftUpper: 0,
  backLeftLower: 0,
  backLeftHoof: 0,
  backRightUpper: 0,
  backRightLower: 0,
  backRightHoof: 0
};

var g_sliderDefs = [
  { key: 'global', label: 'Global Rotation', min: -180, max: 180, value: 0 },
  { key: 'neck', label: 'Neck', min: -35, max: 35, value: g_jointAngles.neck },
  { key: 'head', label: 'Head', min: -45, max: 45, value: g_jointAngles.head },
  { key: 'tail', label: 'Tail', min: -45, max: 45, value: g_jointAngles.tail },
  { key: 'frontLeftUpper', label: 'Front Left Upper', min: -75, max: 75, value: g_jointAngles.frontLeftUpper },
  { key: 'frontLeftLower', label: 'Front Left Lower', min: -85, max: 15, value: g_jointAngles.frontLeftLower },
  { key: 'frontLeftHoof', label: 'Front Left Hoof', min: -40, max: 40, value: g_jointAngles.frontLeftHoof },
  { key: 'frontRightUpper', label: 'Front Right Upper', min: -75, max: 75, value: g_jointAngles.frontRightUpper },
  { key: 'frontRightLower', label: 'Front Right Lower', min: -85, max: 15, value: g_jointAngles.frontRightLower },
  { key: 'frontRightHoof', label: 'Front Right Hoof', min: -40, max: 40, value: g_jointAngles.frontRightHoof },
  { key: 'backLeftUpper', label: 'Back Left Upper', min: -75, max: 75, value: g_jointAngles.backLeftUpper },
  { key: 'backLeftLower', label: 'Back Left Lower', min: -85, max: 20, value: g_jointAngles.backLeftLower },
  { key: 'backLeftHoof', label: 'Back Left Hoof', min: -40, max: 40, value: g_jointAngles.backLeftHoof },
  { key: 'backRightUpper', label: 'Back Right Upper', min: -75, max: 75, value: g_jointAngles.backRightUpper },
  { key: 'backRightLower', label: 'Back Right Lower', min: -85, max: 20, value: g_jointAngles.backRightLower },
  { key: 'backRightHoof', label: 'Back Right Hoof', min: -40, max: 40, value: g_jointAngles.backRightHoof }
];

var g_perf = {
  lastStampMs: performance.now(),
  frameCounter: 0,
  fps: 0,
  renderMs: 0
};

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false;
  }
  gl.enable(gl.DEPTH_TEST);
  return true;
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return false;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');

  if (a_Position < 0 || !u_FragColor || !u_ModelMatrix || !u_GlobalRotateMatrix || !u_ViewMatrix || !u_ProjectionMatrix) {
    console.log('Failed to get GLSL variable locations.');
    return false;
  }
  return true;
}

function initPyramidBuffer() {
  var vertices = new Float32Array([
    -0.5, 0.0, -0.5,   0.5, 0.0, -0.5,   0.0, 0.9, 0.0,
     0.5, 0.0, -0.5,   0.5, 0.0,  0.5,   0.0, 0.9, 0.0,
     0.5, 0.0,  0.5,  -0.5, 0.0,  0.5,   0.0, 0.9, 0.0,
    -0.5, 0.0,  0.5,  -0.5, 0.0, -0.5,   0.0, 0.9, 0.0,
    -0.5, 0.0, -0.5,   0.5, 0.0,  0.5,   0.5, 0.0, -0.5,
    -0.5, 0.0, -0.5,  -0.5, 0.0,  0.5,   0.5, 0.0,  0.5
  ]);

  g_pyramidBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_pyramidBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  g_pyramidVertexCount = 18;
}

function setCommonMatrices() {
  var projection = new Matrix4();
  projection.setPerspective(55, canvas.width / canvas.height, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projection.elements);

  var view = new Matrix4();
  view.setLookAt(0, 2.2, 6.5, 0, 0.8, 0, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, view.elements);

  var global = new Matrix4();
  global.rotate(g_mouseYAngle, 1, 0, 0);
  global.rotate(g_globalAngle + g_mouseXAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, global.elements);
}

function drawPyramid(modelMatrix, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_pyramidBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, g_pyramidVertexCount);
}

function matrixCopy(m) {
  return new Matrix4(m);
}

function effectiveAngle(key) {
  return g_jointAngles[key] + g_jointAnimationOffsets[key];
}

function drawLeg(baseMatrix, sideOffset, frontOffset, upperKey, lowerKey, hoofKey) {
  var upper = matrixCopy(baseMatrix);
  upper.translate(sideOffset, -0.35, frontOffset);
  // Swing leg in the horse's forward/back plane.
  upper.rotate(effectiveAngle(upperKey), 0, 0, 1);
  var upperJoint = matrixCopy(upper);
  var upperShape = matrixCopy(upper);
  upperShape.translate(0, -0.32, 0);
  // Flip leg mesh to the opposite side.
  upperShape.rotate(-90, 0, 1, 0);
  upperShape.scale(0.23, 0.64, 0.23);
  drawCube(upperShape, [0.56, 0.34, 0.20, 1.0]);

  var lower = matrixCopy(upperJoint);
  lower.translate(0, -0.64, 0);
  lower.rotate(effectiveAngle(lowerKey), 0, 0, 1);
  var lowerJoint = matrixCopy(lower);
  var lowerShape = matrixCopy(lower);
  lowerShape.translate(0, -0.28, 0);
  lowerShape.rotate(-90, 0, 1, 0);
  lowerShape.scale(0.18, 0.56, 0.18);
  drawCube(lowerShape, [0.50, 0.30, 0.18, 1.0]);

  var hoof = matrixCopy(lowerJoint);
  hoof.translate(0, -0.56, 0.02);
  hoof.rotate(effectiveAngle(hoofKey), 0, 0, 1);
  var hoofShape = matrixCopy(hoof);
  hoofShape.translate(0, -0.08, 0.06);
  hoofShape.rotate(-90, 0, 1, 0);
  hoofShape.scale(0.2, 0.16, 0.3);
  drawCube(hoofShape, [0.16, 0.12, 0.10, 1.0]);
}

function renderHorse() {
  var bodyColor = [0.62, 0.39, 0.23, 1.0];
  var darkBody = [0.50, 0.30, 0.18, 1.0];
  var maneColor = [0.22, 0.16, 0.12, 1.0];
  var eyeColor = [0.05, 0.05, 0.05, 1.0];

  var body = new Matrix4();
  body.translate(0, 0.6, 0);
  body.scale(2.2, 1.0, 0.9);
  drawCube(body, bodyColor);

  var torsoFrame = new Matrix4();
  torsoFrame.translate(0, 0.6, 0);

  var neckJoint = matrixCopy(torsoFrame);
  neckJoint.translate(0.95, 0.35, 0);
  neckJoint.rotate(effectiveAngle('neck'), 0, 0, 1);
  var neckShape = matrixCopy(neckJoint);
  neckShape.translate(0.34, 0.36, 0);
  neckShape.rotate(-22, 0, 0, 1);
  neckShape.scale(0.45, 0.8, 0.4);
  drawCube(neckShape, darkBody);

  var headJoint = matrixCopy(neckJoint);
  headJoint.translate(0.55, 0.62, 0);
  headJoint.rotate(effectiveAngle('head'), 0, 0, 1);
  var headShape = matrixCopy(headJoint);
  headShape.translate(0.32, 0.05, 0);
  headShape.scale(0.62, 0.42, 0.35);
  drawCube(headShape, bodyColor);

  var snout = matrixCopy(headJoint);
  snout.translate(0.63, -0.02, 0);
  snout.scale(0.32, 0.28, 0.28);
  drawCube(snout, [0.60, 0.37, 0.21, 1.0]);

  var leftEar = matrixCopy(headJoint);
  leftEar.translate(0.20, 0.30, 0.12);
  leftEar.scale(0.12, 0.24, 0.11);
  drawPyramid(leftEar, maneColor);

  var rightEar = matrixCopy(headJoint);
  rightEar.translate(0.20, 0.30, -0.12);
  rightEar.scale(0.12, 0.24, 0.11);
  drawPyramid(rightEar, maneColor);

  var eyeLeft = matrixCopy(headJoint);
  eyeLeft.translate(0.42, 0.10, 0.17);
  eyeLeft.scale(0.05, 0.05, 0.05);
  drawCube(eyeLeft, eyeColor);

  var eyeRight = matrixCopy(headJoint);
  eyeRight.translate(0.42, 0.10, -0.17);
  eyeRight.scale(0.05, 0.05, 0.05);
  drawCube(eyeRight, eyeColor);

  var tailJoint = matrixCopy(torsoFrame);
  tailJoint.translate(-1.06, 0.24, 0);
  tailJoint.rotate(-45 + effectiveAngle('tail'), 0, 0, 1);
  var tail = matrixCopy(tailJoint);
  tail.translate(-0.35, -0.26, 0);
  tail.scale(0.16, 0.85, 0.16);
  drawCube(tail, maneColor);

  drawLeg(torsoFrame, 0.62, 0.32, 'frontLeftUpper', 'frontLeftLower', 'frontLeftHoof');
  drawLeg(torsoFrame, 0.62, -0.32, 'frontRightUpper', 'frontRightLower', 'frontRightHoof');
  drawLeg(torsoFrame, -0.62, 0.32, 'backLeftUpper', 'backLeftLower', 'backLeftHoof');
  drawLeg(torsoFrame, -0.62, -0.32, 'backRightUpper', 'backRightLower', 'backRightHoof');
}

function renderGround() {
  var ground = new Matrix4();
  // Place the ground so hooves sit on top instead of clipping through.
  ground.translate(0, -1.15, 0);
  ground.scale(12, 0.1, 12);
  drawCube(ground, [0.28, 0.48, 0.28, 1.0]);
}

function renderScene() {
  var beginMs = performance.now();
  setCommonMatrices();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  renderGround();
  renderHorse();
  g_perf.renderMs = performance.now() - beginMs;
}

function updateAnimationAngles() {
  for (var key in g_jointAnimationOffsets) {
    if (Object.prototype.hasOwnProperty.call(g_jointAnimationOffsets, key)) {
      g_jointAnimationOffsets[key] = 0;
    }
  }

  if (!g_animationOn && !g_isPoking) {
    return;
  }

  var t = g_seconds;
  var stepA = Math.sin(t * 6.0) * 24;
  var stepB = Math.sin(t * 6.0 + Math.PI) * 24;

  if (g_animationOn) {
    g_jointAnimationOffsets.frontLeftUpper += stepA;
    g_jointAnimationOffsets.frontRightUpper += stepB;
    g_jointAnimationOffsets.backLeftUpper += stepB;
    g_jointAnimationOffsets.backRightUpper += stepA;

    g_jointAnimationOffsets.frontLeftLower += Math.max(0, -stepA) * 0.75;
    g_jointAnimationOffsets.frontRightLower += Math.max(0, -stepB) * 0.75;
    g_jointAnimationOffsets.backLeftLower += Math.max(0, -stepB) * 0.75;
    g_jointAnimationOffsets.backRightLower += Math.max(0, -stepA) * 0.75;

    g_jointAnimationOffsets.frontLeftHoof += Math.sin(t * 6.0 + 0.6) * 10;
    g_jointAnimationOffsets.frontRightHoof += Math.sin(t * 6.0 + Math.PI + 0.6) * 10;
    g_jointAnimationOffsets.backLeftHoof += Math.sin(t * 6.0 + Math.PI + 0.6) * 10;
    g_jointAnimationOffsets.backRightHoof += Math.sin(t * 6.0 + 0.6) * 10;

    g_jointAnimationOffsets.neck += Math.sin(t * 3.0) * 5;
    g_jointAnimationOffsets.head += Math.sin(t * 3.0 + 0.8) * 4;
    g_jointAnimationOffsets.tail += Math.sin(t * 8.0) * 18;
  }

  if (g_isPoking) {
    var pokeElapsed = t - g_pokeStart;
    if (pokeElapsed > g_pokeDuration) {
      g_isPoking = false;
      return;
    }
    var pokePhase = pokeElapsed / g_pokeDuration;
    var impulse = Math.sin(pokePhase * Math.PI);
    g_jointAnimationOffsets.neck += 24 * impulse;
    g_jointAnimationOffsets.head += 36 * impulse;
    g_jointAnimationOffsets.frontLeftUpper += -30 * impulse;
    g_jointAnimationOffsets.frontRightUpper += -30 * impulse;
    g_jointAnimationOffsets.frontLeftLower += 18 * impulse;
    g_jointAnimationOffsets.frontRightLower += 18 * impulse;
  }
}

function updatePerfUI() {
  g_perf.frameCounter += 1;
  var nowMs = performance.now();
  var elapsed = nowMs - g_perf.lastStampMs;
  if (elapsed >= 300) {
    g_perf.fps = (g_perf.frameCounter * 1000.0) / elapsed;
    g_perf.frameCounter = 0;
    g_perf.lastStampMs = nowMs;
  }
  var stats = document.getElementById('stats');
  stats.textContent = 'fps: ' + g_perf.fps.toFixed(1) + ' | ms: ' + g_perf.renderMs.toFixed(2);
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  updateAnimationAngles();
  renderScene();
  updatePerfUI();
  requestAnimationFrame(tick);
}

function addSlider(parent, def) {
  var row = document.createElement('div');
  row.className = 'control-row';

  var label = document.createElement('label');
  label.htmlFor = 'slider_' + def.key;
  label.textContent = def.label;

  var slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'slider_' + def.key;
  slider.min = String(def.min);
  slider.max = String(def.max);
  slider.value = String(def.value);

  var valueSpan = document.createElement('span');
  valueSpan.id = 'value_' + def.key;
  valueSpan.textContent = String(def.value);

  slider.addEventListener('input', function () {
    var v = Number(slider.value);
    valueSpan.textContent = String(v);
    if (def.key === 'global') {
      g_globalAngle = v;
    } else {
      g_jointAngles[def.key] = v;
    }
    renderScene();
  });

  row.appendChild(label);
  row.appendChild(slider);
  row.appendChild(valueSpan);
  parent.appendChild(row);
}

function resetPose() {
  g_globalAngle = 0;
  for (var i = 0; i < g_sliderDefs.length; i++) {
    var def = g_sliderDefs[i];
    var slider = document.getElementById('slider_' + def.key);
    var valueSpan = document.getElementById('value_' + def.key);
    if (!slider || !valueSpan) {
      continue;
    }
    slider.value = String(def.value);
    valueSpan.textContent = String(def.value);
    if (def.key === 'global') {
      g_globalAngle = def.value;
    } else {
      g_jointAngles[def.key] = def.value;
    }
  }
  g_mouseXAngle = 0;
  g_mouseYAngle = 18;
  renderScene();
}

function wireUI() {
  var controls = document.getElementById('controls');
  for (var i = 0; i < g_sliderDefs.length; i++) {
    addSlider(controls, g_sliderDefs[i]);
  }

  document.getElementById('animOnBtn').onclick = function () {
    g_animationOn = true;
  };
  document.getElementById('animOffBtn').onclick = function () {
    g_animationOn = false;
  };
  document.getElementById('resetPoseBtn').onclick = resetPose;
}

function wireMouseControls() {
  canvas.addEventListener('mousedown', function (ev) {
    if (ev.shiftKey) {
      g_isPoking = true;
      g_pokeStart = g_seconds;
    }
    g_isDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });

  canvas.addEventListener('mouseup', function () {
    g_isDragging = false;
  });
  canvas.addEventListener('mouseleave', function () {
    g_isDragging = false;
  });

  canvas.addEventListener('mousemove', function (ev) {
    if (!g_isDragging) {
      return;
    }
    var dx = ev.clientX - g_lastMouseX;
    var dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;

    g_mouseXAngle += dx * 0.4;
    g_mouseYAngle += dy * 0.35;
    if (g_mouseYAngle > 85) {
      g_mouseYAngle = 85;
    }
    if (g_mouseYAngle < -85) {
      g_mouseYAngle = -85;
    }
    renderScene();
  });
}

function main() {
  if (!setupWebGL()) {
    return;
  }
  if (!connectVariablesToGLSL()) {
    return;
  }

  initCubeBuffer();
  initPyramidBuffer();
  wireUI();
  wireMouseControls();

  gl.clearColor(0.62, 0.82, 0.95, 1.0);
  renderScene();
  requestAnimationFrame(tick);
}
