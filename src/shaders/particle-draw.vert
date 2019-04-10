#version 300 es

precision highp int; 
precision highp float; 
precision highp sampler2D;

layout (location = 0) in uvec2 vert;

uniform sampler2D particlePositions;
uniform sampler2D particleColors;
uniform sampler2D particlePrecalcs;
uniform uint particleCountSqrt; 
uniform float halfWidth;
uniform float halfWidthPx;

out vec4 color; 
out float leftRight;

struct Particle {
	vec2 A;
	vec2 B;
	vec4 color;
	vec2 perpendicular;
};
	
Particle getParticle(in vec2 ts);

void main() {
	vec2 ts;
	uint particleId = vert.x;
	uint edge = vert.y;

	uint y = particleId / particleCountSqrt;
	ts.x = float(particleId - particleCountSqrt * y) / float(particleCountSqrt);
	ts.y = float(y) / float(particleCountSqrt);
	Particle p = getParticle(ts);

	vec2 position; 
	
	if(edge == 0u) {
		position = p.A - p.perpendicular * halfWidth;
		leftRight = -halfWidthPx;
	} else if(edge == 1u) {
		position = p.B - p.perpendicular * halfWidth; 
		leftRight = -halfWidthPx;
	} else if(edge == 2u) {
		position = p.B + p.perpendicular * halfWidth; 
		leftRight = halfWidthPx;
	} else if(edge == 3u) {
		position = p.A + p.perpendicular * halfWidth; 
		leftRight = halfWidthPx;
	}

	color = p.color; 
	gl_Position = vec4(position.x, position.y, 0, 1);
}

Particle getParticle(in vec2 ts) {
	Particle p; 
	vec4 positions = texture(particlePositions, ts);
	p.A = positions.xy;
	p.B = positions.zw;	

	p.color = texture(particleColors, ts);

	vec4 precalcs = texture(particlePrecalcs, ts);
	p.perpendicular = precalcs.xy;
	
	return p;
}