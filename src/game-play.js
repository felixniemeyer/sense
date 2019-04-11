function vec2(x, y){
  return {x, y}
}

function length(vec){
  return Math.sqrt(Math.pow(vec.x, 2) + Math.pow(vec.y, 2)) 
}

export default class GamePlay {
  constructor(gameParams) {
    this.params = gameParams || {
      playerAcceleration: 0.1
    }
      
    this.playerPosition = vec2(0,0)
    this.playerVelocity = vec2(0,0)
    this.cameraPosition = vec2(0,0)
    this.enableInput()
  }

  enableInput() {
    this.keydowns = {}
    document.addEventListener('keydown', (ev) => {
      this.keydowns[ev.code] = true
    })
    document.addEventListener('keyup', (ev) => {
      if(ev.code in this.keydowns){
        delete this.keydowns[ev.code]
      }
    })
  }

  step(dTime) {
    this.considerInput(dTime)
    this.playerPosition.x += this.playerVelocity.x * dTime
    this.playerPosition.y += this.playerVelocity.y * dTime
  }

  considerInput(dTime) {
    var accelerationVector = vec2(0,0)
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
    var len = length(accelerationVector) 
    if(len > 0) {
      var f = 1 / len * dTime * this.params.playerAcceleration;
      this.playerVelocity.x += f * accelerationVector.x 
      this.playerVelocity.y += f * accelerationVector.y
    }

    if(this.keydowns['ShiftLeft']){ //spurt
      
    }
    if(this.keydowns['Space']){ //assasinator mode
      
    }
    if(this.keydowns['KeyD']){ //deploy item 
      
    }
  }

  getPlayerPositionArr() {
    return [this.playerPosition.x, this.playerPosition.y]
  }

  getCameraPosition() {
    return this.cameraPosition
  }
}
