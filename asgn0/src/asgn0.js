// CSE 160 Assignment 0 — 2D vector drawing on canvas
//
// Based on Listing 2.1 (DrawRectangle) in:
//   WebGL Programming Guide (Kouichi Matsuda & Rodger Lea)
//   Chapter 2: Your First Step with WebGL — 2D canvas context
// Book site (examples & downloads): https://sites.google.com/site/webglbook
//
// Listing 2.1 used: getElementById('webgl'), getContext('2d'), and a blue fillRect.
// Assignment 2+ replaces that with a black canvas and vectors drawn with lineTo.

var canvas;
var ctx;
var VECTOR_DRAW_SCALE = 20;

function main() {
  canvas = document.getElementById('webgl');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
  }
  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.log('Failed to get 2d rendering context');
    return;
  }

  document.getElementById('drawVectorsBtn').onclick = handleDrawEvent;
  document.getElementById('drawOperationBtn').onclick = handleDrawOperationEvent;

  clearCanvas();
}

function readVector2D(xInputId, yInputId) {
  var x = parseFloat(document.getElementById(xInputId).value);
  var y = parseFloat(document.getElementById(yInputId).value);
  if (isNaN(x)) x = 0;
  if (isNaN(y)) y = 0;
  return new Vector3([x, y, 0]);
}

function cloneVector3(v) {
  var e = v.elements;
  return new Vector3([e[0], e[1], e[2]]);
}

function clearCanvas() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
  var cx = canvas.width * 0.5;
  var cy = canvas.height * 0.5;
  var e = v.elements;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + e[0] * VECTOR_DRAW_SCALE, cy - e[1] * VECTOR_DRAW_SCALE);
  ctx.stroke();
}

function handleDrawEvent() {
  clearCanvas();
  var v1 = readVector2D('v1x', 'v1y');
  var v2 = readVector2D('v2x', 'v2y');
  drawVector(v1, 'red');
  drawVector(v2, 'blue');
}

function handleDrawOperationEvent() {
  clearCanvas();
  var v1 = readVector2D('v1x', 'v1y');
  var v2 = readVector2D('v2x', 'v2y');
  drawVector(v1, 'red');
  drawVector(v2, 'blue');

  var op = document.getElementById('operation').value;
  var s = parseFloat(document.getElementById('scalar').value);
  if (isNaN(s)) s = 0;

  if (op === 'add') {
    var v3 = cloneVector3(v1);
    v3.add(v2);
    drawVector(v3, 'green');
  } else if (op === 'subtract') {
    var v3s = cloneVector3(v1);
    v3s.sub(v2);
    drawVector(v3s, 'green');
  } else if (op === 'multiply') {
    var vm1 = cloneVector3(v1);
    var vm2 = cloneVector3(v2);
    vm1.mul(s);
    vm2.mul(s);
    drawVector(vm1, 'green');
    drawVector(vm2, 'green');
  } else if (op === 'divide') {
    var vd1 = cloneVector3(v1);
    var vd2 = cloneVector3(v2);
    vd1.div(s);
    vd2.div(s);
    drawVector(vd1, 'green');
    drawVector(vd2, 'green');
  } else if (op === 'magnitude') {
    console.log('Magnitude v1:', v1.magnitude());
    console.log('Magnitude v2:', v2.magnitude());
  } else if (op === 'normalize') {
    var n1 = cloneVector3(v1);
    var n2 = cloneVector3(v2);
    n1.normalize();
    n2.normalize();
    drawVector(n1, 'green');
    drawVector(n2, 'green');
  } else if (op === 'angle') {
    console.log('Angle:', angleBetween(v1, v2));
  } else if (op === 'area') {
    console.log('Area:', areaTriangle(v1, v2));
  }
}

function angleBetween(v1, v2) {
  var dot = Vector3.dot(v1, v2);
  var m1 = v1.magnitude();
  var m2 = v2.magnitude();
  if (m1 === 0 || m2 === 0) {
    return 0;
  }
  var cos = dot / (m1 * m2);
  cos = Math.max(-1, Math.min(1, cos));
  var rad = Math.acos(cos);
  return rad * (180 / Math.PI);
}

function areaTriangle(v1, v2) {
  var c = Vector3.cross(v1, v2);
  return 0.5 * c.magnitude();
}
