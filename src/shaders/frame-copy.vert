const VERTEX_SHADER_SOURCE = 
`#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
out vec2 position;

// all shaders have a main function
void main() {
	// Pass the position
	gl_Position = a_position;
	position = a_position.xy; 
}`
