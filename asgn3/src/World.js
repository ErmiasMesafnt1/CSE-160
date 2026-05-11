var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_UV;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjectionMatrix;\n' +
  'uniform vec3 u_CameraWorldPos;\n' +
  'uniform float u_FogEnable;\n' +
  'varying vec2 v_UV;\n' +
  'varying float v_FogDist;\n' +
  'void main() {\n' +
  '  vec4 worldPos = u_ModelMatrix * a_Position;\n' +
  '  v_UV = a_UV;\n' +
  '  if (u_FogEnable > 0.5) {\n' +
  '    vec3 d = worldPos.xyz - u_CameraWorldPos;\n' +
  '    v_FogDist = length(d);\n' +
  '  } else {\n' +
  '    v_FogDist = 0.0;\n' +
  '  }\n' +
  '  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'varying vec2 v_UV;\n' +
  'varying float v_FogDist;\n' +
  'uniform vec4 u_BaseColor;\n' +
  'uniform float u_texColorWeight;\n' +
  'uniform float u_FogEnable;\n' +
  'uniform float u_FogDistance;\n' +
  'uniform vec3 u_FogColor;\n' +
  'uniform sampler2D u_Sampler0;\n' +
  'uniform sampler2D u_Sampler1;\n' +
  'uniform sampler2D u_Sampler2;\n' +
  'uniform sampler2D u_Sampler3;\n' +
  'uniform int u_TexIndex;\n' +
  'void main() {\n' +
  '  vec4 texColor;\n' +
  '  if (u_TexIndex == 0) {\n' +
  '    texColor = texture2D(u_Sampler0, v_UV);\n' +
  '  } else if (u_TexIndex == 1) {\n' +
  '    texColor = texture2D(u_Sampler1, v_UV);\n' +
  '  } else if (u_TexIndex == 2) {\n' +
  '    texColor = texture2D(u_Sampler2, v_UV);\n' +
  '  } else {\n' +
  '    texColor = texture2D(u_Sampler3, v_UV);\n' +
  '  }\n' +
  '  float t = u_texColorWeight;\n' +
  '  vec4 lit = (1.0 - t) * u_BaseColor + t * texColor;\n' +
  '  if (u_FogEnable > 0.5) {\n' +
  '    float fogAmt = clamp(v_FogDist / u_FogDistance, 0.0, 1.0);\n' +
  '    lit = mix(lit, vec4(u_FogColor, lit.a), fogAmt);\n' +
  '  }\n' +
  '  gl_FragColor = lit;\n' +
  '}\n';

var canvas;
var gl;
var a_Position;
var a_UV;
var u_ModelMatrix;
var u_ViewMatrix;
var u_ProjectionMatrix;
var u_BaseColor;
var u_texColorWeight;
var u_TexIndex;
var u_Sampler0;
var u_Sampler1;
var u_Sampler2;
var u_Sampler3;
var u_CameraWorldPos;
var u_FogEnable;
var u_FogDistance;
var u_FogColor;

var camera;
var g_textures = [];
var g_texSkyFile = null;
var g_wallBuffers = [null, null, null, null];
var g_wallVertexCounts = [0, 0, 0, 0];

var WORLD = 32;
var MAX_STACK = 4;
var g_map = [];
var g_texMap = [];

var g_keys = {};
var g_mouseLocked = false;
var g_time = 0;
var g_startTime = performance.now() / 1000;

var g_crystals = [];
var g_crystalsCollected = 0;
var g_storyComplete = false;

var g_pyramidBuffer = null;
var g_pyramidVertexCount = 0;
var g_unitCubeBuffer = null;
var g_skyCubeBuffer = null;

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

var MOVE_SPEED = 0.12;
var PAN_DEG_KEY = 2.8;

var GROUND_Y_TOP = 0.0;
var FOG_DISTANCE = 52.0;

var g_matPool = [];
var g_matPoolSize = 0;
var g_matPoolNext = 0;
var g_matIdentity = new Matrix4();
var g_matGround = new Matrix4();
var g_matSky = new Matrix4();
var g_matCrystal = new Matrix4();
var g_matHorseBase = new Matrix4();
var g_vecForwardXZ = new Vector3();

var g_perf = {
  lastMs: performance.now(),
  frames: 0,
  fps: 0
};

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  return true;
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return false;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_BaseColor = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_TexIndex = gl.getUniformLocation(gl.program, 'u_TexIndex');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_CameraWorldPos = gl.getUniformLocation(gl.program, 'u_CameraWorldPos');
  u_FogEnable = gl.getUniformLocation(gl.program, 'u_FogEnable');
  u_FogDistance = gl.getUniformLocation(gl.program, 'u_FogDistance');
  u_FogColor = gl.getUniformLocation(gl.program, 'u_FogColor');
  if (
    a_Position < 0 ||
    a_UV < 0 ||
    !u_ModelMatrix ||
    !u_ViewMatrix ||
    !u_ProjectionMatrix ||
    !u_BaseColor ||
    !u_texColorWeight ||
    !u_TexIndex ||
    !u_Sampler0 ||
    !u_Sampler1 ||
    !u_Sampler2 ||
    !u_Sampler3 ||
    !u_CameraWorldPos ||
    !u_FogEnable ||
    !u_FogDistance ||
    !u_FogColor
  ) {
    console.log('Failed to get GLSL variable locations.');
    return false;
  }
  return true;
}

function makePowerOfTwoTextureFromCanvas(drawFn, size) {
  var c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  var ctx = c.getContext('2d');
  drawFn(ctx, size);
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

/**
 * Load a square power-of-two image from the server (same pattern as Matsuda loadTexture).
 */
function loadImageTexture(url, wrapS, wrapT, onLoad) {
  var image = new Image();
  image.onload = function () {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    onLoad(texture);
  };
  image.onerror = function () {
    console.warn('Texture failed to load (use a local server):', url);
    onLoad(null);
  };
  image.src = url;
}

function bindTextureUnitsToSamplers() {
  gl.useProgram(gl.program);
  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
  gl.uniform1i(u_Sampler3, 3);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_textures[0]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, g_textures[1]);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, g_textures[2]);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, g_textures[3]);
  gl.activeTexture(gl.TEXTURE0);
}

function initCanvasWallTextures() {
  g_textures[1] = makePowerOfTwoTextureFromCanvas(function (ctx, s) {
    var g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#2d6b2d');
    g.addColorStop(1, '#4a9f4a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (var i = 0; i < 400; i++) {
      ctx.fillStyle = 'rgba(20,60,20,' + (0.1 + Math.random() * 0.15) + ')';
      ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
    }
  }, 256);

  g_textures[2] = makePowerOfTwoTextureFromCanvas(function (ctx, s) {
    ctx.fillStyle = '#7a7a82';
    ctx.fillRect(0, 0, s, s);
    for (var y = 0; y < s; y += 4) {
      for (var x = 0; x < s; x += 4) {
        var v = 40 + ((x * 13 + y * 7) % 50);
        ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 8) + ')';
        ctx.fillRect(x, y, 4, 4);
      }
    }
  }, 256);

  g_textures[3] = makePowerOfTwoTextureFromCanvas(function (ctx, s) {
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#3d291f';
    for (var i = 0; i < 30; i++) {
      ctx.fillRect(Math.random() * s, Math.random() * s, 20, 4);
    }
  }, 256);
}

function loadWorldTexturesThen(startFn) {
  var TEX_BASE = '../textures/';
  var pending = 2;
  function tryStart() {
    pending -= 1;
    if (pending !== 0) {
      return;
    }
    if (!g_textures[0]) {
      g_textures[0] = makePowerOfTwoTextureFromCanvas(function (ctx, s) {
        ctx.fillStyle = '#8b5a3c';
        ctx.fillRect(0, 0, s, s);
      }, 256);
    }
    if (!g_texSkyFile) {
      g_texSkyFile = makePowerOfTwoTextureFromCanvas(function (ctx, s) {
        var g = ctx.createLinearGradient(0, 0, 0, s);
        g.addColorStop(0, '#87ceeb');
        g.addColorStop(1, '#1e5a9e');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      }, 256);
    }
    bindTextureUnitsToSamplers();
    startFn();
  }
  loadImageTexture(TEX_BASE + 'uvgrid.png', gl.REPEAT, gl.REPEAT, function (tex) {
    g_textures[0] = tex;
    tryStart();
  });
  loadImageTexture(TEX_BASE + 'sky.jpg', gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, function (tex) {
    g_texSkyFile = tex;
    tryStart();
  });
}

function initPyramidBuffer() {
  var vertices = new Float32Array([
    -0.5, 0.0, -0.5, 0.25, 0,
    0.5, 0.0, -0.5, 0.75, 0,
    0.0, 0.9, 0.0, 0.5, 1,
    0.5, 0.0, -0.5, 0.25, 0,
    0.5, 0.0, 0.5, 0.75, 0,
    0.0, 0.9, 0.0, 0.5, 1,
    0.5, 0.0, 0.5, 0.25, 0,
    -0.5, 0.0, 0.5, 0.75, 0,
    0.0, 0.9, 0.0, 0.5, 1,
    -0.5, 0.0, 0.5, 0.25, 0,
    -0.5, 0.0, -0.5, 0.75, 0,
    0.0, 0.9, 0.0, 0.5, 1,
    -0.5, 0.0, -0.5, 0, 0,
    0.5, 0.0, -0.5, 1, 0,
    0.5, 0.0, 0.5, 1, 1,
    -0.5, 0.0, -0.5, 0, 0,
    0.5, 0.0, 0.5, 1, 1,
    -0.5, 0.0, 0.5, 0, 1
  ]);
  g_pyramidBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_pyramidBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  g_pyramidVertexCount = 18;
}

function initMatPool(count) {
  var i;
  g_matPool.length = 0;
  for (i = 0; i < count; i++) {
    g_matPool.push(new Matrix4());
  }
  g_matPoolSize = count;
  g_matPoolNext = 0;
}

function matPoolReset() {
  g_matPoolNext = 0;
}

function matrixCopy(m) {
  if (g_matPoolNext >= g_matPoolSize) {
    g_matPool.push(new Matrix4());
    g_matPoolSize++;
  }
  var out = g_matPool[g_matPoolNext++];
  out.set(m);
  return out;
}

function setCameraWorldUniform() {
  gl.uniform3f(
    u_CameraWorldPos,
    camera.eye.elements[0],
    camera.eye.elements[1],
    camera.eye.elements[2]
  );
}

function setFogEnabled(on) {
  gl.uniform1f(u_FogEnable, on ? 1.0 : 0.0);
}

function rebuildWallMeshes() {
  var batches = [[], [], [], []];
  var x;
  var z;
  var h;
  var y;
  var tid;
  for (z = 0; z < WORLD; z++) {
    for (x = 0; x < WORLD; x++) {
      h = g_map[z][x];
      tid = g_texMap[z][x];
      if (tid < 0 || tid > 3) {
        tid = 0;
      }
      for (y = 0; y < h; y++) {
        appendUnitCubeWithUV(batches[tid], x + 0.5, y + 0.5, z + 0.5);
      }
    }
  }
  for (var t = 0; t < 4; t++) {
    var list = batches[t];
    var count = list.length / g_cubeStride;
    g_wallVertexCounts[t] = count;
    if (count === 0) {
      continue;
    }
    var f32 = new Float32Array(list);
    if (!g_wallBuffers[t]) {
      g_wallBuffers[t] = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, g_wallBuffers[t]);
    gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW);
  }
}

function proceduralMap() {
  g_map = [];
  g_texMap = [];
  var z;
  var x;
  for (z = 0; z < WORLD; z++) {
    var row = [];
    var trow = [];
    for (x = 0; x < WORLD; x++) {
      var ring =
        x < 3 || x >= WORLD - 3 || z < 3 || z >= WORLD - 3 ? 4 : 0;
      var openPlaza = x > 11 && x < 21 && z > 11 && z < 21 ? 1 : 0;
      var noise = ((x * 17 + z * 31) % 7) - 2;
      var h = ring;
      if (h <= 0) {
        h = openPlaza === 1 ? 0 : Math.max(0, Math.min(MAX_STACK, 1 + noise));
      }
      if ((x + z * 3) % 11 === 0 && openPlaza === 0) {
        h = MAX_STACK;
      }
      if (openPlaza === 0 && (x === 6 || x === 25) && z > 4 && z < 28) {
        h = Math.max(h, 2);
      }
      if (openPlaza === 0 && (z === 6 || z === 25) && x > 4 && x < 28) {
        h = Math.max(h, 2);
      }
      row.push(Math.max(0, Math.min(MAX_STACK, h)));
      var tid = (x + z * 2) % 4;
      if (row[x] === 0) {
        tid = 1;
      }
      trow.push(tid);
    }
    g_map.push(row);
    g_texMap.push(trow);
  }
  for (z = 0; z < WORLD; z++) {
    for (x = 0; x < WORLD; x++) {
      if (x === 0 || z === 0 || x === WORLD - 1 || z === WORLD - 1) {
        g_map[z][x] = MAX_STACK;
        g_texMap[z][x] = 2;
      }
    }
  }
}

function bindInterleavedAttributes() {
  var stride = g_cubeStride * 4;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, 12);
  gl.enableVertexAttribArray(a_UV);
}

function drawBatchedWallTexture(texSlot) {
  var buf = g_wallBuffers[texSlot];
  var n = g_wallVertexCounts[texSlot];
  if (!buf || n === 0) {
    return;
  }
  gl.uniformMatrix4fv(u_ModelMatrix, false, g_matIdentity.elements);
  gl.uniform4f(u_BaseColor, 1, 1, 1, 1);
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniform1i(u_TexIndex, texSlot);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  bindInterleavedAttributes();
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

/**
 * Rubric ground: one unit cube scaled into a thin slab (flattened cube) in the XZ plane.
 */
function drawGround() {
  g_matGround.setTranslate(16, GROUND_Y_TOP - 0.07, 16);
  g_matGround.scale(32, 0.14, 32);
  gl.uniformMatrix4fv(u_ModelMatrix, false, g_matGround.elements);
  gl.uniform4f(u_BaseColor, 1, 1, 1, 1);
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniform1i(u_TexIndex, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_unitCubeBuffer);
  bindInterleavedAttributes();
  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}

function drawSky() {
  setFogEnabled(false);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_texSkyFile);
  g_matSky.setTranslate(16, 8, 16);
  g_matSky.scale(520, 520, 520);
  gl.uniformMatrix4fv(u_ModelMatrix, false, g_matSky.elements);
  gl.uniform4f(u_BaseColor, 0.45, 0.65, 1.0, 1.0);
  gl.uniform1f(u_texColorWeight, 0.65);
  gl.uniform1i(u_TexIndex, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_skyCubeBuffer);
  bindInterleavedAttributes();
  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_textures[0]);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  setFogEnabled(true);
}

function drawColoredCube(modelMatrix, rgba) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniform4f(u_BaseColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniform1i(u_TexIndex, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_unitCubeBuffer);
  bindInterleavedAttributes();
  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}

function effectiveAngle(key) {
  return g_jointAngles[key];
}

function drawPyramid(modelMatrix, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniform1i(u_TexIndex, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_pyramidBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 20, 12);
  gl.enableVertexAttribArray(a_UV);
  gl.drawArrays(gl.TRIANGLES, 0, g_pyramidVertexCount);
}

function drawLeg(baseMatrix, sideOffset, frontOffset, upperKey, lowerKey, hoofKey) {
  var upper = matrixCopy(baseMatrix);
  upper.translate(sideOffset, -0.35, frontOffset);
  upper.rotate(effectiveAngle(upperKey), 0, 0, 1);
  var upperJoint = matrixCopy(upper);
  var upperShape = matrixCopy(upper);
  upperShape.translate(0, -0.32, 0);
  upperShape.rotate(-90, 0, 1, 0);
  upperShape.scale(0.23, 0.64, 0.23);
  drawColoredCube(upperShape, [0.56, 0.34, 0.2, 1.0]);

  var lower = matrixCopy(upperJoint);
  lower.translate(0, -0.64, 0);
  lower.rotate(effectiveAngle(lowerKey), 0, 0, 1);
  var lowerJoint = matrixCopy(lower);
  var lowerShape = matrixCopy(lower);
  lowerShape.translate(0, -0.28, 0);
  lowerShape.rotate(-90, 0, 1, 0);
  lowerShape.scale(0.18, 0.56, 0.18);
  drawColoredCube(lowerShape, [0.5, 0.3, 0.18, 1.0]);

  var hoof = matrixCopy(lowerJoint);
  hoof.translate(0, -0.56, 0.02);
  hoof.rotate(effectiveAngle(hoofKey), 0, 0, 1);
  var hoofShape = matrixCopy(hoof);
  hoofShape.translate(0, -0.08, 0.06);
  hoofShape.rotate(-90, 0, 1, 0);
  hoofShape.scale(0.2, 0.16, 0.3);
  drawColoredCube(hoofShape, [0.16, 0.12, 0.1, 1.0]);
}

function renderHorse(base) {
  var bodyColor = [0.62, 0.39, 0.23, 1.0];
  var darkBody = [0.5, 0.3, 0.18, 1.0];
  var maneColor = [0.22, 0.16, 0.12, 1.0];
  var eyeColor = [0.05, 0.05, 0.05, 1.0];

  var body = matrixCopy(base);
  body.translate(0, 0.6, 0);
  body.scale(2.2, 1.0, 0.9);
  drawColoredCube(body, bodyColor);

  var torsoFrame = matrixCopy(base);
  torsoFrame.translate(0, 0.6, 0);

  var neckJoint = matrixCopy(torsoFrame);
  neckJoint.translate(0.95, 0.35, 0);
  neckJoint.rotate(effectiveAngle('neck'), 0, 0, 1);
  var neckShape = matrixCopy(neckJoint);
  neckShape.translate(0.34, 0.36, 0);
  neckShape.rotate(-22, 0, 0, 1);
  neckShape.scale(0.45, 0.8, 0.4);
  drawColoredCube(neckShape, darkBody);

  var headJoint = matrixCopy(neckJoint);
  headJoint.translate(0.55, 0.62, 0);
  headJoint.rotate(effectiveAngle('head'), 0, 0, 1);
  var headShape = matrixCopy(headJoint);
  headShape.translate(0.32, 0.05, 0);
  headShape.scale(0.62, 0.42, 0.35);
  drawColoredCube(headShape, bodyColor);

  var snout = matrixCopy(headJoint);
  snout.translate(0.63, -0.02, 0);
  snout.scale(0.32, 0.28, 0.28);
  drawColoredCube(snout, [0.6, 0.37, 0.21, 1.0]);

  var leftEar = matrixCopy(headJoint);
  leftEar.translate(0.2, 0.3, 0.12);
  leftEar.scale(0.12, 0.24, 0.11);
  drawPyramid(leftEar, maneColor);

  var rightEar = matrixCopy(headJoint);
  rightEar.translate(0.2, 0.3, -0.12);
  rightEar.scale(0.12, 0.24, 0.11);
  drawPyramid(rightEar, maneColor);

  var eyeLeft = matrixCopy(headJoint);
  eyeLeft.translate(0.42, 0.1, 0.17);
  eyeLeft.scale(0.05, 0.05, 0.05);
  drawColoredCube(eyeLeft, eyeColor);

  var eyeRight = matrixCopy(headJoint);
  eyeRight.translate(0.42, 0.1, -0.17);
  eyeRight.scale(0.05, 0.05, 0.05);
  drawColoredCube(eyeRight, eyeColor);

  var tailJoint = matrixCopy(torsoFrame);
  tailJoint.translate(-1.06, 0.24, 0);
  tailJoint.rotate(-45 + effectiveAngle('tail'), 0, 0, 1);
  var tail = matrixCopy(tailJoint);
  tail.translate(-0.35, -0.26, 0);
  tail.scale(0.16, 0.85, 0.16);
  drawColoredCube(tail, maneColor);

  drawLeg(torsoFrame, 0.62, 0.32, 'frontRightUpper', 'frontRightLower', 'frontRightHoof');
  drawLeg(torsoFrame, 0.62, -0.32, 'frontLeftUpper', 'frontLeftLower', 'frontLeftHoof');
  drawLeg(torsoFrame, -0.62, 0.32, 'backRightUpper', 'backRightLower', 'backRightHoof');
  drawLeg(torsoFrame, -0.62, -0.32, 'backLeftUpper', 'backLeftLower', 'backLeftHoof');
}

function placeCrystals() {
  g_crystals = [
    { x: 8, z: 8, taken: false },
    { x: 24, z: 10, taken: false },
    { x: 10, z: 22, taken: false },
    { x: 22, z: 24, taken: false },
    { x: 16, z: 6, taken: false }
  ];
}

function updateCrystals() {
  var ex = camera.eye.elements[0];
  var ez = camera.eye.elements[2];
  var i;
  for (i = 0; i < g_crystals.length; i++) {
    var c = g_crystals[i];
    if (c.taken) {
      continue;
    }
    var dx = ex - (c.x + 0.5);
    var dz = ez - (c.z + 0.5);
    if (dx * dx + dz * dz < 2.4) {
      c.taken = true;
      g_crystalsCollected += 1;
      if (g_crystalsCollected >= g_crystals.length) {
        g_storyComplete = true;
      }
    }
  }
}

function drawCrystals() {
  var i;
  for (i = 0; i < g_crystals.length; i++) {
    var c = g_crystals[i];
    if (c.taken) {
      continue;
    }
    g_matCrystal.setTranslate(c.x + 0.5, 1.1 + 0.08 * Math.sin(g_time * 3 + i), c.z + 0.5);
    g_matCrystal.rotate(g_time * 40 + i * 20, 0, 1, 0);
    g_matCrystal.scale(0.35, 0.55, 0.35);
    drawColoredCube(g_matCrystal, [0.2, 0.85, 1.0, 1.0]);
  }
}

function getForwardXZ() {
  var f = g_vecForwardXZ;
  f.set(camera.at).sub(camera.eye);
  f.elements[1] = 0;
  if (f.magnitude() < 1e-4) {
    return null;
  }
  f.normalize();
  return f;
}

function getTargetCell() {
  var f = getForwardXZ();
  if (!f) {
    return null;
  }
  var ex = camera.eye.elements[0];
  var ez = camera.eye.elements[2];
  var cx = Math.floor(ex + f.elements[0] * 1.35);
  var cz = Math.floor(ez + f.elements[2] * 1.35);
  if (cx < 0 || cx >= WORLD || cz < 0 || cz >= WORLD) {
    return null;
  }
  return { cx: cx, cz: cz };
}

function tryPlaceBlock() {
  var cell = getTargetCell();
  if (!cell) {
    return;
  }
  var h = g_map[cell.cz][cell.cx];
  if (h >= MAX_STACK) {
    return;
  }
  g_map[cell.cz][cell.cx] = h + 1;
  g_texMap[cell.cz][cell.cx] = 0;
  rebuildWallMeshes();
}

function tryRemoveBlock() {
  var cell = getTargetCell();
  if (!cell) {
    return;
  }
  var h = g_map[cell.cz][cell.cx];
  if (h <= 0) {
    return;
  }
  g_map[cell.cz][cell.cx] = h - 1;
  rebuildWallMeshes();
}

function updateHorseAnimation() {
  var t = g_time;
  g_jointAngles.neck = 5 + Math.sin(t * 3.0) * 5;
  g_jointAngles.head = -6 + Math.sin(t * 3.0 + 0.8) * 4;
  g_jointAngles.tail = 15 + Math.sin(t * 8.0) * 18;
  var stepA = Math.sin(t * 6.0) * 18;
  var stepB = Math.sin(t * 6.0 + Math.PI) * 18;
  g_jointAngles.frontLeftUpper = 10 + stepA;
  g_jointAngles.frontRightUpper = -10 + stepB;
  g_jointAngles.backLeftUpper = -8 + stepB;
  g_jointAngles.backRightUpper = 8 + stepA;
}

function renderScene() {
  gl.useProgram(gl.program);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniform1f(u_FogDistance, FOG_DISTANCE);
  gl.uniform3f(u_FogColor, 0.52, 0.6, 0.72);
  setCameraWorldUniform();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  matPoolReset();
  drawSky();
  drawGround();
  var t;
  for (t = 0; t < 4; t++) {
    drawBatchedWallTexture(t);
  }
  drawCrystals();

  g_matHorseBase.setTranslate(16, GROUND_Y_TOP + 0.02, 22);
  g_matHorseBase.rotate(-35, 0, 1, 0);
  renderHorse(g_matHorseBase);
}

function updateStoryHud() {
  var el = document.getElementById('hudStory');
  if (!el) {
    return;
  }
  if (g_storyComplete) {
    el.textContent =
      'The herd is safe: you returned all sky-crystals to the plains. The horse bows in thanks.';
  } else {
    el.textContent =
      'Story — "Crystal Plain": find and touch the five cyan crystals hidden among the walls. ' +
      'WASD move, Q/E or mouse look, F place block, G remove block.';
  }
  var c = document.getElementById('hudCrystals');
  if (c) {
    c.textContent = 'Crystals: ' + g_crystalsCollected + ' / ' + g_crystals.length;
  }
}

function clampCameraAboveGround() {
  var ex = camera.eye.elements[0];
  var ey = camera.eye.elements[1];
  var ez = camera.eye.elements[2];
  var minY = GROUND_Y_TOP + 1.5;
  if (ey < minY) {
    var lift = minY - ey;
    camera.eye.elements[1] += lift;
    camera.at.elements[1] += lift;
    camera.updateView();
  }
}

function processHeldKeys() {
  if (g_keys['w'] || g_keys['W']) {
    camera.moveForward(MOVE_SPEED);
  }
  if (g_keys['s'] || g_keys['S']) {
    camera.moveBackwards(MOVE_SPEED);
  }
  if (g_keys['a'] || g_keys['A']) {
    camera.moveLeft(MOVE_SPEED);
  }
  if (g_keys['d'] || g_keys['D']) {
    camera.moveRight(MOVE_SPEED);
  }
  if (g_keys['q'] || g_keys['Q']) {
    camera.panLeft(PAN_DEG_KEY);
  }
  if (g_keys['e'] || g_keys['E']) {
    camera.panRight(PAN_DEG_KEY);
  }
}

function updateFpsHud() {
  g_perf.frames += 1;
  var now = performance.now();
  var dt = now - g_perf.lastMs;
  if (dt >= 500) {
    g_perf.fps = (g_perf.frames * 1000) / dt;
    g_perf.frames = 0;
    g_perf.lastMs = now;
    var el = document.getElementById('hudFps');
    if (el) {
      el.textContent = 'FPS: ' + g_perf.fps.toFixed(1) + ' (rubric: 10+ target)';
    }
  }
}

function tick() {
  g_time = performance.now() / 1000 - g_startTime;
  processHeldKeys();
  clampCameraAboveGround();
  updateHorseAnimation();
  updateCrystals();
  updateStoryHud();
  updateFpsHud();
  renderScene();
  requestAnimationFrame(tick);
}

function wireInput() {
  window.addEventListener('keydown', function (e) {
    g_keys[e.key] = true;
    if (e.key === 'f' || e.key === 'F') {
      tryPlaceBlock();
    }
    if (e.key === 'g' || e.key === 'G') {
      tryRemoveBlock();
    }
  });
  window.addEventListener('keyup', function (e) {
    g_keys[e.key] = false;
  });

  canvas.addEventListener('click', function () {
    canvas.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', function () {
    g_mouseLocked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', function (e) {
    if (!g_mouseLocked) {
      return;
    }
    var dx = e.movementX || 0;
    var dy = e.movementY || 0;
    camera.applyYaw(dx * 0.22);
    camera.applyPitch(-dy * 0.22);
  });
}

function initStaticCubeBuffers() {
  var unit = [];
  appendUnitCubeWithUV(unit, 0, 0, 0);
  g_unitCubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_unitCubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unit), gl.STATIC_DRAW);

  var sky = [];
  appendUnitCubeWithUV(sky, 0, 0, 0);
  g_skyCubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_skyCubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sky), gl.STATIC_DRAW);
}

function startWorldApp() {
  initMatPool(64);
  initPyramidBuffer();
  placeCrystals();
  wireInput();
  gl.clearColor(0.08, 0.1, 0.14, 1.0);
  gl.useProgram(gl.program);
  gl.uniform1f(u_FogDistance, FOG_DISTANCE);
  gl.uniform3f(u_FogColor, 0.52, 0.6, 0.72);
  updateStoryHud();
  renderScene();
  requestAnimationFrame(tick);
}

function main() {
  if (!setupWebGL()) {
    return;
  }
  if (!connectVariablesToGLSL()) {
    return;
  }

  camera = new Camera(canvas);
  proceduralMap();
  rebuildWallMeshes();
  initStaticCubeBuffers();
  initCanvasWallTextures();
  loadWorldTexturesThen(startWorldApp);
}
