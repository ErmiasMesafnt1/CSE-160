var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_Size;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_Size;\n' +
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
var u_Size;
var g_vertexBuffer;

var shapesList = [];
var pictureShapes = [];

var DRAW_SQUARES = 0;
var DRAW_TRIANGLES = 1;
var DRAW_CIRCLES = 2;
var g_drawMode = DRAW_SQUARES;

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false;
  }
  g_vertexBuffer = gl.createBuffer();
  if (!g_vertexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  return true;
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return false;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return false;
  }
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return false;
  }
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return false;
  }
  return true;
}

function renderAllShapes() {
  gl.useProgram(gl.program);
  gl.clear(gl.COLOR_BUFFER_BIT);
  var i;
  for (i = 0; i < shapesList.length; i++) {
    shapesList[i].render();
  }
  for (i = 0; i < pictureShapes.length; i++) {
    pictureShapes[i].render();
  }
  var nd = document.getElementById('numdot');
  if (nd) {
    nd.textContent = String(shapesList.length);
  }
}

function canvasToClip(ev, canvas) {
  var rect = canvas.getBoundingClientRect();
  var x = ev.clientX - rect.left;
  var y = ev.clientY - rect.top;
  var clipX = (x - canvas.width / 2) / (canvas.width / 2);
  var clipY = (canvas.height / 2 - y) / (canvas.height / 2);
  return { x: clipX, y: clipY };
}

function readRgbSliders() {
  var r = parseInt(document.getElementById('redSlide').value, 10) / 100;
  var g = parseInt(document.getElementById('greenSlide').value, 10) / 100;
  var b = parseInt(document.getElementById('blueSlide').value, 10) / 100;
  return [r, g, b, 1.0];
}

function readSizeSlider() {
  return parseFloat(document.getElementById('sizeSlide').value);
}

function readSegmentsSlider() {
  return parseInt(document.getElementById('segmentsSlide').value, 10);
}

function click(ev, canvas) {
  if (ev.type === 'mousemove' && ev.buttons !== 1) {
    return;
  }
  var p = canvasToClip(ev, canvas);
  var color = readRgbSliders();
  var sizePx = readSizeSlider();
  var segments = readSegmentsSlider();

  if (g_drawMode === DRAW_SQUARES) {
    var pt = new Point();
    pt.position = [p.x, p.y, 0.0];
    pt.color = color.slice();
    pt.size = sizePx;
    shapesList.push(pt);
  } else if (g_drawMode === DRAW_TRIANGLES) {
    var tri = new Triangle();
    tri.position = [p.x, p.y, 0.0];
    tri.color = color.slice();
    tri.size = sizePx;
    shapesList.push(tri);
  } else {
    var circ = new Circle();
    circ.position = [p.x, p.y, 0.0];
    circ.color = color.slice();
    circ.size = sizePx;
    circ.segments = Math.max(3, segments);
    shapesList.push(circ);
  }
}

function handlePointer(ev) {
  click(ev, canvas);
  renderAllShapes();
}

function clearCanvasAction() {
  shapesList = [];
  pictureShapes = [];
  renderAllShapes();
}

function setDrawMode(mode) {
  g_drawMode = mode;
}

function buildPictureTriangles() {
  var cream = [0.98, 0.96, 0.9, 1.0];
  var land = [0.78, 0.9, 0.68, 1.0];
  var landEdge = [0.22, 0.52, 0.28, 1.0];
  var water = [0.72, 0.88, 0.98, 1.0];
  var waterEdge = [0.25, 0.58, 0.95, 1.0];
  var redB = [0.92, 0.22, 0.18, 1.0];
  var orangeB = [0.98, 0.55, 0.2, 1.0];
  var brownBar = [0.32, 0.2, 0.1, 1.0];
  var fishBody = [0.88, 0.87, 0.85, 1.0];
  var fishOrange = [0.95, 0.5, 0.15, 1.0];
  var ink = [0.07, 0.07, 0.07, 1.0];

  var T = function (xa, ya, xb, yb, xc, yc, col) {
    return {
      render: function () {
        gl.uniform4f(u_FragColor, col[0], col[1], col[2], col[3]);
        gl.uniform1f(u_Size, 5.0);
        drawTriangle([xa, ya, xb, yb, xc, yc]);
      }
    };
  };

  function addRect(olist, x, y, w, h, col) {
    olist.push(T(x, y, x + w, y, x + w, y + h, col));
    olist.push(T(x, y, x + w, y + h, x, y + h, col));
  }

  function addThickLine(olist, x0, y0, x1, y1, t, col) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-8) {
      return;
    }
    var nx = (-dy / len) * (0.5 * t);
    var ny = (dx / len) * (0.5 * t);
    var ax = x0 + nx;
    var ay = y0 + ny;
    var bx = x0 - nx;
    var by = y0 - ny;
    var cx = x1 - nx;
    var cy = y1 - ny;
    var dx2 = x1 + nx;
    var dy2 = y1 + ny;
    olist.push(T(ax, ay, bx, by, cx, cy, col));
    olist.push(T(ax, ay, cx, cy, dx2, dy2, col));
  }

  var out = [];
  var yWater = 0.14;

  out.push(T(-1, -1, 1, -1, 1, yWater, water));
  out.push(T(-1, -1, 1, yWater, -1, yWater, water));

  out.push(T(-1, yWater, 1, yWater, 1, 1, cream));
  out.push(T(-1, yWater, 1, 1, -1, 1, cream));

  out.push(T(-1, yWater, -0.4, yWater, -0.36, 0.8, land));
  out.push(T(-1, yWater, -0.36, 0.8, -1, 0.66, land));

  out.push(T(1, yWater, 0.4, yWater, 0.36, 0.8, land));
  out.push(T(1, yWater, 0.36, 0.8, 1, 0.66, land));

  var yDeckBot = 0.552;
  var yDeckTop = 0.622;
  var xDeckL = -0.52;
  var xDeckR = 0.52;
  addRect(out, xDeckL, yDeckBot, xDeckR - xDeckL, yDeckTop - yDeckBot, brownBar);

  var xb = [-0.5, -0.26, -0.02, 0.22, 0.46];
  var yApex = [0.87, 0.735, 0.87, 0.735];
  var trussCol = [redB, orangeB, orangeB, redB];
  var mids = [];
  var ti;
  for (ti = 0; ti < 4; ti++) {
    mids[ti] = (xb[ti] + xb[ti + 1]) * 0.5;
    out.push(
      T(xb[ti], yDeckTop, xb[ti + 1], yDeckTop, mids[ti], yApex[ti], trussCol[ti])
    );
  }

  var ex = -0.482;
  var ey = 0.632;
  var letterW = 0.048;
  var letterH = 0.088;
  var strokeE = 0.0125;

  addRect(out, ex, ey, strokeE, letterH, ink);
  addRect(out, ex, ey + letterH - strokeE, letterW, strokeE, ink);
  addRect(out, ex, ey + letterH * 0.5 - strokeE * 0.5, letterW * 0.7, strokeE, ink);
  addRect(out, ex, ey, letterW, strokeE, ink);

  var strokeM = 0.0135;
  var yTopM = 0.88;
  var lx = -0.498;
  var rx = 0.492;
  addRect(out, lx, yDeckTop, strokeM, yTopM - yDeckTop, ink);
  addRect(out, rx - strokeM, yDeckTop, strokeM, yTopM - yDeckTop, ink);

  addThickLine(out, lx + strokeM, yTopM, mids[0], yApex[0], strokeM, ink);
  addThickLine(out, mids[0], yApex[0], xb[1], yDeckTop, strokeM, ink);
  addThickLine(out, xb[1], yDeckTop, mids[1], yApex[1], strokeM, ink);
  addThickLine(out, mids[1], yApex[1], xb[2], yDeckTop, strokeM, ink);
  addThickLine(out, xb[2], yDeckTop, mids[2], yApex[2], strokeM, ink);
  addThickLine(out, mids[2], yApex[2], xb[3], yDeckTop, strokeM, ink);
  addThickLine(out, xb[3], yDeckTop, mids[3], yApex[3], strokeM, ink);
  addThickLine(out, mids[3], yApex[3], rx - strokeM, yTopM, strokeM, ink);

  out.push(T(-1, yWater, 1, yWater, 1, yWater + 0.028, waterEdge));
  out.push(T(-1, yWater, 1, yWater + 0.028, -1, yWater + 0.028, waterEdge));

  out.push(T(-1, yWater, -1, 0.66, -0.982, 0.66, landEdge));
  out.push(T(-1, yWater, -0.982, 0.66, -0.982, yWater, landEdge));
  out.push(T(1, yWater, 1, 0.66, 0.982, 0.66, landEdge));
  out.push(T(1, yWater, 0.982, 0.66, 0.982, yWater, landEdge));

  var fx = 0.02;
  var fy = -0.42;
  var s = 0.075;
  out.push(T(fx - s, fy - s, fx + s, fy - s, fx + s, fy + s, fishBody));
  out.push(T(fx - s, fy - s, fx + s, fy + s, fx - s, fy + s, fishBody));

  out.push(T(fx + s, fy + s * 0.15, fx + s + 0.14, fy + s * 0.55, fx + s + 0.14, fy - s * 0.55, fishOrange));

  out.push(T(fx - s * 0.2, fy + s, fx + s * 0.2, fy + s, fx, fy + s + 0.1, fishOrange));
  out.push(T(fx - s * 0.2, fy - s, fx + s * 0.2, fy - s, fx, fy - s - 0.1, fishOrange));

  return out;
}

function drawPictureButtonAction() {
  pictureShapes = buildPictureTriangles();
  renderAllShapes();
}

function undoLastShape() {
  if (shapesList.length > 0) {
    shapesList.pop();
    renderAllShapes();
  }
}

function wireUi() {
  document.getElementById('clearButton').onclick = clearCanvasAction;

  document.getElementById('green').onclick = function () {
    document.getElementById('redSlide').value = 0;
    document.getElementById('greenSlide').value = 100;
    document.getElementById('blueSlide').value = 0;
  };
  document.getElementById('red').onclick = function () {
    document.getElementById('redSlide').value = 100;
    document.getElementById('greenSlide').value = 0;
    document.getElementById('blueSlide').value = 0;
  };

  document.getElementById('modeSquares').onclick = function () {
    setDrawMode(DRAW_SQUARES);
  };
  document.getElementById('modeTriangles').onclick = function () {
    setDrawMode(DRAW_TRIANGLES);
  };
  document.getElementById('modeCircles').onclick = function () {
    setDrawMode(DRAW_CIRCLES);
  };

  document.getElementById('drawPictureBtn').onclick = drawPictureButtonAction;
  document.getElementById('undoBtn').onclick = undoLastShape;
}

function main() {
  if (!setupWebGL()) {
    return;
  }
  if (!connectVariablesToGLSL()) {
    return;
  }

  wireUi();

  canvas.onmousedown = handlePointer;
  canvas.onmousemove = handlePointer;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  var nd = document.getElementById('numdot');
  if (nd) {
    nd.textContent = '0';
  }
}
