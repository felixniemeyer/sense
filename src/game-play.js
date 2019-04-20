import Vec2 from './vec2.js'

function MissingParamsException(missingParams) {
  this.message = 'Missing parameters for GamePlay creation: ' + missingParams.join(', ')
}

export default class GamePlay {
  constructor(gameParams, mapData, log, sendPositionToServer) {
    var defaultParams = {
      playerAcceleration: 1,
      playerFriction: 0.02,
      playerBoost: 1.5,
      boostRegenerate: 10.2, // per second
      boostStaminaCosts: 0.3,
      berserkEnableRageCosts: 0.1,
      berserkRageDrain: 0.05, // per second 
    }
    this.params = Object.assign({}, gameParams)
    var missingParams = []
    if(this.params.mapSize === undefined) {
      missingParams.push('mapSize') 
    }
    if(this.params.tileSize === undefined) {
      missingParams.push('tileSize') 
    }
    if(missingParams.length > 0) {
      throw(new MissingParamsException(missingParams)) 
    }

    this.mapData = mapData
    this.log = log
    this.sendPositionToServer = sendPositionToServer
    this.lastPositionSentToServer = new Vec2(0, 0)
    
    var alphaValues = new Set()
    for(var i = 0; i < mapData.length; i++) {
      if(i % 4 === 3) {
        alphaValues.add(mapData[i])
      }
    }
    
    this.emitting = true;       
    var mapCenter = (this.params.mapSize / 2 + 0.5) * this.params.tileSize
    this.player = {
      position: new Vec2(mapCenter, mapCenter),
      velocity: new Vec2(0,0),
      accelerationVector: new Vec2(0,0),
      stamina: 1, 
      rage: 0,
      berserkModeOn: false, 
      rays: 2 / 16 // fraction of the `of rays the player emits
      /* wenn er jemanden killt, kommen direkt alle strahlen wieder
        wenn er es wieder ausmacht, kommen die Strahlen langsam wieder */
    }
    
    this.enableInput()
  }

  enableInput() {
    this.keydowns = {}
    document.addEventListener('keydown', (ev) => {
      this.keydowns[ev.code] = true
      switch(ev.code) {
        case 'Space':
          if(this.player.berserkModeOn) {
            this.disableBerserk()
          } else {
            this.goBerserk()
          }
          break
        case 'ShiftLeft':
          this.boost()
          break
        default:
      }
    })
    document.addEventListener('keyup', (ev) => {
      if(ev.code in this.keydowns){
        delete this.keydowns[ev.code]
      }
    })
  }

  tick(dTime) {
    this.considerInput(dTime)

    this.player.stamina = Math.min(1, this.player.stamina + dTime * this.params.boostRegenerate)
    
    this.playerMovement(dTime) 
  }

  playerMovement(dTime) {
    var newPos = this.player.position.add(this.player.velocity.scale(dTime))

    this.considerMapCollision(newPos)

    this.player.position = newPos

    if(this.lastPositionSentToServer.distanceTo(this.player.position) > 0.05) {
      this.sendPositionToServer(this.player.position.toArray())
      this.lastPositionSentToServer = this.player.position.copy()
    }

    this.player.velocity.scaleInPlace(Math.pow(this.params.playerFriction, dTime))
  }
    
  getMapTileAt(tileIndex) {
    // tileIndex.y = this.params.mapSize - 1 - tileIndex.y
    var i = 4 * ( tileIndex.y * this.params.mapSize + tileIndex.x ) 
    return {
      r: this.mapData[i+0],
      g: this.mapData[i+1],
      b: this.mapData[i+2],
      a: this.mapData[i+3]
    }
  }

  considerMapCollision(newPos) {
    var to = newPos.copy()
    var from = this.player.position.copy()
    var movement = to.subtract(from)

    var nextWallsDirection = new Vec2(0, 0)
    var nextWalls = from.scale(1 / this.params.tileSize).floor()
    for(var i of ['x', 'y']) {
      if(movement[i] > 0) {
        nextWallsDirection[i] = 1
        nextWalls[i]++
      } else {
        nextWallsDirection[i] = -1
      }
    }

    var mightCollideWithWall = (axis) => {
      var wallTileIndex = nextWalls.copy()
      wallTileIndex.subtractInPlace(nextWallsDirection.add(new Vec2(1,1)).divideBy(2))
      wallTileIndex[axis] += nextWallsDirection[axis]
      var tileValue = this.getMapTileAt(wallTileIndex) 
      if(tileValue.a === 255) {
        this.player.velocity[axis] = 0
        movement[axis] = 0
        newPos[axis] = nextWalls[axis] * this.params.tileSize 
        newPos[axis] -= nextWallsDirection[axis] * this.params.tileSize * 0.01
      } else {
        nextWalls[axis] += nextWallsDirection[axis]
      }
    }
    var distanceToWall = new Vec2(0, 0)
    var unitsToWall = new Vec2(0, 0)
    var couldCollide = {
      x: true, 
      y: true
    }
    var c = 0
    while(couldCollide.x || couldCollide.y) {
      c++
      for(i of ['x', 'y']) {        
        if(movement[i] === 0) {
          couldCollide[i] = false
        } else {
          unitsToWall[i] = (nextWalls[i] * this.params.tileSize - from[i]) / movement[i]
          if(unitsToWall[i] < 0 || unitsToWall[i] > 1) {
            couldCollide[i] = false
          } 
        }
      }
  
      if(couldCollide.x) {
        if(couldCollide.y) {
          if(unitsToWall.x < unitsToWall.y) {
            mightCollideWithWall('x') 
          } else if(unitsToWall.y > unitsToWall.x) {
            mightCollideWithWall('y') 
          } else {
            mightCollideWithWall('x')
            mightCollideWithWall('y')
          }
        } else {
          mightCollideWithWall('x') 
        }
      } else if(couldCollide.y) {
        mightCollideWithWall('y') 
      }
    }
  }

  boost() {
    if (this.player.velocity.length() !== 0) {
      var boost = Math.min(this.params.boostStaminaCosts, this.player.stamina) 
      this.player.stamina -= boost
      var vec
      if (this.player.accelerationVector.length() !== 0 && 
          this.player.velocity.cosWith(this.player.accelerationVector) < 0.7) { 
        vec = this.player.accelerationVector
      } else {
        vec = this.player.velocity.normed()
      }
      var boostFactor = boost / this.params.boostStaminaCosts
      vec.scaleInPlace(this.params.playerBoost * boostFactor)
      this.player.velocity.addInPlace(vec)
    } 
  }

  goBerserk() {
    this.player.berserkModeOn = true
  }
  
  disableBerserk() {
    this.player.berserkModeOn = false
  }

  considerInput(dTime) {
    this.player.accelerationVector.set(0,0)
    if(this.keydowns['ArrowUp']){
      this.player.accelerationVector.y += 1   
    }
    if(this.keydowns['ArrowRight']){
      this.player.accelerationVector.x += 1   
    }
    if(this.keydowns['ArrowDown']){
      this.player.accelerationVector.y += -1   
    }
    if(this.keydowns['ArrowLeft']){
      this.player.accelerationVector.x += -1   
    }
    var len = this.player.accelerationVector.length()
    if(len > 0) {
      var f = 1 / len * dTime * this.params.playerAcceleration;
      this.player.velocity.addInPlace(this.player.accelerationVector.scale(f))
    }

    if(this.keydowns['ShiftLeft']){ //spurt
      
    }
    if(this.keydowns['Space']){ //assasinator mode
      
    }
    if(this.keydowns['KeyD']){ //deploy item 
      
    }
  }

  getPlayerPosition() {
    return this.player.position.toArray()
  }

  isInBerserkMode() {
    return this.player.berserkModeOn
  }
  
  getLuminance() {
    return this.player.rays
  }

  setPlayerPosition(vec) {
    // this.player.position = new Vec2(vec[0], vec[1]) 
  }
}
