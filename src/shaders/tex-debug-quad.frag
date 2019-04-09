#version 300 es

precision highp int; 
precision highp float; 
precision highp sampler2D; 

uniform sampler2D tex;

in vec2 ts; 

out vec4 fragColor; 

void main() {
	fragColor = texture(tex, ts);
}
