import Vec2 from './vec2.js'

function MissingParamsException(message) {
  this.message = 'Missing parameters for GamePlay creation: ' + missingParams.join(', ')
}

export default class GamePlay {
  constructor(gameParams, mapData) {
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
      this.throw(new MissingParamsException(missingParams)) 
    }

    this.mapData = mapData
    
    this.emitting = true;       
    this.player = {
      position: new Vec2(0,0),
      velocity: new Vec2(0,0),
      accelerationVector: new Vec2(0,0),
      stamina: 1, 
      rage: 0,
      berserkModeOn: false, 
      rays: 1 / 16 // fraction of the `of rays the player emits
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
          if(this.berserkModeOn) {
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

  step(dTime) {
    this.considerInput(dTime)

    this.player.stamina = Math.min(1, this.player.stamina + dTime * this.params.boostRegenerate)
    
    this.playerMovement() 
  }

  playerMovement(dTime) {
    var newPos = this.player.position.add(this.player.velocity.scale(dTime))

    this.considerMapCollision(newPos)

    this.player.velocity.scaleInPlace(Math.pow(this.params.playerFriction, dTime))
  }

  considerMapCollision(newPos) {
    var prevPos = this.player.position.copy()
    var v, nextLineIndex, unitsToLine 

    var checkTileCollision = (axis) => {
      console.log('v', v) 
      var wallTileIndex = nextLineIndex.subtract(v.sign().addInPlace(new Vec2(1,1)))
      wallTileIndex.addInPlace(v.sign())
      console.log(wallTileIndex)
      tileValu = this.mapData[wallTileIndex[0] + wallTileIndex[1] * this.params.mapSize]
      if(tileValue.a == 255) {
        p.velocity[axis] = 0
        var units = unitsToLine[axis] - Math.sign(v[axis]) * this.params.tileSize * 0.01 / v[axis]
        prevPos.addInPlace(v.scale(units)) 
        newPos[axis] = prevPo[axis] 
      } else {
        nextLineIndex[axis] += Math.sign(v[axis])
      }
    }

    while(true) {
      console.log(prevPos, newPos) 
      v = newPos.subtract(prevPos) 
      nextLineIndex = prevPos.divideCompWise( this.params.tileSize )
      nextLineIndex.addInPlace(v.sign()) 
      unitsToLine = nextLineIndex.scale(this.params.tileSize)
      unitsToLine.subtractInPlace(this.getPlayerPosition) 

      var couldCollide = [true, true]
      for(var i = 0; i < 2; i++) {
        if(v[1] === 0 || unitsToLine[1] <= 0 || unitsToLine[1] > 1) {
          couldCollide[i] = false
        }
      }

      if(couldCollide[0]) {
        if(couldCollide[1]) {
          if(unitsToLine[0] < unitsToLine[1]) {
            checkTileCollision(0)
          } else {
            checkTileCollision(1)
          }
        } else {
            checkTileCollision(0)
        }
      } else if (couldCollide[1]) {
        checkTileCollision(1)
      } else {
        break
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
    this.berserkModeOn = true
  }
  
  disableBerserk() {
    this.berserkModeOn = false
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
    return this.berserkModeOn
  }
  
  getLuminance() {
    return this.player.rays
  }
}
