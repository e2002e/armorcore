package iron;

import iron.Ray;

class RayCaster {

	static var VPInv = Mat4.identity();
	static var PInv = Mat4.identity();
	static var VInv = Mat4.identity();

	public static function getRay(inputX: Float, inputY: Float, camera: CameraObject): Ray {
		var start = new Vec4();
		var end = new Vec4();
		getDirection(start, end, inputX, inputY, camera);

		// Find direction from start to end
		end.sub(start);
		end.normalize();
		end.x *= camera.data.raw.far_plane;
		end.y *= camera.data.raw.far_plane;
		end.z *= camera.data.raw.far_plane;

		return new Ray(start, end);
	}

	public static function getDirection(start: Vec4, end: Vec4, inputX: Float, inputY: Float, camera: CameraObject) {
		// Get 3D point form screen coords
		// Set two vectors with opposing z values
		start.x = (inputX / App.w()) * 2.0 - 1.0;
		start.y = -((inputY / App.h()) * 2.0 - 1.0);
		start.z = -1.0;
		end.x = start.x;
		end.y = start.y;
		end.z = 1.0;

		PInv.getInverse(camera.P);
		VInv.getInverse(camera.V);
		VPInv.multmats(VInv, PInv);
		start.applyproj(VPInv);
		end.applyproj(VPInv);
	}

	public static function boxIntersect(transform: Transform, inputX: Float, inputY: Float, camera: CameraObject): Vec4 {
		var ray = getRay(inputX, inputY, camera);

		var t = transform;
		var c = new Vec4(t.worldx(), t.worldy(), t.worldz());
		var s = new Vec4(t.dim.x, t.dim.y, t.dim.z);
		return ray.intersectBox(c, s);
	}

	public static function closestBoxIntersect(transforms: Array<Transform>, inputX: Float, inputY: Float, camera: CameraObject): Transform {
		var intersects: Array<Transform> = [];

		// Get intersects
		for (t in transforms) {
			var intersect = boxIntersect(t, inputX, inputY, camera);
			if (intersect != null) intersects.push(t);
		}

		// No intersects
		if (intersects.length == 0) return null;

		// Get closest intersect
		var closest: Transform = null;
		var minDist = Math.POSITIVE_INFINITY;
		for (t in intersects) {
			var dist = Vec4.distance(t.loc, camera.transform.loc);
			if (dist < minDist) {
				minDist = dist;
				closest = t;
			}
		}

		return closest;
	}

	public static function planeIntersect(normal: Vec4, a: Vec4, inputX: Float, inputY: Float, camera: CameraObject): Vec4 {
		var ray = getRay(inputX, inputY, camera);

		var plane = new Plane();
		plane.set(normal, a);

		return ray.intersectPlane(plane);
	}
}