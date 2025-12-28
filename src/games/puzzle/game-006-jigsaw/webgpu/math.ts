/**
 * 3D 數學工具庫 - 拼圖遊戲
 * Math utilities for Jigsaw puzzle
 */

export type vec2 = [number, number];
export type vec3 = [number, number, number];
export type vec4 = [number, number, number, number];
export type mat4 = Float32Array;

export const mat4 = {
  create(): mat4 {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  },

  identity(out: mat4): mat4 {
    out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
  },

  perspective(fov: number, aspect: number, near: number, far: number): mat4 {
    const out = mat4.create();
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);

    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    out[15] = 0;

    return out;
  },

  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): mat4 {
    const out = mat4.create();
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    out[0] = -2 * lr;
    out[5] = -2 * bt;
    out[10] = 2 * nf;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;

    return out;
  },

  lookAt(eye: vec3, target: vec3, up: vec3): mat4 {
    const out = mat4.create();

    let z0 = eye[0] - target[0];
    let z1 = eye[1] - target[1];
    let z2 = eye[2] - target[2];

    let len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    let x0 = up[1] * z2 - up[2] * z1;
    let x1 = up[2] * z0 - up[0] * z2;
    let x2 = up[0] * z1 - up[1] * z0;

    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (len > 0) {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }

    let y0 = z1 * x2 - z2 * x1;
    let y1 = z2 * x0 - z0 * x2;
    let y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (len > 0) {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }

    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
    out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
    out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
    out[15] = 1;

    return out;
  },

  multiply(a: mat4, b: mat4): mat4 {
    const out = mat4.create();

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[i * 4 + j] =
          b[i * 4] * a[j] +
          b[i * 4 + 1] * a[4 + j] +
          b[i * 4 + 2] * a[8 + j] +
          b[i * 4 + 3] * a[12 + j];
      }
    }

    return out;
  },

  translate(m: mat4, v: vec3): mat4 {
    const out = new Float32Array(m);
    out[12] = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12];
    out[13] = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13];
    out[14] = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14];
    out[15] = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15];
    return out;
  },

  scale(m: mat4, v: vec3): mat4 {
    const out = new Float32Array(m);
    out[0] = m[0] * v[0];
    out[1] = m[1] * v[0];
    out[2] = m[2] * v[0];
    out[3] = m[3] * v[0];
    out[4] = m[4] * v[1];
    out[5] = m[5] * v[1];
    out[6] = m[6] * v[1];
    out[7] = m[7] * v[1];
    out[8] = m[8] * v[2];
    out[9] = m[9] * v[2];
    out[10] = m[10] * v[2];
    out[11] = m[11] * v[2];
    return out;
  },

  rotateX(m: mat4, angle: number): mat4 {
    const out = new Float32Array(m);
    const s = Math.sin(angle);
    const c = Math.cos(angle);

    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];

    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;

    return out;
  },

  rotateY(m: mat4, angle: number): mat4 {
    const out = new Float32Array(m);
    const s = Math.sin(angle);
    const c = Math.cos(angle);

    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];

    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;

    return out;
  },

  rotateZ(m: mat4, angle: number): mat4 {
    const out = new Float32Array(m);
    const s = Math.sin(angle);
    const c = Math.cos(angle);

    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];

    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;

    return out;
  }
};

export const vec3 = {
  create(): vec3 {
    return [0, 0, 0];
  },

  fromValues(x: number, y: number, z: number): vec3 {
    return [x, y, z];
  },

  normalize(out: vec3, a: vec3): vec3 {
    const len = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    if (len > 0) {
      const invLen = 1 / len;
      out[0] = a[0] * invLen;
      out[1] = a[1] * invLen;
      out[2] = a[2] * invLen;
    }
    return out;
  },

  subtract(out: vec3, a: vec3, b: vec3): vec3 {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
  },

  add(out: vec3, a: vec3, b: vec3): vec3 {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
  },

  scale(out: vec3, a: vec3, s: number): vec3 {
    out[0] = a[0] * s;
    out[1] = a[1] * s;
    out[2] = a[2] * s;
    return out;
  },

  cross(out: vec3, a: vec3, b: vec3): vec3 {
    out[0] = a[1] * b[2] - a[2] * b[1];
    out[1] = a[2] * b[0] - a[0] * b[2];
    out[2] = a[0] * b[1] - a[1] * b[0];
    return out;
  },

  dot(a: vec3, b: vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },

  lerp(out: vec3, a: vec3, b: vec3, t: number): vec3 {
    out[0] = a[0] + t * (b[0] - a[0]);
    out[1] = a[1] + t * (b[1] - a[1]);
    out[2] = a[2] + t * (b[2] - a[2]);
    return out;
  },

  length(a: vec3): number {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  },

  distance(a: vec3, b: vec3): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
};

export const vec2 = {
  create(): vec2 {
    return [0, 0];
  },

  fromValues(x: number, y: number): vec2 {
    return [x, y];
  },

  distance(a: vec2, b: vec2): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
  },

  lerp(out: vec2, a: vec2, b: vec2, t: number): vec2 {
    out[0] = a[0] + t * (b[0] - a[0]);
    out[1] = a[1] + t * (b[1] - a[1]);
    return out;
  }
};
