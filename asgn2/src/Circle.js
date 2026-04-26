class Circle {
  constructor() {
    this.type = 'circle';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
    this.segments = 10;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, size);

    var d = this.size / 200.0;
    var angleStep = 360 / this.segments;
    var angle;
    for (angle = 0; angle < 360; angle += angleStep) {
      var angle1 = angle;
      var angle2 = angle + angleStep;
      var rad1 = (angle1 * Math.PI) / 180.0;
      var rad2 = (angle2 * Math.PI) / 180.0;
      var vec1 = [Math.cos(rad1) * d, Math.sin(rad1) * d];
      var vec2 = [Math.cos(rad2) * d, Math.sin(rad2) * d];
      var pt1 = [xy[0] + vec1[0], xy[1] + vec1[1]];
      var pt2 = [xy[0] + vec2[0], xy[1] + vec2[1]];
      drawTriangle([xy[0], xy[1], pt1[0], pt1[1], pt2[0], pt2[1]]);
    }
  }
}
