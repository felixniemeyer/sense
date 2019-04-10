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
bool particleTurnsTooFast(in Particle p); 
float random(in Particle p, in float v1, in float v2, in float v3, in float from, in float to);
void disableParticle(inout Particle p); 
void respawnParticle(inout Particle p); 
void writeParticle(in Particle p);


void main()
{
	Particle p = getParticle(); 

	if(particleOutOfView(p) || particleTooDark(p) || particleTurnsTooFast(p)) {
		if(preventRespawn) {
			disableParticle(p);
			writeParticle(p);
			return;
		} else {
			respawnParticle(p);
		}
	} 
	
	vec2 newPos = p.B + p.velocity * deltaTime;

	float r = p.rotation * deltaTime; 
	mat2 Rotation = mat2(
		cos(r), -sin(r), 
		sin(r), cos(r)
	);
	p.velocity = Rotation * p.velocity;

	p.rotation += p.rotationAdd * deltaTime;

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

bool particleTurnsTooFast(in Particle p) {
	return abs(p.rotation) > 2.0 * PI;
}

void disableParticle(inout Particle p) {
	p.color = vec4(0,0,0,0);
	p.velocity = vec2(0,0);
}

void respawnParticle(inout Particle p) {
	float rotationF = random(p, 1.23, 98.078, 29.102, -1.0, 1.0);
	float speedF = random(p, 2.19, 0.313, 81.23, 0.1, 1.0);
	float direction = random(p, 1.22, 2.11, 3.0, 0.0, 2.0*PI);
	float red = random(p, 1.123, 2.89, 89.21, 0.4, 1.0); 

	p.velocity = vec2(cos(direction), sin(direction)) * particleSpeedPerSecond * speedF;  
	p.A = vec2(0, 0);
	p.B = p.A;
	p.color = vec4(red,0.5,0.9,1);
	p.rotation = rotationF * 2.0 * PI / 10.0; //1 rotation per 10 seconds
	p.rotationAdd = -p.rotation;
}

float random(in Particle p, in float v1, in float v2, in float v3, in float from, in float to) {
	float range = to - from; 
	return mod(
		v1 * ts.y + 
		v1 * 72.3123 * ts.x +
		v2 * abs(p.B.x) +
		v3 * abs(p.B.y),
		range) + from;
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
