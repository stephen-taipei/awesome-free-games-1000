/**
 * 3D 數學工具庫 - 踩地雷
 */

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
  }
};

export const vec3 = {
  create(): vec3 {
    return [0, 0, 0];
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
  }
};
