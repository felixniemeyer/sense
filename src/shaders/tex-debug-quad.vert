#version 300 es

precision highp int; 
precision highp float; 

layout(location = 0)in vec2 vert;

uniform vec2 position;
uniform float size;

out vec2 ts; 

void main() {
	gl_Position = vec4(
		position.x + vert.x * 0.5 * size, 
		position.y + vert.y * 0.5 * size, 
		0, 1
	);
	ts = ( vert + vec2(1,1) ) * 0.5;
} 
