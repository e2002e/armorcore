/// <reference path='./vec4.ts'/>

let _uniforms_mat = mat4_identity();
let _uniforms_mat2 = mat4_identity();
let _uniforms_mat3 = mat3_identity();
let _uniforms_vec = vec4_create();
let _uniforms_vec2 = vec4_create();
let _uniforms_quat = quat_create();

let uniforms_tex_links: (o: object_t, md: material_data_t, s: string)=>image_t = null;
let uniforms_mat4_links: (o: object_t, md: material_data_t, s: string)=>mat4_t = null;
let uniforms_vec4_links: (o: object_t, md: material_data_t, s: string)=>vec4_t = null;
let uniforms_vec3_links: (o: object_t, md: material_data_t, s: string)=>vec3_t = null;
let uniforms_vec2_links: (o: object_t, md: material_data_t, s: string)=>vec2_t = null;
let uniforms_f32_links: (o: object_t, md: material_data_t, s: string)=>f32 = null;
let uniforms_f32_array_links: (o: object_t, md: material_data_t, s: string)=>Float32Array = null;
let uniforms_i32_links: (o: object_t, md: material_data_t, s: string)=>i32 = null;
let uniforms_pos_unpack: f32 = 1.0;
let uniforms_tex_unpack: f32 = 1.0;

function uniforms_set_context_consts(context: shader_context_t, bind_params: string[]) {
	if (context.constants != null) {
		for (let i = 0; i < context.constants.length; ++i) {
			let c = context.constants[i];
			uniforms_set_context_const(context._constants[i], c);
		}
	}

	// Texture context constants
	if (bind_params != null) { // Bind targets
		for (let i = 0; i < Math.floor(bind_params.length / 2); ++i) {
			let pos = i * 2; // bind params = [texture, sampler_id]
			let rt_id = bind_params[pos];
			let sampler_id = bind_params[pos + 1];
			let attach_depth = false; // Attach texture depth if '_' is prepended
			let char = rt_id.charAt(0);
			if (char == "_") {
				attach_depth = true;
				rt_id = rt_id.substring(1);
			}
			let rt = attach_depth ? _render_path_depth_to_render_target.get(rt_id) : render_path_render_targets.get(rt_id);
			uniforms_bind_render_target(rt, context, sampler_id, attach_depth);
		}
	}

	// Texture links
	if (context.texture_units != null) {
		for (let j = 0; j < context.texture_units.length; ++j) {
			let tulink = context.texture_units[j].link;
			if (tulink == null) {
				continue;
			}

			if (tulink.charAt(0) == "$") { // Link to embedded data
				g4_set_tex(context._tex_units[j], scene_embedded.get(tulink.substring(1)));
				g4_set_tex_params(context._tex_units[j], tex_addressing.REPEAT, tex_addressing.REPEAT, tex_filter_t.LINEAR, tex_filter_t.LINEAR, mip_map_filter_t.NONE);
			}
			else if (tulink == "_envmapRadiance") {
				let w = scene_world;
				if (w != null) {
					g4_set_tex(context._tex_units[j], w._radiance);
					g4_set_tex_params(context._tex_units[j], tex_addressing.REPEAT, tex_addressing.REPEAT, tex_filter_t.LINEAR, tex_filter_t.LINEAR, mip_map_filter_t.LINEAR);
				}
			}
			else if (tulink == "_envmap") {
				let w = scene_world;
				if (w != null) {
					g4_set_tex(context._tex_units[j], w._envmap);
					g4_set_tex_params(context._tex_units[j], tex_addressing.REPEAT, tex_addressing.REPEAT, tex_filter_t.LINEAR, tex_filter_t.LINEAR, mip_map_filter_t.NONE);
				}
			}
		}
	}
}

function uniforms_set_obj_consts(context: shader_context_t, object: object_t) {
	if (context.constants != null) {
		for (let i = 0; i < context.constants.length; ++i) {
			let c = context.constants[i];
			uniforms_set_obj_const(object, context._constants[i], c);
		}
	}

	// Texture object constants
	// External
	if (uniforms_tex_links != null) {
		if (context.texture_units != null) {
			for (let j = 0; j < context.texture_units.length; ++j) {
				let tu = context.texture_units[j];
				if (tu.link == null) {
					continue;
				}
				let tu_addr_u = uniforms_get_tex_addressing(tu.addressing_u);
				let tu_addr_v = uniforms_get_tex_addressing(tu.addressing_v);
				let tu_filter_min = uniforms_get_tex_filter(tu.filter_min);
				let tu_filter_mag = uniforms_get_tex_filter(tu.filter_mag);
				let tu_mip_map_filter = uniforms_get_mip_map_filter(tu.mipmap_filter);

				let image = uniforms_tex_links(object, current_material(object), tu.link);
				if (image != null) {
					tu.link.endsWith("_depth") ?
						g4_set_tex_depth(context._tex_units[j], image) :
						g4_set_tex(context._tex_units[j], image);
					g4_set_tex_params(context._tex_units[j], tu_addr_u, tu_addr_v, tu_filter_min, tu_filter_mag, tu_mip_map_filter);
				}
			}
		}
	}
}

function uniforms_bind_render_target(rt: render_target_t, context: shader_context_t, sampler_id: string, attach_depth: bool) {
	if (rt == null) {
		return;
	}

	let tus = context.texture_units;

	for (let j = 0; j < tus.length; ++j) { // Set texture
		if (sampler_id == tus[j].name) {
			let is_image = tus[j].is_image != null && tus[j].is_image;
			let params_set = false;

			if (rt.depth > 1) { // sampler3D
				g4_set_tex_3d_params(context._tex_units[j], tex_addressing.CLAMP, tex_addressing.CLAMP, tex_addressing.CLAMP, tex_filter_t.LINEAR, tex_filter_t.ANISOTROPIC, mip_map_filter_t.LINEAR);
				params_set = true;
			}

			if (is_image) {
				g4_set_image_tex(context._tex_units[j], rt.image); // image2D/3D
				// Multiple voxel volumes, always set params
				g4_set_tex_3d_params(context._tex_units[j], tex_addressing.CLAMP, tex_addressing.CLAMP, tex_addressing.CLAMP, tex_filter_t.LINEAR, tex_filter_t.POINT, mip_map_filter_t.LINEAR);
				params_set = true;
			}
			else if (attach_depth) {
				g4_set_tex_depth(context._tex_units[j], rt.image); // sampler2D
			}
			else {
				g4_set_tex(context._tex_units[j], rt.image); // sampler2D
			}

			if (!params_set && rt.mipmaps != null && rt.mipmaps == true && !is_image) {
				g4_set_tex_params(context._tex_units[j], tex_addressing.CLAMP, tex_addressing.CLAMP, tex_filter_t.LINEAR, tex_filter_t.LINEAR, mip_map_filter_t.LINEAR);
				params_set = true;
			}

			if (!params_set) {
				if (rt.name.startsWith("bloom")) {
					// Use bilinear filter for bloom mips to get correct blur
					g4_set_tex_params(context._tex_units[j], tex_addressing.CLAMP, tex_addressing.CLAMP, tex_filter_t.LINEAR, tex_filter_t.LINEAR, mip_map_filter_t.LINEAR);
					params_set = true;
				}
				else if (attach_depth) {
					g4_set_tex_params(context._tex_units[j], tex_addressing.CLAMP, tex_addressing.CLAMP, tex_filter_t.POINT, tex_filter_t.POINT, mip_map_filter_t.NONE);
					params_set = true;
				}
			}

			if (!params_set) {
				// No filtering when sampling render targets
				let oc = context._override_context;
				let allow_params = oc == null || oc.shared_sampler == null || oc.shared_sampler == sampler_id;
				if (allow_params) {
					let addressing = (oc != null && oc.addressing == "repeat") ? tex_addressing.REPEAT : tex_addressing.CLAMP;
					let filter = (oc != null && oc.filter == "point") ? tex_filter_t.POINT : tex_filter_t.LINEAR;
					g4_set_tex_params(context._tex_units[j], addressing, addressing, filter, filter, mip_map_filter_t.NONE);
				}
				params_set = true;
			}
		}
	}
}

function uniforms_set_context_const(location: kinc_const_loc_t, c: shader_const_t): bool {
	if (c.link == null) {
		return true;
	}

	let camera = scene_camera;
	let light = _render_path_light;

	if (c.type == "mat4") {
		let m: mat4_t = null;
		if (c.link == "_viewMatrix") {
			m = camera.v;
		}
		else if (c.link == "_projectionMatrix") {
			m = camera.p;
		}
		else if (c.link == "_inverseProjectionMatrix") {
			mat4_get_inv(_uniforms_mat, camera.p);
			m = _uniforms_mat;
		}
		else if (c.link == "_viewProjectionMatrix") {
			m = camera.vp;
		}
		else if (c.link == "_inverseViewProjectionMatrix") {
			mat4_set_from(_uniforms_mat, camera.v);
			mat4_mult_mat(_uniforms_mat, camera.p);
			mat4_get_inv(_uniforms_mat, _uniforms_mat);
			m = _uniforms_mat;
		}
		else if (c.link == "_skydomeMatrix") {
			let tr = camera.base.transform;
			vec4_set(_uniforms_vec, transform_world_x(tr), transform_world_y(tr), transform_world_z(tr) - 3.5); // Sky
			let bounds = camera.data.far_plane * 0.95;
			vec4_set(_uniforms_vec2, bounds, bounds, bounds);
			mat4_compose(_uniforms_mat, _uniforms_vec, _uniforms_quat, _uniforms_vec2);
			mat4_mult_mat(_uniforms_mat, camera.v);
			mat4_mult_mat(_uniforms_mat, camera.p);
			m = _uniforms_mat;
		}
		else { // Unknown uniform
			return false;
		}

		g4_set_mat(location, m);
		return true;
	}
	else if (c.type == "vec4") {
		let v: vec4_t = null;
		vec4_set(_uniforms_vec, 0, 0, 0, 0);
		// if (c.link == "") {}
		// else {
			return false;
		// }

		if (v != null) {
			g4_set_float4(location, v.x, v.y, v.z, v.w);
		}
		else {
			g4_set_float4(location, 0, 0, 0, 0);
		}
		return true;
	}
	else if (c.type == "vec3") {
		let v: vec4_t = null;
		vec4_set(_uniforms_vec, 0, 0, 0);

		if (c.link == "_lightDirection") {
			if (light != null) {
				_uniforms_vec = vec4_normalize(light_object_look(light));
				v = _uniforms_vec;
			}
		}
		else if (c.link == "_pointPosition") {
			let point = _render_path_point;
			if (point != null) {
				vec4_set(_uniforms_vec, transform_world_x(point.base.transform), transform_world_y(point.base.transform), transform_world_z(point.base.transform));
				v = _uniforms_vec;
			}
		}
		else if (c.link == "_pointColor") {
			let point = _render_path_point;
			if (point != null) {
				let str = point.base.visible ? point.data.strength : 0.0;
				vec4_set(_uniforms_vec, point.data.color[0] * str, point.data.color[1] * str, point.data.color[2] * str);
				v = _uniforms_vec;
			}
		}
		else if (c.link == "_lightArea0") {
			if (light != null && light.data.size != null) {
				let f2: f32 = 0.5;
				let sx: f32 = light.data.size * f2;
				let sy: f32 = light.data.size_y * f2;
				vec4_set(_uniforms_vec, -sx, sy, 0.0);
				vec4_apply_mat(_uniforms_vec, light.base.transform.world);
				v = _uniforms_vec;
			}
		}
		else if (c.link == "_lightArea1") {
			if (light != null && light.data.size != null) {
				let f2: f32 = 0.5;
				let sx: f32 = light.data.size * f2;
				let sy: f32 = light.data.size_y * f2;
				vec4_set(_uniforms_vec, sx, sy, 0.0);
				vec4_apply_mat(_uniforms_vec, light.base.transform.world);
				v = _uniforms_vec;
			}
		}
		else if (c.link == "_lightArea2") {
			if (light != null && light.data.size != null) {
				let f2: f32 = 0.5;
				let sx: f32 = light.data.size * f2;
				let sy: f32 = light.data.size_y * f2;
				vec4_set(_uniforms_vec, sx, -sy, 0.0);
				vec4_apply_mat(_uniforms_vec, light.base.transform.world);
				v = _uniforms_vec;
			}
		}
		else if (c.link == "_lightArea3") {
			if (light != null && light.data.size != null) {
				let f2: f32 = 0.5;
				let sx: f32 = light.data.size * f2;
				let sy: f32 = light.data.size_y * f2;
				vec4_set(_uniforms_vec, -sx, -sy, 0.0);
				vec4_apply_mat(_uniforms_vec, light.base.transform.world);
				v = _uniforms_vec;
			}
		}
		else if (c.link == "_cameraPosition") {
			vec4_set(_uniforms_vec, transform_world_x(camera.base.transform), transform_world_y(camera.base.transform), transform_world_z(camera.base.transform));
			v = _uniforms_vec;
		}
		else if (c.link == "_cameraLook") {
			_uniforms_vec = vec4_normalize(camera_object_look_world(camera));
			v = _uniforms_vec;
		}
		else {
			return false;
		}

		if (v != null) {
			g4_set_float3(location, v.x, v.y, v.z);
		}
		else {
			g4_set_float3(location, 0.0, 0.0, 0.0);
		}
		return true;
	}
	else if (c.type == "vec2") {
		let v: vec4_t = null;
		vec4_set(_uniforms_vec, 0, 0, 0);

		if (c.link == "_vec2x") {
			v = _uniforms_vec;
			v.x = 1.0;
			v.y = 0.0;
		}
		else if (c.link == "_vec2xInv") {
			v = _uniforms_vec;
			v.x = 1.0 /render_path_current_w;
			v.y = 0.0;
		}
		else if (c.link == "_vec2x2") {
			v = _uniforms_vec;
			v.x = 2.0;
			v.y = 0.0;
		}
		else if (c.link == "_vec2x2Inv") {
			v = _uniforms_vec;
			v.x = 2.0 /render_path_current_w;
			v.y = 0.0;
		}
		else if (c.link == "_vec2y") {
			v = _uniforms_vec;
			v.x = 0.0;
			v.y = 1.0;
		}
		else if (c.link == "_vec2yInv") {
			v = _uniforms_vec;
			v.x = 0.0;
			v.y = 1.0 /render_path_current_h;
		}
		else if (c.link == "_vec2y2") {
			v = _uniforms_vec;
			v.x = 0.0;
			v.y = 2.0;
		}
		else if (c.link == "_vec2y2Inv") {
			v = _uniforms_vec;
			v.x = 0.0;
			v.y = 2.0 /render_path_current_h;
		}
		else if (c.link == "_vec2y3") {
			v = _uniforms_vec;
			v.x = 0.0;
			v.y = 3.0;
		}
		else if (c.link == "_vec2y3Inv") {
			v = _uniforms_vec;
			v.x = 0.0;
			v.y = 3.0 /render_path_current_h;
		}
		else if (c.link == "_screenSize") {
			v = _uniforms_vec;
			v.x = render_path_current_w;
			v.y = render_path_current_h;
		}
		else if (c.link == "_screenSizeInv") {
			v = _uniforms_vec;
			v.x = 1.0 /render_path_current_w;
			v.y = 1.0 /render_path_current_h;
		}
		else if (c.link == "_cameraPlaneProj") {
			let near = camera.data.near_plane;
			let far = camera.data.far_plane;
			v = _uniforms_vec;
			v.x = far / (far - near);
			v.y = (-far * near) / (far - near);
		}
		else {
			return false;
		}

		if (v != null) {
			g4_set_float2(location, v.x, v.y);
		}
		else {
			g4_set_float2(location, 0.0, 0.0);
		}
		return true;
	}
	else if (c.type == "float") {
		let f: f32 = 0.0;

		if (c.link == "_time") {
			f = time_time();
		}
		else if (c.link == "_aspectRatioWindowF") {
			f = app_w() / app_h();
		}
		else {
			return false;
		}

		g4_set_float(location, f);
		return true;
	}
	else if (c.type == "floats") {
		let fa: Float32Array = null;

		if (c.link == "_envmapIrradiance") {
			fa = scene_world == null ? world_data_get_empty_irradiance() : scene_world._irradiance;
		}

		if (fa != null) {
			g4_set_floats(location, fa);
			return true;
		}
	}
	else if (c.type == "int") {
		let i: i32 = 0;

		if (c.link == "_envmapNumMipmaps") {
			let w = scene_world;
			i = w != null ? w.radiance_mipmaps + 1 - 2 : 1; // Include basecolor and exclude 2 scaled mips
		}
		else {
			return false;
		}

		g4_set_int(location, i);
		return true;
	}
	return false;
}

function uniforms_set_obj_const(obj: object_t, loc: kinc_const_loc_t, c: shader_const_t) {
	if (c.link == null) {
		return;
	}

	let camera = scene_camera;
	let light = _render_path_light;

	if (c.type == "mat4") {
		let m: mat4_t = null;

		if (c.link == "_worldMatrix") {
			m = obj.transform.world_unpack;
		}
		else if (c.link == "_inverseWorldMatrix") {
			mat4_get_inv(_uniforms_mat, obj.transform.world_unpack);
			m = _uniforms_mat;
		}
		else if (c.link == "_worldViewProjectionMatrix") {
			mat4_set_from(_uniforms_mat, obj.transform.world_unpack);
			mat4_mult_mat(_uniforms_mat, camera.v);
			mat4_mult_mat(_uniforms_mat, camera.p);
			m = _uniforms_mat;
		}
		else if (c.link == "_worldViewMatrix") {
			mat4_set_from(_uniforms_mat, obj.transform.world_unpack);
			mat4_mult_mat(_uniforms_mat, camera.v);
			m = _uniforms_mat;
		}
		else if (c.link == "_prevWorldViewProjectionMatrix") {
			mat4_set_from(_uniforms_mat, obj.ext.prev_matrix);
			mat4_mult_mat(_uniforms_mat, camera.prev_v);
			// mat4_mult_mat(_uniforms_mat. camera.prev_p);
			mat4_mult_mat(_uniforms_mat, camera.p);
			m = _uniforms_mat;
		}
		///if arm_particles
		else if (c.link == "_particleData") {
			let mo = obj.ext;
			if (mo.particle_owner != null && mo.particle_owner.particle_dystems != null) {
				m = particle_sys_get_data(mo.particle_owner.particle_dystems[mo.particle_index]);
			}
		}
		///end
		else if (uniforms_mat4_links != null) {
			m = uniforms_mat4_links(obj, current_material(obj), c.link);
		}

		if (m == null) {
			return;
		}
		g4_set_mat(loc, m);
	}
	else if (c.type == "mat3") {
		let m: mat3_t = null;

		if (c.link == "_normalMatrix") {
			mat4_get_inv(_uniforms_mat, obj.transform.world);
			mat4_transpose3x3(_uniforms_mat);
			mat3_set_from4(_uniforms_mat3, _uniforms_mat);
			m = _uniforms_mat3;
		}
		else if (c.link == "_viewMatrix3") {
			mat3_set_from4(_uniforms_mat3, camera.v);
			m = _uniforms_mat3;
		}

		if (m == null) {
			return;
		}
		g4_set_mat3(loc, m);
	}
	else if (c.type == "vec4") {
		let v: vec4_t = null;

		if (uniforms_vec4_links != null) {
			v = uniforms_vec4_links(obj, current_material(obj), c.link);
		}

		if (v == null) {
			return;
		}
		g4_set_float4(loc, v.x, v.y, v.z, v.w);
	}
	else if (c.type == "vec3") {
		let v: vec3_t = null;

		if (c.link == "_dim") { // Model space
			let d = obj.transform.dim;
			let s = obj.transform.scale;
			vec4_set(_uniforms_vec, (d.x / s.x), (d.y / s.y), (d.z / s.z));
			v = _uniforms_vec;
		}
		else if (c.link == "_halfDim") { // Model space
			let d = obj.transform.dim;
			let s = obj.transform.scale;
			vec4_set(_uniforms_vec, (d.x / s.x) / 2, (d.y / s.y) / 2, (d.z / s.z) / 2);
			v = _uniforms_vec;
		}
		else if (uniforms_vec3_links != null) {
			v = uniforms_vec3_links(obj, current_material(obj), c.link);
		}

		if (v == null) {
			return;
		}
		g4_set_float3(loc, v.x, v.y, v.z);
	}
	else if (c.type == "vec2") {
		let v: vec2_t = null;

		if (uniforms_vec2_links != null) {
			v = uniforms_vec2_links(obj, current_material(obj), c.link);
		}

		if (v == null) {
			return;
		}
		g4_set_float2(loc, v.x, v.y);
	}
	else if (c.type == "float") {
		let f: f32 = 0.0;

		if (c.link == "_objectInfoIndex") {
			f = obj.uid;
		}
		else if (c.link == "_objectInfoMaterialIndex") {
			f = current_material(obj)._uid;
		}
		else if (c.link == "_objectInfoRandom") {
			f = obj.urandom;
		}
		else if (c.link == "_posUnpack") {
			f = uniforms_pos_unpack;
		}
		else if (c.link == "_texUnpack") {
			f = uniforms_tex_unpack;
		}
		else if (uniforms_f32_links != null) {
			f = uniforms_f32_links(obj, current_material(obj), c.link);
		}

		if (f == null) {
			return;
		}
		g4_set_float(loc, f);
	}
	else if (c.type == "floats") {
		let fa: Float32Array = null;

		if (c.link == "_skinBones") {
			///if arm_skin
			if (obj.animation != null) {
				fa = obj.animation.ext.skin_buffer;
			}
			///end
		}
		else if (uniforms_f32_array_links != null) {
			fa = uniforms_f32_array_links(obj, current_material(obj), c.link);
		}

		if (fa == null) {
			return;
		}
		g4_set_floats(loc, fa);
	}
	else if (c.type == "int") {
		let i: i32 = 0;

		if (c.link == "_uid") {
			i = obj.uid;
		}
		else if (uniforms_i32_links != null) {
			i = uniforms_i32_links(obj, current_material(obj), c.link);
		}

		if (i == null) {
			return;
		}
		g4_set_int(loc, i);
	}
}

function uniforms_set_material_consts(context: shader_context_t, material_context: material_context_t) {
	if (material_context.bind_constants != null) {
		for (let i = 0; i < material_context.bind_constants.length; ++i) {
			let matc = material_context.bind_constants[i];
			let pos = -1;
			for (let i = 0; i < context.constants.length; ++i) {
				if (context.constants[i].name == matc.name) {
					pos = i;
					break;
				}
			}
			if (pos == -1) {
				continue;
			}
			let c = context.constants[pos];

			uniforms_set_material_const(context._constants[pos], c, matc);
		}
	}

	if (material_context._textures != null) {
		for (let i = 0; i < material_context._textures.length; ++i) {
			let mname = material_context.bind_textures[i].name;

			for (let j = 0; j < context._tex_units.length; ++j) {
				let sname = context.texture_units[j].name;
				if (mname == sname) {
					g4_set_tex(context._tex_units[j], material_context._textures[i]);
					// After texture sampler have been assigned, set texture parameters
					material_context_set_tex_params(material_context, i, context, j);
					break;
				}
			}
		}
	}
}

function current_material(object: object_t): material_data_t {
	if (object != null && object.ext != null && object.ext.materials != null) {
		let mo = object.ext;
		return mo.materials[mo.material_index];
	}
	return null;
}

function uniforms_set_material_const(location: kinc_const_loc_t, shader_const: shader_const_t, material_const: bind_const_t) {
	if (shader_const.type == "vec4") {
		g4_set_float4(location, material_const.vec4[0], material_const.vec4[1], material_const.vec4[2], material_const.vec4[3]);
	}
	else if (shader_const.type == "vec3") {
		g4_set_float3(location, material_const.vec3[0], material_const.vec3[1], material_const.vec3[2]);
	}
	else if (shader_const.type == "vec2") {
		g4_set_float2(location, material_const.vec2[0], material_const.vec2[1]);
	}
	else if (shader_const.type == "float") {
		g4_set_float(location,  material_const.float);
	}
	else if (shader_const.type == "bool") {
		g4_set_bool(location, material_const.bool);
	}
	else if (shader_const.type == "int") {
		g4_set_int(location, material_const.int);
	}
}

function uniforms_get_tex_addressing(s: string): tex_addressing {
	if (s == "clamp") {
		return tex_addressing.CLAMP;
	}
	if (s == "mirror") {
		return tex_addressing.MIRROR;
	}
	return tex_addressing.REPEAT;
}

function uniforms_get_tex_filter(s: string): tex_filter_t {
	if (s == "anisotropic") {
		return tex_filter_t.ANISOTROPIC;
	}
	if (s == "point") {
		return tex_filter_t.POINT;
	}
	return tex_filter_t.LINEAR;
}

function uniforms_get_mip_map_filter(s: string): mip_map_filter_t {
	if (s == "linear") {
		return mip_map_filter_t.LINEAR;
	}
	if (s == "point") {
		return mip_map_filter_t.POINT;
	}
	return mip_map_filter_t.NONE;
}
