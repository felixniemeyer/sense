import Vec2 from './vec2.js'

export default class GamePlay {
  constructor(gameParams, map) {
    this.params = gameParams || {
      playerAcceleration: 1,
      playerFriction: 0.02,
      playerBoost: 1.5,
      boostRegenerate: 10.2, // per second
      boostStaminaCosts: 0.3,
      berserkEnableRageCosts: 0.1,
      berserkRageDrain: 0.05, // per second 
    }
    
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
    this.player.position.addInPlace(this.player.velocity.scale(dTime))
    this.player.velocity.scaleInPlace(Math.pow(this.params.playerFriction, dTime))
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
