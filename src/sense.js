import shaderTools from './webgl2tools.js'
import vsParticleData from './shaders/particle-data.vert'
import fsParticleData from './shaders/particle-data.frag'
import vsDrawParticles from './shaders/draw-particles.vert'
import fsDrawParticles from './shaders/draw-particles.frag'
import vsTexDebugQuad from './shaders/tex-debug-quad.vert'
import fsTexDebugQuad from './shaders/tex-debug-quad.frag'

function main() {
  var frameSize = 768
  var particleCountSqrt = 16
  var particleCount = particleCountSqrt * particleCountSqrt
  var particleDataTextureCount = 4

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
  gl.useProgram(particleDataProgram)
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
  gl.uniform2fv(particleDataUniformLocations.playerPosition, [0, 0]) 
  gl.uniform1f(particleDataUniformLocations.particleSpeedPerSecond, 0.3)

  var dataBuffer
  var particleDataTextures = []
  var particleDataFrameBuffer = []
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
      for(var ti = 0; ti < particleDataTextureCount; ti++) {
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
      particleDataTextures[i] = []
      for(var ti = 0; ti < particleDataTextureCount; ti++) {
        particleDataTextures[i][ti] = createTexture()
      }
      particleDataFrameBuffer[i] = createFramebuffer(particleDataTextures[i]) 
    }
  }
  
  var updateParticleData = (dTime, toBuf) => { 
    var fromBuf = 1 - toBuf

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromBuf][0])
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromBuf][1])
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromBuf][2])

    gl.bindFramebuffer(gl.FRAMEBUFFER, particleDataFrameBuffer[toBuf])
    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1,
      gl.COLOR_ATTACHMENT2,
      gl.COLOR_ATTACHMENT3
    ])
		gl.viewport(0, 0, particleCountSqrt, particleCountSqrt)

    gl.useProgram(particleDataProgram) 
    gl.uniform1f(particleDataUniformLocations.deltaTime, dTime)
  
    gl.bindVertexArray(quadVao); 
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

	var drawParticlesProgram = shaderTools.createProgramFromSources(
    gl, [vsDrawParticles, fsDrawParticles]
  )
  gl.useProgram(drawParticlesProgram) 
  var drawParticlesUniformLocations = getUniformLocations(gl, drawParticlesProgram, [
    'particlePositions', 
    'particleColors', 
    'particlePrecalcs',
    'width',
    'particleCountSqrt'
  ])
  gl.uniform1i(drawParticlesUniformLocations.particlePositions, 0)
  gl.uniform1i(drawParticlesUniformLocations.particleColors, 1)
  gl.uniform1i(drawParticlesUniformLocations.particlePrecalcs, 2)
  gl.uniform1ui(drawParticlesUniformLocations.particleCountSqrt, particleCountSqrt) 
  gl.uniform1f(drawParticlesUniformLocations.width, 1.1 / frameSize) 

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
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromBuf][0]) 
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromBuf][1]) 
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, particleDataTextures[fromBuf][3]) 

    gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
    gl.viewport(0,0,frameSize,frameSize)
    
    gl.useProgram(drawParticlesProgram) 
    gl.bindVertexArray(particleSegmentsVao) 
    
    gl.drawElements(gl.TRIANGLES, 6 * particleCount, gl.UNSIGNED_SHORT, 0)
  }

  var texDebugQuadProgram = shaderTools.createProgramFromSources(
    gl, [vsTexDebugQuad, fsTexDebugQuad]
  )
  gl.useProgram(texDebugQuadProgram)
  var texDebugQuadUniformLocations = getUniformLocations(gl, texDebugQuadProgram, [
    'position', 
    'size',
    'tex'
  ])
    
  gl.uniform1i(texDebugQuadUniformLocations.tex, 0)
  var drawDebugQuad = (glTexture, x, y, size) => {

    gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
    gl.viewport(0,0,frameSize, frameSize)

    gl.useProgram(texDebugQuadProgram) 
    gl.uniform2fv(texDebugQuadUniformLocations.position, [x,y]) 
    gl.uniform1f(texDebugQuadUniformLocations.size, size)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, glTexture)
  
    gl.bindVertexArray(quadVao); 
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  } 

  //init stuff
  gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
  gl.cullFace(gl.FRONT_AND_BACK)

  //gl.enable(gl.BLEND) 
  //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) 


  var dTime, now, then = Date.now()
  var toBuf = 1
  var loop = () =>  {
    now = Date.now()
    dTime = (now - then) / 1000
    then = now
    
    toBuf = 1 - toBuf

    updateParticleData(dTime, toBuf) //debug: schreibt in den screen buffer
    drawParticles(toBuf)
    
    var width = 2 * particleCountSqrt / frameSize
    for(var i = 0; i < particleDataTextureCount; i++) {
      drawDebugQuad(
        particleDataTextures[toBuf][i], 
        -1 + width * (1.5 * i+1), 
        -1 + width, 
        width
      )
    }
    setTimeout(() => { requestAnimationFrame(loop) })
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
