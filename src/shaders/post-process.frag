#version 300 es

precision highp int; 
precision highp float; 
precision highp sampler2D; 

uniform sampler2D frameTexture;
uniform float decay;
uniform float dTime; 
uniform float decayCircleFactor; 
uniform vec2 shift; 

in vec2 ts; 

out vec4 fragColor; 

void main() {
	float d = length(ts - vec2(0.5,0.5)) * 2.0;
	d = 1.0 - (1.0 / (1.0 - min(d, 1.0) + decayCircleFactor)) * decayCircleFactor;
	fragColor = pow(d * decay, dTime) * texture(frameTexture, ts + shift);
}
