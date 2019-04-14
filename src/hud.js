export default class HUD {
  // blink
  constructor(overlay) {
    this.mode = 'main-menu'
    this.overlay = document.getElementById('hud') 
    console.log(this.overlay) 
    this.initMenu() 
    this.initLids() 
    this.openingDuration = 150
    this.closeDuration = 50
    this.removeDuration = 150
    document.addEventListener('keydown', (ev) => {
      if(ev.code === 'Enter') {
        this.closeTime = Date.now() + this.closeDuration
        this.open()
      }
    })
    document.addEventListener('keydown', (ev) => {
      if(ev.code === 'KeyS') {
        this.closeTime = Date.now()
        this.open()
        this.openWide()
      }
    })
  }

  openWide(fd) {
    this.updateLids(0) 
    this.fadeStart = Date.now()
    this.fadeOut()
  }

  fadeOut() {
    var x = (Date.now() - this.fadeStart) / this.removeDuration
    var y = 1 + 1.3 * Math.min(x, 1)
    this.lids.setAttributeNS(null, 'transform', `scale(${y}, ${y})`)
    if(x < 1){
      requestAnimationFrame(this.fadeOut.bind(this))
    }
  }

  initMenu() {
  }
  
  open() {
    var x = (Date.now() - this.closeTime) / this.openingDuration
    var y = Math.max(0, Math.min(x, 1))
    this.updateLids(y)
    if(y !== 1) {
      requestAnimationFrame(this.open.bind(this)) 
    }
  }

  initLids() {
    this.rgb = '125,55,255'
    this.lids = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    this.lids.setAttributeNS(null, 'fill', `rgba(${this.rgb},255)`)
    this.lids.setAttributeNS(null, 'stroke', 'transparent')
    
    this.updateLids(1)
  
    this.overlay.appendChild(this.lids) 
  }

  updateLids(openness) {
    
    this.lids.setAttributeNS(null, 'd', `
      M -1 -1

      C -1 -1, -1  1, -1  1
      C -1  1,  1  1,  1  1
      C -${openness} ${openness * 0.9}, -${openness} -${openness * 0.8}, -1 -1  

      C -1 -1,  1 -1,  1 -1
      C  1 -1,  1  1,  1  1
      C  ${openness * 0.8} -${openness}, -${openness * 0.4} -${openness}, -1 -1
    `)
  }
}
