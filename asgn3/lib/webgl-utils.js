// Minimal WebGL context helper (Matsuda-style companion pattern)

function getWebGLContext(canvas) {
  var opts = { preserveDrawingBuffer: true };
  var gl = canvas.getContext('webgl', opts) ||
    canvas.getContext('experimental-webgl', opts);
  if (!gl) {
    return null;
  }
  return gl;
}
