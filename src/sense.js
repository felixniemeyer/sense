import shaderTools from './webgl2tools.js'
import vsParticlePhysics from './shaders/particle-physics.vert'
import fsParticlePhysics from './shaders/particle-physics.frag'
import vsParticleDraw from './shaders/particle-draw.vert'
import fsParticleDraw from './shaders/particle-draw.frag'
import vsTextureDraw from './shaders/texture-draw.vert'
import fsTextureDraw from './shaders/texture-draw.frag'
import vsPostProcess from './shaders/post-process.vert'
import fsPostProcess from './shaders/post-process.frag'

function main() {
  var frameSize = 1024
  var particleCountSqrt = 16
  var particleCount = particleCountSqrt * particleCountSqrt
  var particlePhysicsTextureCount = 4

	var canvas = document.getElementById("canvas")
  canvas.setAttribute('height', frameSize) 
  canvas.setAttribute('width', frameSize) 

	var gl = canvas.getContext("webgl2", {
    preserveDrawingBuffer: true,
//    premultipliedAlpha: false
  });
	if (!gl) {
		console.error("could not get webgl2 content")
		return
	}

  if(gl.MAX_COLOR_ATTACHMENTS < particlePhysicsTextureCount) {
    console.error(`need at least ${particlePhysicsTextureCount} color attachments`) 
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

	var particlePhysicsProgram = shaderTools.createProgramFromSources(gl, [vsParticlePhysics, fsParticlePhysics])
  gl.useProgram(particlePhysicsProgram)
  var particlePhysicsUniformLocations = getUniformLocations(gl, particlePhysicsProgram, [
    'particlePositions', 
    'particleColors', 
    'particleVelocities',
    'deltaTime', 
    'preventRespawn', 
    'playerPosition', 
    'particleSpeedPerSecond'
  ])
  gl.uniform1i(particlePhysicsUniformLocations.particlePositions, 0)
  gl.uniform1i(particlePhysicsUniformLocations.particleColors, 1)
  gl.uniform1i(particlePhysicsUniformLocations.particleVelocities, 2)
  gl.uniform1i(particlePhysicsUniformLocations.preventRespawn, 0)
  gl.uniform2fv(particlePhysicsUniformLocations.playerPosition, [0, 0]) 
  gl.uniform1f(particlePhysicsUniformLocations.particleSpeedPerSecond, 0.3)

  var dataBuffer
  var particlePhysicsTextures = []
  var particlePhysicsFrameBuffer = []
  { 
    var createTexture = () => {
      var tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(
        gl.TEXTURE_2D, 
        0, 
        gl.RGBA32F, 
        particleCountSqrt, 
        particleCountSqrt, 
        0, 
        gl.RGBA,
        gl.FLOAT,
        null
      ) 
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex
    }
    var createFramebuffer = (dataTextures) => {
      var fb = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb) 
      for(var ti = 0; ti < particlePhysicsTextureCount; ti++) {
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER, 
          gl.COLOR_ATTACHMENT0 + ti, 
          gl.TEXTURE_2D, 
          dataTextures[ti], 
          0)
      }
      return fb
    }
    for(var i = 0; i < 2; i++) {
      particlePhysicsTextures[i] = []
      for(var ti = 0; ti < particlePhysicsTextureCount; ti++) {
        particlePhysicsTextures[i][ti] = createTexture()
      }
      particlePhysicsFrameBuffer[i] = createFramebuffer(particlePhysicsTextures[i]) 
    }
  }
  
  var updateParticlePhysics = (dTime, toBuf) => { 
    var fromBuf = 1 - toBuf

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[fromBuf][0])
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[fromBuf][1])
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[fromBuf][2])

    gl.bindFramebuffer(gl.FRAMEBUFFER, particlePhysicsFrameBuffer[toBuf])
    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1,
      gl.COLOR_ATTACHMENT2,
      gl.COLOR_ATTACHMENT3
    ])
		gl.viewport(0, 0, particleCountSqrt, particleCountSqrt)

    gl.useProgram(particlePhysicsProgram) 
    gl.uniform1f(particlePhysicsUniformLocations.deltaTime, dTime)
  
    gl.bindVertexArray(quadVao); 
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

	var particleDrawProgram = shaderTools.createProgramFromSources(
    gl, [vsParticleDraw, fsParticleDraw]
  )
  gl.useProgram(particleDrawProgram) 
  var particleDrawUniformLocations = getUniformLocations(gl, particleDrawProgram, [
    'particlePositions', 
    'particleColors', 
    'particlePrecalcs',
    'halfWidth',
    'halfWidthPx',
    'particleCountSqrt'
  ])
  gl.uniform1i(particleDrawUniformLocations.particlePositions, 0)
  gl.uniform1i(particleDrawUniformLocations.particleColors, 1)
  gl.uniform1i(particleDrawUniformLocations.particlePrecalcs, 2)
  gl.uniform1ui(particleDrawUniformLocations.particleCountSqrt, particleCountSqrt) 
  var halfWidthPx = 2;
  gl.uniform1f(particleDrawUniformLocations.halfWidth, halfWidthPx * 2 / frameSize)
  gl.uniform1f(particleDrawUniformLocations.halfWidthPx, halfWidthPx )

  var frameTexture = []
  var frameBuffer = []
  for(var i = 0; i < 2; i++) {
    frameTexture[i] = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, frameTexture[i]) 
    gl.texImage2D(
      gl.TEXTURE_2D,
      0, 
      gl.RGBA32F, 
      frameSize, 
      frameSize, 
      0, 
      gl.RGBA,
      gl.FLOAT,
      null
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); //TODO: LINEAR!
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    frameBuffer[i] = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer[i]) 
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTexture[i], 0) 
  }

  var particleSegmentsVao = gl.createVertexArray()
  gl.bindVertexArray(particleSegmentsVao)
  var particleVerticesBuffer = gl.createBuffer()
  var particleVerticesIndexBuffer = gl.createBuffer()
  var vertexData = new Uint16Array(particleCount * 2 * 4) // 2 uint/vertex, 4 vertices/particle
  var indexData = new Uint16Array(particleCount * 2 * 3) // 2 triangles/particle
  for(var i = 0; i < particleCount; i++) {
    for(var v = 0; v < 4; v++) {
      var index = i * 8 + v * 2
      vertexData[index] = i
      vertexData[index+1] = v
    }
    indexData[i*6+0] = i * 4 + 0
    indexData[i*6+1] = i * 4 + 1
    indexData[i*6+2] = i * 4 + 2
    indexData[i*6+3] = i * 4 + 2
    indexData[i*6+4] = i * 4 + 3
    indexData[i*6+5] = i * 4 + 0
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, particleVerticesBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW)
  gl.vertexAttribIPointer(0, 2, gl.UNSIGNED_SHORT, 0, 0)
  gl.enableVertexAttribArray(0)

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, particleVerticesIndexBuffer) 
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW) 

  var drawParticles = (fromBuf) => {
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[toBuf][0]) 
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[toBuf][1]) 
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[toBuf][3]) 

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer[toBuf]) 
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null) //render to screen 
    gl.viewport(0,0,frameSize,frameSize)
    
    gl.useProgram(particleDrawProgram) 
    gl.bindVertexArray(particleSegmentsVao) 
    
    gl.enable(gl.BLEND)  
    gl.drawElements(gl.TRIANGLES, 6 * particleCount, gl.UNSIGNED_SHORT, 0)
    gl.disable(gl.BLEND) 
  }

  var textureDrawProgram = shaderTools.createProgramFromSources(
    gl, [vsTextureDraw, fsTextureDraw]
  )
  gl.useProgram(textureDrawProgram)
  var textureDrawUniformLocations = getUniformLocations(gl, textureDrawProgram, [
    'position', 
    'size',
    'tex'
  ])
    
  gl.uniform1i(textureDrawUniformLocations.tex, 0)
  var drawTexture = (glTexture, x, y, size) => {

    gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
    gl.viewport(0,0,frameSize, frameSize)

    gl.useProgram(textureDrawProgram) 
    gl.uniform2fv(textureDrawUniformLocations.position, [x,y]) 
    gl.uniform1f(textureDrawUniformLocations.size, size)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, glTexture)
  
    gl.bindVertexArray(quadVao); 
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  } 

  var postProcessProgram = shaderTools.createProgramFromSources(
    gl, [vsPostProcess, fsPostProcess]
  )
  gl.useProgram(postProcessProgram) 
  var postProcessUniformLocations = getUniformLocations(gl, postProcessProgram, [
    'frameTexture',
    'deltaTime'
  ])
  gl.uniform1i(postProcessUniformLocations.frameTexture, 0)

  var postProcess = (dTime, toBuf) => {
    var fromBuf = 1 - toBuf

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer[toBuf]) 
    gl.viewport(0,0,frameSize, frameSize) 
  
    gl.useProgram(postProcessProgram) 
    gl.uniform1f(postProcessUniformLocations.deltaTime, dTime) 

    gl.activeTexture(gl.TEXTURE0) 
    gl.bindTexture(gl.TEXTURE_2D, frameTexture[fromBuf]) 
  
    gl.bindVertexArray(quadVao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  //init stuff
  gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
  gl.cullFace(gl.FRONT_AND_BACK)

  gl.enable(gl.BLEND) 
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE) 
  gl.disable(gl.BLEND) 


  var dTime, now, then = Date.now()
  var toBuf = 1
  var loop = () =>  {
    now = Date.now()
    dTime = (now - then) / 1000
    then = now
    
    toBuf = 1 - toBuf

    updateParticlePhysics(dTime, toBuf) //debug: schreibt in den screen buffer
    postProcess(dTime, toBuf) 
    drawParticles(toBuf)
    drawTexture(frameTexture[toBuf], 0, 0, 2)
    
    var width = 2 * particleCountSqrt / frameSize
    for(var i = 0; i < particlePhysicsTextureCount; i++) {
      drawTexture(
        particlePhysicsTextures[toBuf][i], 
        -1 + width * (1.5 * i+1), 
        -1 + width, 
        width
      )
    }
    setTimeout(() => { requestAnimationFrame(loop) },50)
  }
  requestAnimationFrame(loop) 
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
  ])
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  return quadVao
}

function getUniformLocations(gl, program, uniformNames) {
  var uniformMap = {}
  console.log(uniformNames) 
  for(var i = 0; i < uniformNames.length; i++) {
    var uName = uniformNames[i] 
    uniformMap[uName] = gl.getUniformLocation(program, uName)
  }
  console.log(uniformMap) 
  return uniformMap
}

main();
