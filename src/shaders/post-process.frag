#version 300 es

precision highp int; 
precision highp float; 
precision highp sampler2D; 

uniform sampler2D frameTexture;
uniform float deltaTime; 

in vec2 ts; 

out vec4 fragColor; 

void main() {
	fragColor = pow(0.85, deltaTime) * texture(frameTexture, ts);
}
