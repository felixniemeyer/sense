#version 300 es

precision highp int; 
precision highp float; 
precision highp sampler2D;

const float PI = 3.1415926535897932384626433832795;

in vec2 ts; 

uniform sampler2D particlePositions;
uniform sampler2D particleColors;
uniform sampler2D particleVelocities;
uniform float deltaTime; 
uniform bool preventRespawn;
uniform vec2 playerPosition;
uniform float particleSpeedPerSecond;

layout(location = 0) out vec4 partPosOut;
layout(location = 1) out vec4 partColOut; 
layout(location = 2) out vec4 partVelOut; 
layout(location = 3) out vec4 partCalOut; 

struct Particle {
	vec2 A;
	vec2 B;
	vec2 velocity;
	float rotation;
	float rotationAdd;
	vec4 color;
};

Particle getParticle();
bool particleOutOfView(in Particle p); 
bool particleTooDark(in Particle p); 
void disableParticle(inout Particle p); 
void respawnParticle(inout Particle p); 
void writeParticle(in Particle p);


void main()
{
	Particle p = getParticle(); 

	if(particleOutOfView(p) || particleTooDark(p)) {
		if(preventRespawn) {
			disableParticle(p);
			writeParticle(p);
			return;
		} else {
			respawnParticle(p);
		}
	} 
	
	//TODO: update velocity
	vec2 newPos = p.B + p.velocity * deltaTime;

	//TODO: check collision, mirror velocity, set position, decrement rgba

	p.A = p.B;
	p.B = newPos;
	
	writeParticle(p);
}

Particle getParticle() {
	Particle p;

	vec4 positions = texture(particlePositions, ts);
	p.A = positions.xy;
	p.B = positions.zw;

	p.color = texture(particleColors, ts);

	vec4 velocity = texture(particleVelocities, ts);
	p.velocity = velocity.xy;
	p.rotation = velocity.z;
	p.rotationAdd = velocity.w;
	
	return p;
}

bool particleOutOfView(in Particle p) {
	if(	p.B.x < playerPosition.x - 1.0 ||
		p.B.x > playerPosition.x + 1.0 ||
		p.B.y < playerPosition.y - 1.0 ||
		p.B.y > playerPosition.y + 1.0 ) return true;
	return false;
}

bool particleTooDark(in Particle p) {
	return p.color.a < 0.1;
}

void disableParticle(inout Particle p) {
	p.color = vec4(0,0,0,0);
	p.velocity = vec2(0,0);
}

void respawnParticle(inout Particle p) {
	float direction = mod(1.7 * abs(p.B.x) + 12.35 * ts.y + 7.9 * abs(p.B.y) + 5.321 * ts.x, 2.0*PI);
	p.velocity = vec2(cos(direction), sin(direction)) * particleSpeedPerSecond; 
	p.A = vec2(0, 0);
	p.B = p.A;
	p.color = vec4(1,0,1,1);
	p.rotation = 0.0;
	p.rotationAdd = 0.0;
}

void writeParticle(in Particle p) {
	partPosOut.xy = p.A;
	partPosOut.zw = p.B;

	partColOut = p.color;

	partVelOut = vec4(p.velocity.x, p.velocity.y, p.rotation, p.rotationAdd);

	vec2 perpendicular = vec2(p.velocity.y, - p.velocity.x);
	float l = length(perpendicular);
	if(l == 0.0) {
		perpendicular = vec2(0,0);
	} else {
		perpendicular = perpendicular / l; 
	}
	partCalOut.xy = perpendicular;
}
