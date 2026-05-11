/**
 * Unit cube geometry (-0.5 .. 0.5) with per-vertex UVs, interleaved as x,y,z,u,v.
 * Used for batched world draws and single-cube colored draws.
 */

var g_cubeStride = 5;
var g_cubeVertexCount = 36;

/**
 * Append 36 vertices (triangle list) for a unit cube centered at (cx, cy, cz).
 * @param {number[]} out - push floats here
 */
function appendUnitCubeWithUV(out, cx, cy, cz) {
  function tri(ax, ay, az, au, av, bx, by, bz, bu, bv, cx2, cy2, cz2, cu, cv) {
    out.push(ax + cx, ay + cy, az + cz, au, av);
    out.push(bx + cx, by + cy, bz + cz, bu, bv);
    out.push(cx2 + cx, cy2 + cy, cz2 + cz, cu, cv);
  }
  // Front (+Z)
  tri(-0.5, -0.5, 0.5, 0, 0, 0.5, -0.5, 0.5, 1, 0, 0.5, 0.5, 0.5, 1, 1);
  tri(-0.5, -0.5, 0.5, 0, 0, 0.5, 0.5, 0.5, 1, 1, -0.5, 0.5, 0.5, 0, 1);
  // Back (-Z)
  tri(-0.5, -0.5, -0.5, 1, 0, -0.5, 0.5, -0.5, 1, 1, 0.5, 0.5, -0.5, 0, 1);
  tri(-0.5, -0.5, -0.5, 1, 0, 0.5, 0.5, -0.5, 0, 1, 0.5, -0.5, -0.5, 0, 0);
  // Top (+Y)
  tri(-0.5, 0.5, -0.5, 0, 1, -0.5, 0.5, 0.5, 0, 0, 0.5, 0.5, 0.5, 1, 0);
  tri(-0.5, 0.5, -0.5, 0, 1, 0.5, 0.5, 0.5, 1, 0, 0.5, 0.5, -0.5, 1, 1);
  // Bottom (-Y)
  tri(-0.5, -0.5, -0.5, 0, 0, 0.5, -0.5, -0.5, 1, 0, 0.5, -0.5, 0.5, 1, 1);
  tri(-0.5, -0.5, -0.5, 0, 0, 0.5, -0.5, 0.5, 1, 1, -0.5, -0.5, 0.5, 0, 1);
  // Right (+X)
  tri(0.5, -0.5, -0.5, 0, 0, 0.5, 0.5, -0.5, 1, 0, 0.5, 0.5, 0.5, 1, 1);
  tri(0.5, -0.5, -0.5, 0, 0, 0.5, 0.5, 0.5, 1, 1, 0.5, -0.5, 0.5, 0, 1);
  // Left (-X)
  tri(-0.5, -0.5, -0.5, 1, 0, -0.5, -0.5, 0.5, 1, 1, -0.5, 0.5, -0.5, 0, 1);
  tri(-0.5, -0.5, -0.5, 1, 0, -0.5, 0.5, -0.5, 0, 1, -0.5, 0.5, 0.5, 0, 0);
}

/**
 * @param {number[]} out
 * @param {number} y0 bottom y of column
 * @param {number} y1 top y of column
 * @param {number} ix grid x
 * @param {number} iz grid z
 */
function appendTerrainCellQuad(out, y0, y1, y2, y3, ix, iz) {
  var x0 = ix;
  var x1 = ix + 1;
  var z0 = iz;
  var z1 = iz + 1;
  var ru = 4;
  var u00 = x0 * ru;
  var u10 = x1 * ru;
  var v0 = z0 * ru;
  var v1 = z1 * ru;
  function v(px, py, pz, u, v) {
    out.push(px, py, pz, u, v);
  }
  v(x0, y0, z0, u00, v0);
  v(x1, y1, z0, u10, v0);
  v(x1, y2, z1, u10, v1);
  v(x0, y0, z0, u00, v0);
  v(x1, y2, z1, u10, v1);
  v(x0, y3, z1, u00, v1);
}
