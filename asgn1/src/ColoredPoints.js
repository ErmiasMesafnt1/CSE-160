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
  var sky = [0.2, 0.45, 0.85, 1.0];
  var grass = [0.15, 0.55, 0.2, 1.0];
  var house = [0.75, 0.55, 0.35, 1.0];
  var roof = [0.55, 0.2, 0.15, 1.0];
  var door = [0.35, 0.2, 0.1, 1.0];
  var pane = [0.75, 0.85, 0.95, 1.0];
  var trunk = [0.35, 0.22, 0.12, 1.0];
  var leaf = [0.1, 0.45, 0.15, 1.0];
  var sun = [1.0, 0.92, 0.2, 1.0];

  var T = function (xa, ya, xb, yb, xc, yc, col) {
    return {
      render: function () {
        gl.uniform4f(u_FragColor, col[0], col[1], col[2], col[3]);
        gl.uniform1f(u_Size, 5.0);
        drawTriangle([xa, ya, xb, yb, xc, yc]);
      }
    };
  };

  var out = [];

  out.push(T(-1, 0.15, 1, 0.15, 1, 1, sky));
  out.push(T(-1, 0.15, 1, 1, -1, 1, sky));

  out.push(T(-1, -1, 1, -1, 1, 0.15, grass));
  out.push(T(-1, -1, 1, 0.15, -1, 0.15, grass));

  out.push(T(-0.35, -0.25, 0.35, -0.25, 0.35, 0.25, house));
  out.push(T(-0.35, -0.25, 0.35, 0.25, -0.35, 0.25, house));

  out.push(T(-0.4, 0.25, 0, 0.55, 0.4, 0.25, roof));
  out.push(T(-0.4, 0.25, 0.4, 0.25, 0, 0.55, roof));

  out.push(T(-0.06, -0.25, 0.06, -0.25, 0.06, -0.02, door));
  out.push(T(-0.06, -0.25, 0.06, -0.02, -0.06, -0.02, door));

  out.push(T(-0.28, 0.02, -0.14, 0.02, -0.14, 0.14, pane));
  out.push(T(-0.28, 0.02, -0.14, 0.14, -0.28, 0.14, pane));

  out.push(T(0.14, 0.02, 0.28, 0.02, 0.28, 0.14, pane));
  out.push(T(0.14, 0.02, 0.28, 0.14, 0.14, 0.14, pane));

  out.push(T(0.62, -0.35, 0.68, -0.35, 0.68, 0.05, trunk));
  out.push(T(0.62, -0.35, 0.68, 0.05, 0.62, 0.05, trunk));

  out.push(T(0.65, 0.05, 0.82, 0.12, 0.65, 0.22, leaf));
  out.push(T(0.65, 0.22, 0.82, 0.12, 0.82, 0.28, leaf));
  out.push(T(0.48, 0.12, 0.65, 0.05, 0.58, 0.24, leaf));
  out.push(T(0.58, 0.24, 0.65, 0.05, 0.72, 0.18, leaf));
  out.push(T(0.58, 0.24, 0.72, 0.18, 0.65, 0.32, leaf));

  out.push(T(-0.75, 0.55, -0.55, 0.55, -0.65, 0.72, sun));
  out.push(T(-0.75, 0.55, -0.65, 0.72, -0.85, 0.68, sun));
  out.push(T(-0.55, 0.55, -0.65, 0.72, -0.58, 0.62, sun));

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
