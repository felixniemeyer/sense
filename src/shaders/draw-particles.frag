#version 300 es

precision highp int; 
precision highp float; 

in vec4 color; 

out vec4 fragColor; 

void main() {
	fragColor = color; //vec4(0,1,1,1);
}
