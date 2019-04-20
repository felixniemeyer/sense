import shaderTools from './webgl2tools.js'

import GamePlay from './game-play.js'
import HUD from './hud.js'

import vsParticlePhysics from './shaders/particle-physics.vert'
import fsParticlePhysics from './shaders/particle-physics.frag'
import vsParticleDraw from './shaders/particle-draw.vert'
import fsParticleDraw from './shaders/particle-draw.frag'
import vsTextureDraw from './shaders/texture-draw.vert'
import fsTextureDraw from './shaders/texture-draw.frag'
import vsPostProcess from './shaders/post-process.vert'
import fsPostProcess from './shaders/post-process.frag'
import vsFinalDraw from './shaders/final-draw.vert'
import fsFinalDraw from './shaders/final-draw.frag'

import map from '../maps/128_skull.png'

var frameSize = 1024
var particlePhysicsTextureCount = 4

function main() { 
  var menuParams = {
    //Params to play with
    halfWidth: 1.5 * 2 / frameSize,
    particleCountSqrt: 32, // 32 is fine
    particleSpeed: 1, // 1 is good
    rayDecay: 0.930713,
    rayDecayCircleFactor: 0.1,
    rayAlpha: 0.5,
    renderMode: 0,

    //map related config
    tileSize: 0.1 // update maxIntersectionChecks in ./shaders/particle-physics.frag accordingly
  }
  menuParams.particleCount = menuParams.particleCountSqrt * menuParams.particleCountSqrt

  var ingameParams = {
    rayAlpha: 0.3
  }
  var params = menuParams

  var quadVao = createQuadVao(gl) 
  var circleVao = createCircleVao(gl, 5) 
  var circleVertexCount = 4 * Math.pow(2, 5) 

  console.log('building particlePhysicsProgram program')
	var particlePhysicsProgram = shaderTools.createProgramFromSources(gl, [vsParticlePhysics, fsParticlePhysics])
  var particlePhysicsUniformLocations = getUniformLocations(particlePhysicsProgram, [
    'particlePositions', 
    'particleColors', 
    'particleVelocities',
    'particlePerpendiculars',
    'map',
    'dTime', 
    'playerPosition', 
    'particleSpeedPerSecond',
    'rayAlpha',
    'renderMode',
    'tileSize',
    'mapSize',
    'activeParticlesCountNormed', 
    'particleCountSqrt',
    'preventRespawn'
  ])
  var updateParticlePhysicsUniforms = () => {
    gl.useProgram(particlePhysicsProgram)
    gl.uniform1i(particlePhysicsUniformLocations.particlePositions, 0)
    gl.uniform1i(particlePhysicsUniformLocations.particleColors, 1)
    gl.uniform1i(particlePhysicsUniformLocations.particleVelocities, 2)
    gl.uniform1i(particlePhysicsUniformLocations.particlePerpendiculars, 3)
    gl.uniform1i(particlePhysicsUniformLocations.map, 4)
    gl.uniform2fv(particlePhysicsUniformLocations.shift, [0, 0]) 
    gl.uniform2fv(particlePhysicsUniformLocations.playerPosition, [0, 0]) 
    gl.uniform1f(particlePhysicsUniformLocations.particleSpeedPerSecond, params.particleSpeed)
    gl.uniform1f(particlePhysicsUniformLocations.rayAlpha, params.rayAlpha) 
    gl.uniform1i(particlePhysicsUniformLocations.renderMode, params.renderMode)
    gl.uniform1f(particlePhysicsUniformLocations.tileSize, params.tileSize)
    gl.uniform1i(particlePhysicsUniformLocations.mapSize, mapSize) 
    gl.uniform1f(particlePhysicsUniformLocations.particleCountSqrt, params.particleCountSqrt) 
    gl.uniform1i(particlePhysicsUniformLocations.preventRespawn, 0) 
  }
  updateParticlePhysicsUniforms()

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
        params.particleCountSqrt, 
        params.particleCountSqrt, 
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
  
  var updateParticlePhysics = () => { 
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[fromBuf][0])
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[fromBuf][1])
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[fromBuf][2])
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, particlePhysicsTextures[fromBuf][3])
    gl.activeTexture(gl.TEXTURE4)
    gl.bindTexture(gl.TEXTURE_2D, mapTexture)
  
    gl.bindFramebuffer(gl.FRAMEBUFFER, particlePhysicsFrameBuffer[toBuf])
    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1,
      gl.COLOR_ATTACHMENT2,
      gl.COLOR_ATTACHMENT3
    ])
		gl.viewport(0, 0, params.particleCountSqrt, params.particleCountSqrt)

    gl.useProgram(particlePhysicsProgram) 
    gl.uniform1f(particlePhysicsUniformLocations.dTime, dTime)
    gl.uniform2fv(particlePhysicsUniformLocations.playerPosition, displayCenter) 
    gl.uniform1f(particlePhysicsUniformLocations.activeParticlesCountNormed, luminance)
    gl.uniform1i(particlePhysicsUniformLocations.preventRespawn, preventRespawn) 
  
    gl.bindVertexArray(quadVao); 
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  console.log('building particleDraw program')
	var particleDrawProgram = shaderTools.createProgramFromSources(
    gl, [vsParticleDraw, fsParticleDraw]
  )
  var particleDrawUniformLocations = getUniformLocations(particleDrawProgram, [
    'particlePositions', 
    'particleColors', 
    'particlePerpendiculars',
    'particleCountSqrt',
    'halfWidth',
    'playerPosition',
    'decay',
    'dTime',
    'decayCircleFactor',
    'activeParticlesCount'
  ])
  var updateParticleDrawUniforms = () => {
    gl.useProgram(particleDrawProgram) 
    // const
    gl.uniform1i(particleDrawUniformLocations.particlePositions, 0)
    gl.uniform1i(particleDrawUniformLocations.particleColors, 1)
    gl.uniform1i(particleDrawUniformLocations.particlePerpendiculars, 2)
    gl.uniform1ui(particleDrawUniformLocations.particleCountSqrt, params.particleCountSqrt) 
    gl.uniform1f(particleDrawUniformLocations.halfWidth, params.halfWidth )
    gl.uniform1f(particleDrawUniformLocations.decay, params.rayDecay)
    gl.uniform1f(particleDrawUniformLocations.decayCircleFactor, params.rayDecayCircleFactor)
    // dynamic 
    gl.uniform1f(particleDrawUniformLocations.dTime, 0)
    gl.uniform2fv(particleDrawUniformLocations.playerPosition, [0,0])
    gl.uniform2fv(particleDrawUniformLocations.shift, [0,0])
  }
  updateParticleDrawUniforms() 

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
  var vertexData = new Uint16Array(params.particleCount * 2 * 4) // 2 uint/vertex, 4 vertices/particle
  var indexData = new Uint16Array(params.particleCount * 2 * 3) // 2 triangles/particle
  for(var i = 0; i < params.particleCount; i++) {
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

  var drawParticles = () => {
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
    gl.uniform2fv(particleDrawUniformLocations.playerPosition, displayCenter) 
    gl.uniform1f(particleDrawUniformLocations.dTime, dTime)
    gl.uniform1ui(
      particleDrawUniformLocations.activeParticlesCount, 
      Math.floor(luminance * params.particleCount) 
    )

    gl.bindVertexArray(particleSegmentsVao) 
    
    gl.enable(gl.BLEND)  
    gl.drawElements(gl.TRIANGLES, 6 * params.particleCount, gl.UNSIGNED_SHORT, 0)
    gl.disable(gl.BLEND) 
  }

  console.log('building textreDraw program')
  var textureDrawProgram = shaderTools.createProgramFromSources(
    gl, [vsTextureDraw, fsTextureDraw]
  )
  var textureDrawUniformLocations = getUniformLocations(textureDrawProgram, [
    'position', 
    'size',
    'tex'
  ])
  gl.useProgram(textureDrawProgram)
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

  var drawDataTextures = () => {
    var width = 1 / 5
    for(var i = 0; i < particlePhysicsTextureCount; i++) {
      drawTexture(
        particlePhysicsTextures[toBuf][i], 
        -1 + width * (1.5 * i+1), 
        -1 + width, 
        width
      )
    }
  }

  console.log('building postProcess program')
  var postProcessProgram = shaderTools.createProgramFromSources(
    gl, [vsPostProcess, fsPostProcess]
  )
  var postProcessUniformLocations = getUniformLocations(postProcessProgram, [
    'frameTexture',
    'decay',
    'dTime',
    'decayCircleFactor',
    'shift'
  ])
  var updatePostProcessUniforms = () => {
    gl.useProgram(postProcessProgram) 
    gl.uniform1i(postProcessUniformLocations.frameTexture, 0)
    gl.uniform1f(postProcessUniformLocations.decay, params.rayDecay) 
    gl.uniform1f(postProcessUniformLocations.decayCircleFactor, params.rayDecayCircleFactor) 
    gl.uniform2fv(postProcessUniformLocations.shift, [0,0])
  }
  updatePostProcessUniforms()

  var postProcess = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer[toBuf]) 
    gl.viewport(0,0,frameSize, frameSize) 
  
    gl.useProgram(postProcessProgram) 
    gl.uniform1f(postProcessUniformLocations.dTime, dTime) 
    gl.uniform2fv(postProcessUniformLocations.shift, shift) 

    gl.activeTexture(gl.TEXTURE0) 
    gl.bindTexture(gl.TEXTURE_2D, frameTexture[fromBuf]) 
  
    gl.bindVertexArray(quadVao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  var finalDrawProgram = shaderTools.createProgramFromSources(gl, [
    vsFinalDraw, fsFinalDraw
  ])
  var finalDrawUniformLocations = getUniformLocations(finalDrawProgram, [
    'frameTexture'
  ])
  var updateFinalDrawUniforms = () => {
    gl.useProgram(finalDrawProgram) 
    gl.uniform1i(finalDrawUniformLocations.frameTexture, 0)
  }
  updateFinalDrawUniforms()

  var finalDraw = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
    gl.viewport(0,0,frameSize,frameSize) 

    gl.useProgram(finalDrawProgram) 
    
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, frameTexture[toBuf]) 
    
    gl.bindVertexArray(circleVao) 
    gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertexCount) 
  }

  //init stuff
  gl.bindFramebuffer(gl.FRAMEBUFFER, null) 
  gl.cullFace(gl.FRONT_AND_BACK)

  gl.enable(gl.BLEND) 
  gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA)
  gl.disable(gl.BLEND) 

  var shift = []
  var lastPlayerPos = [0,0]

  var stop = false

  document.addEventListener('keydown', (ev) => {
    if(ev.code === 'Escape'){
      stop = !stop
      if(stop === false) requestAnimationFrame(loop) 
    }
  })

  var dTime, now, then = Date.now()
  var fromBuf, toBuf = 1
  var displayCenter = [0, 0]
  var shift 
  var luminance = 1
  var preventRespawn = 0

  var loop = () =>  {
    now = Date.now()
    dTime = (now - then) / 1000
    then = now
    
    fromBuf = toBuf
    toBuf = 1 - toBuf

    if(gamePlay !== undefined) {
      gamePlay.step(dTime) 
      var nextDisplayCenter = gamePlay.getPlayerPosition().map(v => (v)) 
      if(shift === undefined) {
        shift = [0, 0]
      } else {
        shift[0] = (nextDisplayCenter[0] - displayCenter[0])
        shift[1] = (nextDisplayCenter[1] - displayCenter[1])
      }
      displayCenter = nextDisplayCenter
      luminance = gamePlay.getLuminance()
      preventRespawn = gamePlay.isInBerserkMode() ? 1 : 0
    } else {
      shift = [0, 0]
      luminance = 1
      preventRespawn
    }

    updateParticlePhysics()
    postProcess() 
    drawParticles()

    finalDraw()

    // drawDataTextures() // for inspection purposes
    
    setTimeout(() => { 
      if(!stop) requestAnimationFrame(loop) 
    }, 10)
  }
  
  var run = () => {
    requestAnimationFrame(loop) 
  }

  var functions = {
    run, 
    stop: () => {
      stop = true
    },
    updateParams: (newParams) => {
      Object.assign(params, newParams) 
      updateParticlePhysicsUniforms()
      updateParticleDrawUniforms()
      updatePostProcessUniforms()
      updateFinalDrawUniforms()
    },
    getParams: () => {
      return params
    }
  }
  return functions      
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

function createCircleVao(gl, circleRes) {
  circleRes = circleRes || 4
  var current, next = [
    -1,-1,
		1,-1,
		1, 1, 
		-1, 1
  ]
  var nvi
  var vi 
  var a = Math.sqrt(2) / 2
  var b = 1 - a
  for(var i = 0; i < circleRes; i++) {
    current = next.slice()
    for(var s = 0; s < current.length; s++) {
      vi = 4 * Math.floor(s / 2) + s % 2
      nvi = (s + 2) % current.length
      next[vi  ] = current[s] * a + current[nvi] * b
      next[vi+2] = current[s] * b + current[nvi] * a
    }
  }
  var data = new Float32Array(next) 
  var circleVao = gl.createVertexArray(circleVao)
  gl.bindVertexArray(circleVao) 
  gl.enableVertexAttribArray(0)
  var circleVertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexBuffer) 
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW) 
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  return circleVao
}

function getUniformLocations(program, uniformNames) {
  var uniformMap = {}
  for(var i = 0; i < uniformNames.length; i++) {
    var uName = uniformNames[i] 
    uniformMap[uName] = gl.getUniformLocation(program, uName)
  }
  return uniformMap
}

var gl
function getGlAndExtensions() {
	var canvas = document.getElementById("canvas")
  canvas.setAttribute('height', frameSize) 
  canvas.setAttribute('width', frameSize) 

	gl = canvas.getContext("webgl2", {
    preserveDrawingBuffer: true,
    premultipliedAlpha: false
  })

	if (!gl) {
		console.error("could not get webgl2 content")
		return
	}

  if(gl.MAX_COLOR_ATTACHMENTS < particlePhysicsTextureCount) {
    console.error(`need at least ${particlePhysicsTextureCount} color attachments`) 
    return 
  }

	var ext = gl.getExtension('EXT_color_buffer_float')
	if (!ext) {
		console.error("need gl extension EXT_color_buffer_float")
    gl = undefined
		return
	}

  var ext = gl.getExtension('OES_texture_float_linear')
	if (!ext) {
		console.error("need gl extension OES_texture_float_linear")
    gl = undefined
		return
	}
}

var ws; 
function joinServer(playerName) {
  ws = new WebSocket('ws://localhost:8080') 

  ws.onmessage = (ev) => {
    try {
      var msg = JSON.parse(ev.data) 
      switch(msg.type) {
      case 'respawn': 
        gamePlay.setPlayerPosition(msg.payload.position)
        break
      default: 
      }
    } catch(err) {
      console.error('malformed message', ev.data) 
    }
  }

  ws.onconnect = () => {
    ws.send(JSON.stringify({
      type: 'player-name', 
      payload: {
        playerName
      }
    }))
  }
    joinGame()
}

function joinGame() {
  loop.updateParams({ // some day: use params from server. Make mapData also a "param"
    rayAlpha: 0.3,
    renderMode: 1,
  })

  var params = loop.getParams()

  gamePlay = new GamePlay(
    {
      playerAcceleration: 1,
      playerFriction: 0.02,
      playerBoost: 1.5,
      boostRegenerate: 10.2, // per second
      boostStaminaCosts: 0.3,
      berserkEnableRageCosts: 0.1,
      berserkRageDrain: 0.05, // per second 
      tileSize: params.tileSize,
      mapSize
    },
    mapData,
    hud.log.bind(hud)
  )

}

var fullscreen = false
function toggleFullscreen() {
  if(fullscreen) {
    document.exitFullscreen()
    fullscreen = false
  } else {
    document.documentElement.requestFullscreen()
    fullscreen = true
  }
} 

var mapData
var mapTexture
var mapSize 
function loadMap(doneCallback) {
  //Preparing
  mapTexture = gl.createTexture()
  var image = new Image()
  image.onload = () => {
    if(image.width !== image.height) {
      console.error('Map height needs to equal width') 
      return 
    } else {
      mapSize = image.height
    } 
    gl.bindTexture(gl.TEXTURE_2D, mapTexture) 
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true) 
    gl.texImage2D(
      gl.TEXTURE_2D,
      0, 
      gl.RGBA8UI, 
      mapSize, 
      mapSize, 
      0,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_BYTE,
      image
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    var framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, mapTexture, 0)

    mapData = new Uint8Array(image.width * image.height * 4)
    gl.readPixels(0, 0, image.width, image.height, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, mapData)

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0)

    gl.deleteFramebuffer(framebuffer)

    doneCallback()
  }
  image.src = map 
}
  
var hud, loop, gamePlay
window.addEventListener('load', () => {
  getGlAndExtensions()
  gamePlay = undefined
  var hudCallbacks = {
    joinServer,
    joinGame,
    toggleFullscreen, 
  }
  hud = new HUD(hudCallbacks)
  loadMap(() => {
    loop.run()
  }) 
  loop = main()
})
