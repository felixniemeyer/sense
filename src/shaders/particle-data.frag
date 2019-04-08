const POST_PROCESS_FRAGMENT_SHADER_SOURCE = `
#version 300 es

const float PI = 3.1415926535897932384626433832795;

in vec2 ts; 

uniform sampler2D particlePositions;
uniform sampler2D particleColors;
uniform sampler2D particleVelocities;
uniform float deltaTime; 
uniform bool preventRespawn = false;
uniform vec2 playerPosition = vec2(0,0); //will be an uniform later on
uniform float particleSpeedPerSecond = 0.5; //will be an uniform later on

out vec4 fragColor[4];

struct Particle {
	vec2 pA,
	vec2 pB,
	vec2 velocity, 
	float rotation,
	float rotationAdd,
	vec4 color, 
}

Particle getParticle();
bool particleOutOfView(Particle p); 
bool particleTooDark(Particle p); 
Particle disableParticle(inout Particle p); 
Particle respawnParticle(inout Particle p); 
void writeParticle(Particle p);


void main()
{
	Particle p = getParticle(); 

	if(particleOutOfView(p) || particleTooDark(p)) {
		if(preventRespawn) {
			disableParticle(p);
			writeParticle(p);
			return;
		} else {
			respawnParticle(newParticle();
		}
	} 
	
	// update velocity
	vec2 newPos = p.position + p.velocity
	// check collision, mirror velocity, set position, decrement rgba

	p.pA = p.pB;
	p.pB = newPos;
	
	writeParticle(p) 
}
`
Particle getParticle() {
	Particle p;

	vec4 particlePosition = texture(particlePositions, ts);
	p.pA = particlePositions.xy;
	p.pB = particlePositions.yw;

	p.color = texture(particleColors, ts);

	vec4 particleVelocity = texture(particleVelocities, ts);
	p.velocity = particleVelocity.xy;
	p.rotation = particleVelocity.z;
	p.rotationAdd = particleVelocity.w;
	
	return p;
}

bool particleOutOfView(Particle p) {
	if(	p.position.x < playerPosition.x - 1 ||
		p.position.x > playerPosition.x + 1 ||
		p.position.y < playerPosition.y - 1 ||
		p.position.y > playerPosition.y + 1 ) return true;
	return false;
}

bool particleTooDark(Particle p) {
	return p.color.a < 0.1;
}

void disableParticle(inout Particle p) {
	p.rgba = vec4(0,0,0,0);
	p.velocity = vec2(0,0);
}

void respawnParticle(inout Particle p) {
	float direction = mod(97 * abs(p.pB.x) + 12.35 * ts.y + 79 * abs(p.pB.y) + 5.321 * ts.x, PI);
	p.velocity = vec2(cos(direction), sin(direction)) * particleSpeedPerSecond; 
	p.pA = vec2(0,0);
	p.pB = p.pA;
	p.rotation = 0;
	p.rotationAdd = 0;
}

void writeParticle(Particle p) {
	fragColor[0].xy = p.pA;
	fragColor[0].zw = p.pB;
	fragColor[1] = p.rgba;
	fragColor[2] = vec4(p.velocity.x, p.velocity.y, p.rotation, p.rotation);

	vec2 perpendicular = vec2(p.pB.y - p.pA.y, p.pA.x - p.pB.x)
	float l = length(perpendicular)
	if(l == 0) {
		perpendicular = vec2(0,0);
	} else {
		perpendicular = perpendicular / length; 
	}
	fragColor[3].xy = perpendicular;
}
