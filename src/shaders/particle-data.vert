const VERTEX_SHADER_SOURCE = `
#version 300 es

layout(location = 0)in vec2 vert;

out vec2 position; 

void main() {
	gl_Position = vec4(vert.x, vert.y, 0, 1); 
	position = ( vert + vec2(1,1) ) * 0.5;
} 
`
