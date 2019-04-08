import shaderTools from './webgl2tools.js'
import vsParticleData from './shaders/particle-data.vert'
import fsParticleData from './shaders/particle-data.frag'
import vsDrawParticles from './shaders/particle.vert'
import fsDrawParticles from './shaders/particle.frag'

function main() {
  var frameSize = 1024
  var particleCountSqrt = 32
  var particleCount = particleCountSqrt * particleCountSqrt
  var particleDataTextureCount = 4

	var canvas = document.getElementById("canvas")
  canvas.setAttribute('height', frameSize) 
  canvas.setAttribute('width', frameSize) 

	var gl = canvas.getContext("webgl2");
	if (!gl) {
		console.error("could not get webgl2 content")
		return
	}

  if(gl.MAX_COLOR_ATTACHMENTS < particleDataTextureCount) {
    console.error(`need at least ${particleDataTextureCount} color attachments`) 
    return 
  }

	// extensions
	var ext = gl.getExtension('EXT_color_buffer_float');
	if (!ext) {
		console.error("need gl extension EXT_color_buffer_float");
		return; 
	}

  var origin = 0
  var flip = () => {
    origin = 1 - origin
  }

  var quadVao = createQuadVao(gl) 

	var particleDataProgram = shaderTools.createProgramFromSources(gl, [vsParticleData, fsParticleData])
  var particleDataUniformLocations = getUniformLocations(gl, particleDataProgram, [
    'particlePositions', 
    'particleColors', 
    'particleVelocities',
    'deltaTime', 
    'preventRespawn', 
    'playerPosition', 
    'particleSpeedPerSecond'
  ])
  gl.uniform1i(particleDataUniformLocations.particlePositions, 0)
  gl.uniform1i(particleDataUniformLocations.particleColors, 1)
  gl.uniform1i(particleDataUniformLocations.particleVelocities, 2)
  gl.uniform1i(particleDataUniformLocations.preventRespawn, 0)
  gl.uniform2f(particleDataUniformLocations.playerPosition, 0, 0)
  gl.uniform1f(particleDataUniformLocations.particleSpeedPerSecond, 0.5)

  var dataBuffer
  var particleDataTextures = []
  var particleDataFrameBuffer = []
  { 
    var createTexture = () => {
      var tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, gl.RGBA32F, gl.FLOAT, 0) 
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex
    }
    var createframeBuffer = (dataTextures) => {
      var fb = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb) 
      for(var ti = 0; ti < particleDataTextureCount; ti++) {
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER, 
          GL_COLOR_ATTACHMENT0 + ti, 
          gl.TEXTURE_2D, 
          dataTextures[i], 
          0)
      }
    }
    for(var i = 0; i < 2; i++) {
      particleDataTextures[i] = []
      for(var ti = 0; ti < particleDataTextureCount; ti++) {
        particleDataTextures[i][ti] = createTexture()
      }
      particleDataFrameBuffer[i] = createFramebuffer(particleDataTextures[i]) 
    }
  }
  
  var updateParticleData = (dTime, toFrameId) => { 
    var fromFrameId = 1 - toFrameId;
    
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromFrameId][0]
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromFrameId][1]
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromFrameId][2]

    gl.bindFramebuffer(gl.FRAMEBUFFER, particleDataFrameBuffer[toFrameId])
		gl.viewport(0, 0, particleCountSqrt, particleCountSqrt);
    gl.useProgram(particleDataProgram) 
    gl.uniform1f(particleDataUniformLocations.deltaTime, dTime)
    //set uniforms (textures etc) 
  
    gl.bindVertexArray(quadVao); 
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

	var drawParticlesProgram = shaderTools.createProgramFromSources(
    gl, [vsDrawParticles, fsDrawParticles]
  )
  var drawParticlesUniformLocations = getUniformLocations(gl, drawParticlesProgram, [
    'particlePositions', 
    'particleColors', 
    'particlePrecalcs',
    'width',
    'particleCountSqrt'
  ])
  //... 3 texturen: positions, color, precalcs
  
  gl.uniform1i(drawParticlesUniformLocations.particlePositions, 0)
  gl.uniform1i(drawParticlesUniformLocations.particleColors, 0)
  gl.uniform1i(drawParticlesUniformLocations.particlePrecalcs, 0)
  gl.uniform1i(drawParticlesUniformLocations.particleCountSqrt, particleCountSqrt) 
  gl.uniform1f(drawParticlesUniformLocations.width, 2.5 / frameSize) 

  var particleSegmentsVao = gl.createVertexArray()
  gl.bindVertexArray(particleSegmentsVao)
  var particleVerticesBuffer = gl.createBuffer()
  var particleVerticesIndexBuffer = gl.createBuffer()
  var vertexData = new Uint16Array(particleCount * 2 * 4) // 2 uint/vertex, 4 vertices/particle
  var indexData = new Uint16Array(particleCount * 2 * 3) // 2 triangles/particle
  for(var i = 0; i < particleCount; i++) {
    for(var v = 0; v < 4; v++) {
      var index = i * 8 + v * 2
      data[index] = i
      data[index+1] = v
    }
    indexData[i*6+0] = i * 4 + 0
    indexData[i*6+0] = i * 4 + 1
    indexData[i*6+0] = i * 4 + 2
    indexData[i*6+0] = i * 4 + 1
    indexData[i*6+0] = i * 4 + 2
    indexData[i*6+0] = i * 4 + 3
  }
  gl.enableVertexAttribArray(0)
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 2, gl.UNSIGNED_SHORT, false, 0, 0)

  gl.enableVertexAttribArray(1) 
  gl.bindBuffer(gl.GL_ELEMENT_ARRAY_BUFFER, particleVerticesIndexBuffer) 
  gl.bufferData(gl.GL_ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW) 

  var drawParticles = () => {
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromFrameId][0]
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromFrameId][1]
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromFrameId][3]

    gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
    gl.viewport(0,0,frameSize,frameSize)
    
    gl.useProgram(drawParticles) 
    gl.bindVertexArray(particleSegmentsVao) 
    
    gl.drawElements(gl.TRIANGLES, particleCount, GL_UNSIGNED_INT, 0)
  }

  var dTime, previousTime = Date.now()
  var toFrame = 1
  while(true) {
    now = Date.now()
    dTime = now - previousTime
    previousTime = now
    updateParticleData(dTime, toFrame) 
    drawParticles()
  }
    

  //evtl fürs debuggen: drawTexturedQuad program

///////////////////////////////////////////////////////
/////////////////// CODE from AEN /////////////////////
///////////////////////////////////////////////////////
  
  var particleProgram = shaderTools.createProgramFromSources(gl, [vsParticle, fsParticle])

	// look up where the vertex data needs to go.
	var positionAttributeLocation = 0;
	gl.bindAttribLocation(fancyProgram, positionAttributeLocation, "a_position");

	// look up uniform locations
	var previousFrameTextureLocation = gl.getUniformLocation(fancyProgram, "u_previousFrame");
	var deformersLocation = gl.getUniformLocation(fancyProgram, "u_deformers");
	var triangleCoordsLocation = gl.getUniformLocation(fancyProgram, "u_triangleCoords");
	var drawTriangleLocation = gl.getUniformLocation(fancyProgram, "u_drawTriangle");
	var touchesLocation = gl.getUniformLocation(fancyProgram, "u_touches");
	var touchCountLocation = gl.getUniformLocation(fancyProgram, "u_touchCount");

	// For rendering the frame texture to the screen
	var postProcessProgram = createProgramFromSources(gl, 
			[vertexShaderSource, postProcessFragmentShaderSource]);

	gl.bindAttribLocation(postProcessProgram, positionAttributeLocation, "a_position");

	var currentFrameTextureLocation = gl.getUniformLocation(postProcessProgram, "u_currentFrame");

	// Create two textures, they get switched after every frame - one to read from, one to write to
	const frameWidth = texsize;
	const frameHeight = texsize;
	const frame = [];
	for(var i = 0; i <= 1; i++){
		frame[i] = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, frame[i]);

		// define size and format of level 0
		const level = 0;
		const internalFormat = gl.RGBA16F;
		const border = 0;
		const format = gl.RGBA;
		const type = gl.HALF_FLOAT;
		const data = null;
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
				frameWidth, frameHeight, border,
				format, type, data);
	}

	// Create and bind the framebuffer
	const fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

	// Get the starting time.
	var then = 0;

	var currentFrameIndex = 0;
	var triangleInterval = 870;
	var timeSinceLastTriangle = triangleInterval, justDrewATriangle = false; 

	requestAnimationFrame(drawScene);

	// Draw the scene.
	function drawScene(time) {
		var deltaTime = time - then;
		then = time;

		timeSinceLastTriangle += deltaTime;

		currentFrameIndex = 1 - currentFrameIndex;
		var previousFrameIndex = 1 - currentFrameIndex;

		{
			//set render target
			gl.bindFramebuffer(gl.FRAMEBUFFER, fb); // we need some kind of internal double buffering - because we read from the previous frame and write the next frame
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frame[currentFrameIndex], 0); //level = 0

			//set texture to write to
			gl.bindTexture(gl.TEXTURE_2D, frame[previousFrameIndex]);

			gl.viewport(0, 0, texsize, texsize);

			gl.useProgram(fancyProgram); 


			if(justDrewATriangle)
			{
				gl.uniform1i(drawTriangleLocation, 0);
				justDrewATriangle = false; 
			} 
			timeSinceLastTriangle += deltaTime;
			if(timeSinceLastTriangle >= triangleInterval || keydown)
			{
				gl.uniform2fv(triangleCoordsLocation, Array.apply(null, Array(6)).map(i => (Math.random()*2-1)))        
					gl.uniform1i(drawTriangleLocation, 1);
				timeSinceLastTriangle = Math.min(triangleInterval, Math.max(0, timeSinceLastTriangle - triangleInterval * (Math.random()*1.8-0.4))); 
				justDrewATriangle = true; 
			}

			gl.uniform1i(previousFrameTextureLocation, 0); //maybe this is only necessary initially
			var deformers = [
				Math.sin(time*0.0001), Math.sin(time*0.00031 + 3),
				Math.sin(time*0.00012+1), Math.sin(time*0.000092+100),
				Math.sin(time*0.000235+0.543), Math.sin(time*0.0004+10)
			].map(x => x*0.9);
			gl.uniform2fv(deformersLocation, deformers)

			gl.uniform3fv(touchesLocation, getTouchesForUniform());
			gl.uniform1i(touchCountLocation, touches.length);

      gl.bindVertexArray(vao); 
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
		{
			//set render target
			gl.bindFramebuffer(gl.FRAMEBUFFER, null); //Screen
			gl.viewport(0, 0, cansize, cansize);

			//set texture to read from
			gl.bindTexture(gl.TEXTURE_2D, frame[currentFrameIndex]);

			gl.clearColor(0, 0, 1, 1);   // clear to blue
			gl.clear(gl.COLOR_BUFFER_BIT);

			//set program and uniforms
			gl.useProgram(postProcessProgram);
			gl.uniform1i(currentFrameTextureLocation, 0);

			gl.bindVertexArray(vao); 
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}

		requestAnimationFrame(drawScene);
	}
}

function createQuadVao(gl) {
  var quadVao = gl.createVertexArray()
  gl.bindVertexArray(quadVao)
  gl.enableVertexAttribArray(0)
  var quadVertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer)
  var data = new Float32Array([
    -1,-1,
		1,-1,
		-1, 1, 
		1, 1
  ]
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  return quadVao
}

function.getUniformLocations(gl, program, uniformNames) {
  var uniformMap = {}
  for(var uName in uniformNames) {
    uniformMap[uName] = gl.getUniformLocation(particleDataProgram, uName)
  }
  return uniformMap
}

main();
