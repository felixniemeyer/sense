#version 300 es

precision highp int; 
precision highp float; 

in float leftRight;
in float alphaFactor; 
in vec4 color; 

uniform float halfWidthPx;

out vec4 fragColor; 

void main() {
	float aa = 1.0;
	if(abs(leftRight) > halfWidthPx - 1.0) {
		aa = halfWidthPx - abs(leftRight); 
	}
	aa *= alphaFactor;
	fragColor = vec4(color.rgb, color.a * aa);
}
