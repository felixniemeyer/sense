#version 300 es

precision highp int; 
precision highp float; 

in float leftRight;
in float alphaFactor; 
in vec4 color; 

out vec4 fragColor; 

void main() {
	float aa = pow(1.0 - abs(leftRight), 1.0/4.0);
	fragColor = vec4(color.rgb, color.a * aa * alphaFactor);
}
