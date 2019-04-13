#version 300 es

precision highp int; 
precision highp float; 
precision highp sampler2D;

const float PI = 3.1415926535897932384626433832795;

in vec2 ts; 

uniform sampler2D particlePositions;
uniform sampler2D particleColors;
uniform sampler2D particleVelocities;
uniform sampler2D particlePerpendiculars; 
uniform sampler2D map; 
uniform vec2 shift; 
uniform float dTime; 
uniform bool preventRespawn;
uniform vec2 playerPosition;
uniform float particleSpeedPerSecond;
uniform int mode;
uniform float tileSize; 

const int maxIntersectionChecks = 2 * 10; /* explanation 
	2: x and y intersections
	10: 1 / tileSize, needs to be updated manually!
*/

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
	vec2 perpendicular;
};

Particle getParticle();
bool particleOutOfView(in Particle p); 
bool particleTooDark(in Particle p); 
bool particleTurnsTooFast(in Particle p); 
float random(in Particle p, in float v1, in float v2, in float v3, in float from, in float to);
void disableParticle(inout Particle p); 
void respawnParticle(inout Particle p); 
void mapCollisionCheck(inout Particle p, inout vec2 newPos);
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
	
	//position
	vec2 newPos = p.B + p.velocity * dTime;

	//TODO: check collision, mirror velocity, set position, decrement rgba
	mapCollisionCheck(p, newPos);

	//velocity
	float r = p.rotation * dTime; 
	mat2 Rotation = mat2(
		cos(r), -sin(r), 
		sin(r), cos(r)
	);
	p.velocity = Rotation * p.velocity;

	//rotation
	p.rotation += p.rotationAdd * dTime;

	p.A = p.B - shift;
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

	p.perpendicular = texture(particlePerpendiculars, ts).xy;
	
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
	return abs(p.rotation) > 1.5* PI;
}

void disableParticle(inout Particle p) {
	p.color = vec4(0,0,0,0);
	p.velocity = vec2(0,0);
}

void respawnParticle(inout Particle p) {

	if(mode == 0) { //menu
		float rotationF = random(p, 1.23, 98.078, 29.102, -1.0, 1.0);
		rotationF = pow(rotationF, 3.0); //less quick turners
		p.rotation = rotationF * 2.0 * PI / 10.0; //1 rotation per 10 seconds
	} else if(mode == 1) { //game
		p.rotation = 0.0;
	}
	p.rotationAdd = - 0.5 * p.rotation;

	if(mode == 0) {
		float red = random(p, 1.123, 2.89, 89.21, 0.4, 1.0); 
		p.color = vec4(red,0.5,0.9,1);
	} else {
		p.color = vec4(1,1,1,1);
	}

	float direction = random(p, 1.22, 2.11, 3.0, 0.0, 2.0*PI);
	float speed = particleSpeedPerSecond;
	if(mode == 0) {
		speed *= random(p, 2.19, 0.313, 81.23, 0.3, 1.0);
	}
	p.velocity = vec2(cos(direction), sin(direction)) * speed;  

	p.A = playerPosition;
	p.B = p.A;

	p.perpendicular = vec2(p.velocity.y, -p.velocity.x) / speed;
}

float random(in Particle p, in float v1, in float v2, in float v3, in float from, in float to) {
	float range = to - from; 
	return mod( range * (
			v1 * ts.y + 
			v1 * 72.3123 * ts.x +
			v2 * abs(p.B.x) +
			v3 * abs(p.B.y) 
		),
		range) + from;
}

bool mayBounce(
	in int axis, 
	in vec2 tileIndex, 
	in vec2 v, 
	inout Particle p, 
	inout vec2 newPos, 
	inout vec2 prevPos,
	in vec2 unitsToLine ) 
{
	vec2 wallTileIndex = tileIndex; 
	wallTileIndex[axis] += sign(v[axis]); 
	vec4 tileValue = texture(map, wallTileIndex / 256.0 + 0.5); // texture not readable, obwohl es ok ausguckt

	float units;

	if( tileValue.a == 1.0) { // TRY: == 1.0
		p.velocity[axis] = - p.velocity[axis];
		units = (v[axis] * unitsToLine[axis] - sign(v[axis]) * tileSize / 100.0) / v[axis]; // das erste produkt sollte positiv sein, damit bleibt 
		// p.color = tileValue.rgba;
		newPos = newPos + v[axis] * v;
		return true;
	} else {
		units = (v[axis] * unitsToLine[axis] + sign(v[axis]) * tileSize / 100.0) / v[axis]; // das erste produkt sollte positiv sein, damit bleibt 
		prevPos = prevPos + v[axis] * v;
		return false; 
	}
}

void mapCollisionCheck(inout Particle p, inout vec2 newPos) {
	vec2 prevPos = p.B; 
	vec2 v;
	vec2 nextLineIndex;
	vec2 unitsToLine;
	vec2 tileIndex; 
	float tile; 
	for(int i = 0;  i < maxIntersectionChecks; i++) {
		v = newPos - prevPos;
		tileIndex = floor(prevPos / tileSize);
		nextLineIndex = tileIndex + (sign(v) + vec2(1,1)) * 0.5;
		unitsToLine = (nextLineIndex * tileSize - prevPos) / v; 

		if(unitsToLine.x >= 0.0 && unitsToLine.x <= 1.0) {
			if(unitsToLine.y >= 0.0 && unitsToLine.y <= 1.0) {
				if(unitsToLine.x < unitsToLine.y) {
					if(mayBounce(0, tileIndex, v, p, newPos, prevPos, unitsToLine)) {
						return;
					}
				} else {
					if(mayBounce(1, tileIndex, v, p, newPos, prevPos, unitsToLine)) {
						return;
					}
				}
			} else {
				if(mayBounce(0, tileIndex, v, p, newPos, prevPos, unitsToLine)) {
					return;
				}
			}
		} else if(unitsToLine.y >= 0.0 && unitsToLine.y <= 1.0) {
			if(mayBounce(1, tileIndex, v, p, newPos, prevPos, unitsToLine)) {
				return;
			}
		} else {
			return; // no intersections between p.B and newPos
		}
	}
}

void writeParticle(in Particle p) {
	partPosOut.xy = p.A;
	partPosOut.zw = p.B;

	partColOut = p.color;

	partVelOut = vec4(p.velocity.x, p.velocity.y, p.rotation, p.rotationAdd);

	vec2 nextPerpendicular = vec2(p.velocity.y, - p.velocity.x);
	float l = length(nextPerpendicular);
	if(l == 0.0) {
		nextPerpendicular = vec2(0,0);
	} else {
		nextPerpendicular = nextPerpendicular / l; 
	}
	partCalOut = vec4(nextPerpendicular, p.perpendicular);
}
