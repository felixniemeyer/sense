const VERTEX_SHADER_SOURCE = `
#version 300 es

layout (location = 0) in uvec2 vert;

uniform sampler2d particlePositions;
uniform sampler2d particleColors;
uniform sampler2d particlePrecalcs;
uniform int particleCountSqrt; 
uniform float width;

out vec4 color; 

struct Particle {
	vec2 A,
	vec2 B, 
	vec2 color, 
	vec2 perpendicular
}
	
Particle getParticle();

void main() {
	vec2 ts;
	ts.x = mod(vert.x, particleCountSqrt);
	ts.y = floor(vert.x / particleCountSqrt);
	Particle p = getParticle(textureIndex);

	vec2 position; 
	
	if(vert.y == 0) {
		position = p.A - perpendicular * width;
	} else if(vert.y == 1) {
		position = p.B - perpendicular * width; 
	} else if(vert.y == 2) {
		position = p.B + perpendicular * width; 
	} else if(vert.y == 3) {
		position = p.A + perpendicular * width; 
	}
	
	color = p.color; 
	gl_Position = vec4(position.x, position.y, 0, 1);
}

Particle getParticle(vec2 ts) {
	Particle p; 
	vec4 positions = texture(particlePositions, ts);
	p.A = positions.xy;
	p.B = positions.zw;	

	p.color = texture(particleColors, ts) 

	vec4 precalcs texture(particlePrecalcs);
	p.perpendicular = precalcs.xy;
	
	return p;
}
`
