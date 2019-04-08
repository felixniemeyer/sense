const POST_PROCESS_FRAGMENT_SHADER_SOURCE = `
#version 300 es

precision mediump float; 

in vec2 position; 

// The texture.
uniform sampler2D u_currentFrame;

// we need to declare an output for the fragment shader
out vec4 fragColor;

void main()
{
	fragColor = texture(u_currentFrame, (position + vec2(1,1)) * 0.5f);
}
`
