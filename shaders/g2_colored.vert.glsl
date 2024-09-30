#version 450

uniform mat4 P;

in vec3 pos;
in vec4 col;
out vec4 fragment_color;

void main() {
	gl_Position = P * vec4(pos, 1.0);
	fragment_color = col;
}
