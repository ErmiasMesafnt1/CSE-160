function vec3FromValues(x, y, z) {
  return [x, y, z];
}

function vec3Add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}
