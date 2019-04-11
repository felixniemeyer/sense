import shaderTools from './webgl2tools.js'
import GamePlay from './game-play.js'
import vsParticlePhysics from './shaders/particle-physics.vert'
import fsParticlePhysics from './shaders/particle-physics.frag'
import vsParticleDraw from './shaders/particle-draw.vert'
import fsParticleDraw from './shaders/particle-draw.frag'
import vsTextureDraw from './shaders/texture-draw.vert'
import fsTextureDraw from './shaders/texture-draw.frag'
import vsPostProcess from './shaders/post-process.vert'
import fsPostProcess from './shaders/post-process.frag'

import map_skull from './maps/skull.png'

function main(res) {
  console.log(res.map) 

  //Params to play with
  var frameSize = 1024
  var particleCountSqrt = 16
  var particleCount = particleCountSqrt * particleCountSqrt //leave this as it is
  var halfWidthPx = 1.8
  var particleSpeed = 0.5
  var rayDecay = 0.9
  var rayDecayCircleFactor = 0.1


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
  var ext = gl.getExtension('OES_texture_float_linear');
	if (!ext) {
		console.error("need gl extension OES_texture_float_linear");
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
    'dTime', 
    'preventRespawn', 
    'playerPosition', 
    'cameraPosition',
    'particleSpeedPerSecond',
    'mode'
  ])
  gl.uniform1i(particlePhysicsUniformLocations.particlePositions, 0)
  gl.uniform1i(particlePhysicsUniformLocations.particleColors, 1)
  gl.uniform1i(particlePhysicsUniformLocations.particleVelocities, 2)
  var particleEmitting = 0
  gl.uniform1i(particlePhysicsUniformLocations.preventRespawn, particleEmitting)
  gl.uniform2fv(particlePhysicsUniformLocations.playerPosition, [0, 0]) 
  gl.uniform2fv(particlePhysicsUniformLocations.cameraPosition, [0, 0])
  gl.uniform1f(particlePhysicsUniformLocations.particleSpeedPerSecond, particleSpeed)
  gl.uniform1i(particlePhysicsUniformLocations.mode, 1)

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
    gl.uniform1f(particlePhysicsUniformLocations.dTime, dTime)
    gl.uniform2fv(particlePhysicsUniformLocations.playerPosition, gamePlay.getPlayerPosition()) 
    var newEmitting = gamePlay.getEmitting() ? 1 : 0
    if(newEmitting !== particleEmitting) {
      particleEmitting = newEmitting
      gl.uniform1i(particlePhysicsUniformLocations.preventRespawn, !particleEmitting) 
    }
  
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
    'particleCountSqrt',
    'halfWidth',
    'halfWidthPx',
    'playerPosition',
    'decay',
    'dTime',
    'decayCircleFactor',
    'shift'
  ])
  // const
  gl.uniform1i(particleDrawUniformLocations.particlePositions, 0)
  gl.uniform1i(particleDrawUniformLocations.particleColors, 1)
  gl.uniform1i(particleDrawUniformLocations.particlePrecalcs, 2)
  gl.uniform1ui(particleDrawUniformLocations.particleCountSqrt, particleCountSqrt) 
  gl.uniform1f(particleDrawUniformLocations.halfWidth, halfWidthPx * 2 / frameSize)
  gl.uniform1f(particleDrawUniformLocations.halfWidthPx, halfWidthPx )
  gl.uniform1f(particleDrawUniformLocations.decay, rayDecay)
  gl.uniform1f(particleDrawUniformLocations.decayCircleFactor, rayDecayCircleFactor)
  // dynamic 
  gl.uniform1f(particleDrawUniformLocations.dTime, 0)
  gl.uniform2fv(particleDrawUniformLocations.playerPosition, [0,0])
  gl.uniform2fv(particleDrawUniformLocations.shift, [0,0])

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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //TODO: LINEAR!
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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

  var drawParticles = (dTime, fromBuf) => {
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
    gl.uniform2fv(particleDrawUniformLocations.playerPosition, gamePlay.getPlayerPosition()) 
    gl.uniform1f(particleDrawUniformLocations.dTime, dTime)
    gl.uniform2fv(particleDrawUniformLocations.shift, gamePlay.getPlayerPositionShift())

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
    'decay',
    'dTime',
    'decayCircleFactor',
    'shift'
  ])
  gl.uniform1i(postProcessUniformLocations.frameTexture, 0)
  gl.uniform1f(postProcessUniformLocations.decay, rayDecay) 
  gl.uniform1f(postProcessUniformLocations.decayCircleFactor, rayDecayCircleFactor) 
  gl.uniform2fv(postProcessUniformLocations.shift, [0,0])

  var postProcess = (dTime, toBuf) => {
    var fromBuf = 1 - toBuf

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer[toBuf]) 
    gl.viewport(0,0,frameSize, frameSize) 
  
    gl.useProgram(postProcessProgram) 
    gl.uniform1f(postProcessUniformLocations.dTime, dTime) 
    gl.uniform2fv(postProcessUniformLocations.shift, gamePlay.getPlayerPositionShift())

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

  var gamePlay = new GamePlay()

  var dTime, now, then = Date.now()
  var toBuf = 1
  var loop = () =>  {
    now = Date.now()
    dTime = (now - then) / 1000
    then = now
    
    toBuf = 1 - toBuf

    updateParticlePhysics(dTime, toBuf) //debug: schreibt in den screen buffer
    postProcess(dTime, toBuf) 
    drawParticles(dTime, toBuf)
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
  
    gamePlay.step(dTime) 
  
    setTimeout(() => { requestAnimationFrame(loop) },0)
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

class ResList {
  constructor(onDone) {
    this.pendingRes = {}
    this.res = {}
    this.counter = 0
    this.onDone = onDone
  }

  enable() {
    this.enabled = true
    this.checkForDone()
  }
  
  checkForDone() {
    if(this.enabled && Object.keys(this.pendingRes).length <= 0) {
      this.onDone(this.res)
    }
  }

  add(resName) {
    var resId = this.counter++
    this.pendingRes[resId] = resName
    return (res) => {
      this.complete(resId, res) 
    }
  }

  complete(resId, res) {
    this.res[this.pendingRes[resId]] = res
    delete this.pendingRes[resId]
    this.checkForDone()
  }
}

var resList = new ResList(main)

var imageLoaded = resList.add('map')
var image = new Image()
image.addEventListener('load', () => {
  imageLoaded(image) 
})
image.src = map_skull

resList.enable()
