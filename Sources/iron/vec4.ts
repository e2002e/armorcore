
class vec4_t {
	x: f32;
	y: f32;
	z: f32;
	w: f32;
}

function vec4_create(x: f32 = 0.0, y: f32 = 0.0, z: f32 = 0.0, w: f32 = 1.0): vec4_t {
	let self = new vec4_t();
	self.x = x;
	self.y = y;
	self.z = z;
	self.w = w;
	return self;
}

function vec4_dist(v1: vec4_t, v2: vec4_t): f32 {
	return vec4_dist_f(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
}

function vec4_dist_f(v1x: f32, v1y: f32, v1z: f32, v2x: f32, v2y: f32, v2z: f32): f32 {
	let vx = v1x - v2x;
	let vy = v1y - v2y;
	let vz = v1z - v2z;
	return Math.sqrt(vx * vx + vy * vy + vz * vz);
}

function vec4_x_axis(): vec4_t {
	return vec4_create(1.0, 0.0, 0.0);
}

function vec4_y_axis(): vec4_t {
	return vec4_create(0.0, 1.0, 0.0);
}

function vec4_z_axis(): vec4_t {
	return vec4_create(0.0, 0.0, 1.0);
}

function vec4_cross(self: vec4_t, v: vec4_t): vec4_t {
	let ax = self.x;
	let ay = self.y;
	let az = self.z;
	let vx = v.x;
	let vy = v.y;
	let vz = v.z;
	self.x = ay * vz - az * vy;
	self.y = az * vx - ax * vz;
	self.z = ax * vy - ay * vx;
	return self;
}

function vec4_cross_vecs(self: vec4_t, a: vec4_t, b: vec4_t): vec4_t {
	let ax = a.x;
	let ay = a.y;
	let az = a.z;
	let bx = b.x;
	let by = b.y;
	let bz = b.z;
	self.x = ay * bz - az * by;
	self.y = az * bx - ax * bz;
	self.z = ax * by - ay * bx;
	return self;
}

function vec4_set(self: vec4_t, x: f32, y: f32, z: f32, w: f32 = 1.0): vec4_t {
	self.x = x;
	self.y = y;
	self.z = z;
	self.w = w;
	return self;
}

function vec4_add(self: vec4_t, v: vec4_t): vec4_t {
	self.x += v.x;
	self.y += v.y;
	self.z += v.z;
	return self;
}

function vec4_add_f(self: vec4_t, x: f32, y: f32, z: f32): vec4_t {
	self.x += x;
	self.y += y;
	self.z += z;
	return self;
}

function vec4_add_vecs(self: vec4_t, a: vec4_t, b: vec4_t): vec4_t {
	self.x = a.x + b.x;
	self.y = a.y + b.y;
	self.z = a.z + b.z;
	return self;
}

function vec4_sub_vecs(self: vec4_t, a: vec4_t, b: vec4_t): vec4_t {
	self.x = a.x - b.x;
	self.y = a.y - b.y;
	self.z = a.z - b.z;
	return self;
}

function vec4_normalize(self: vec4_t): vec4_t {
	let n = vec4_len(self);
	if (n > 0.0) {
		let invN = 1.0 / n;
		self.x *= invN;
		self.y *= invN;
		self.z *= invN;
	}
	return self;
}

function vec4_mult(self: vec4_t, f: f32): vec4_t {
	self.x *= f;
	self.y *= f;
	self.z *= f;
	return self;
}

function vec4_dot(self: vec4_t, v: vec4_t): f32 {
	return self.x * v.x + self.y * v.y + self.z * v.z;
}

function vec4_set_from(self: vec4_t, v: vec4_t): vec4_t {
	self.x = v.x;
	self.y = v.y;
	self.z = v.z;
	self.w = v.w;
	return self;
}

function vec4_clone(self: vec4_t): vec4_t {
	return vec4_create(self.x, self.y, self.z, self.w);
}

function vec4_lerp(self: vec4_t, from: vec4_t, to: vec4_t, s: f32): vec4_t {
	self.x = from.x + (to.x - from.x) * s;
	self.y = from.y + (to.y - from.y) * s;
	self.z = from.z + (to.z - from.z) * s;
	return self;
}

function vec4_apply_proj(self: vec4_t, m: mat4_t): vec4_t {
	let x = self.x;
	let y = self.y;
	let z = self.z;
	let d = 1.0 / (m._03 * x + m._13 * y + m._23 * z + m._33); // Perspective divide
	self.x = (m._00 * x + m._10 * y + m._20 * z + m._30) * d;
	self.y = (m._01 * x + m._11 * y + m._21 * z + m._31) * d;
	self.z = (m._02 * x + m._12 * y + m._22 * z + m._32) * d;
	return self;
}

function vec4_apply_mat(self: vec4_t, m: mat4_t): vec4_t {
	let x = self.x;
	let y = self.y;
	let z = self.z;
	self.x = m._00 * x + m._10 * y + m._20 * z + m._30;
	self.y = m._01 * x + m._11 * y + m._21 * z + m._31;
	self.z = m._02 * x + m._12 * y + m._22 * z + m._32;
	return self;
}

function vec4_apply_mat4(self: vec4_t, m: mat4_t): vec4_t {
	let x = self.x;
	let y = self.y;
	let z = self.z;
	let w = self.w;
	self.x = m._00 * x + m._10 * y + m._20 * z + m._30 * w;
	self.y = m._01 * x + m._11 * y + m._21 * z + m._31 * w;
	self.z = m._02 * x + m._12 * y + m._22 * z + m._32 * w;
	self.w = m._03 * x + m._13 * y + m._23 * z + m._33 * w;
	return self;
}

function vec4_apply_quat(self: vec4_t, q: quat_t): vec4_t {
	let ix = q.w * self.x + q.y * self.z - q.z * self.y;
	let iy = q.w * self.y + q.z * self.x - q.x * self.z;
	let iz = q.w * self.z + q.x * self.y - q.y * self.x;
	let iw = -q.x * self.x - q.y * self.y - q.z * self.z;
	self.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
	self.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
	self.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
	return self;
}

function vec4_len(self: vec4_t): f32 {
	return Math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z);
}

function vec4_sub(self: vec4_t, v: vec4_t): vec4_t {
	self.x -= v.x;
	self.y -= v.y;
	self.z -= v.z;
	return self;
}

function vec4_dist_to(self: vec4_t, p: vec4_t): f32 {
	return Math.sqrt((p.x - self.x) * (p.x - self.x) + (p.y - self.y) * (p.y - self.y) + (p.z - self.z) * (p.z - self.z));
}

function vec4_reflect(self: vec4_t, n: vec4_t): vec4_t {
	let d = 2 * vec4_dot(self, n);
	self.x = self.x - d * n.x;
	self.y = self.y - d * n.y;
	self.z = self.z - d * n.z;
	return self;
}