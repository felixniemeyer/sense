#version 300 es

precision highp int; 
precision highp float; 

layout(location = 0)in vec2 vert;

out vec2 ts; 

void main() {
	gl_Position = vec4(vert.x, vert.y, 0, 1); 
	ts = ( vert + vec2(1,1) ) * 0.5;
} 
