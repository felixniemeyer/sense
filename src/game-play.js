import Vec2 from './vec2.js'

export default class GamePlay {
  constructor(gameParams) {
    this.params = gameParams || {
      playerAcceleration: 1,
      playerFriction: 0.02
    }
    
    this.emitting = true;       
    this.playerPosition = new Vec2(0,0)
    this.previousPlayerPosition = new Vec2(0,0)
    this.playerVelocity = new Vec2(0,0)
    this.cameraPosition = new Vec2(0,0)
    this.enableInput()
  }

  enableInput() {
    this.keydowns = {}
    document.addEventListener('keydown', (ev) => {
      this.keydowns[ev.code] = true
      switch(ev.code) {
        case 'Space':
          this.emitting = !this.emitting
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
    this.previousPlayerPosition = this.playerPosition.copy()
    this.playerPosition.addInPlace(this.playerVelocity.scale(dTime))
    this.playerVelocity.scaleInPlace(Math.pow(this.params.playerFriction, dTime))
  }

  considerInput(dTime) {
    var accelerationVector = new Vec2(0,0)
    if(this.keydowns['ArrowUp']){
      accelerationVector.y += 1   
    }
    if(this.keydowns['ArrowRight']){
      accelerationVector.x += 1   
    }
    if(this.keydowns['ArrowDown']){
      accelerationVector.y += -1   
    }
    if(this.keydowns['ArrowLeft']){
      accelerationVector.x += -1   
    }
    var len = accelerationVector.length()
    if(len > 0) {
      var f = 1 / len * dTime * this.params.playerAcceleration;
      this.playerVelocity.addInPlace(accelerationVector.scale(f))
    }

    if(this.keydowns['ShiftLeft']){ //spurt
      
    }
    if(this.keydowns['Space']){ //assasinator mode
    }
    if(this.keydowns['KeyD']){ //deploy item 
      
    }
  }

  getPlayerPosition() {
    return this.playerPosition.toArray()
  }

  getCameraPosition() {
    return this.cameraPosition.toArray()
  }

  getEmitting() {
    return this.emitting
  }
}
