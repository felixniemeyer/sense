export default class HUD {
  // blink
  constructor() {
    this.overlay = document.getElementById('hud') 
    this.menuStack = []
    this.initLids() 
    this.openingDuration = 150
    this.closeDuration = 50
    this.removeDuration = 150
    document.addEventListener('keydown', (ev) => {
      if(ev.code === 'Enter') {
        this.blink()
        this.menu.selectCallback(this.menu.options[this.menu.selected])
      }
      if(ev.code === 'Backspace') {
        this.blink()
        this.menu.backCallback()
      }
    })
    document.addEventListener('keydown', (ev) => {
      if(ev.code === 'KeyS') {
        this.closeTime = Date.now()
        this.open()
        this.openWide()
      }
    })
    
    this.initMenu()
  }

  initMenu() {
    this.wheel = document.createElement('div')
    
    this.wheel.id = 'wheel'
    this.overlay.appendChild(this.wheel) 
    document.addEventListener('keydown', (ev) => {
      var len = this.menu.options.length; 
      if(ev.code === 'ArrowRight') {
        this.selectOption( (this.menu.selected + 1) % len, this.wheelPos + 1 ) 
      }
      if(ev.code === 'ArrowLeft') {
        this.selectOption( (len + this.menu.selected - 1) % len, this.wheelPos - 1 ) 
      }
    })
    this.openMainMenu()
  }

  openMainMenu() {
    this.openMenu(
      this.createMenu('main-menu', [
          'new server', 
          'join server',
          'settings',
        ], (chosen) => {
          switch(chosen) {
            case 'join server': 
              this.open()
              this.openWide()
              break   
            case 'new server': 
              this.openNewServerMenu()
              break
            case 'settings': 
              this.openSettingsMenu()
              break
            default: 
          }
        }, () => {}
      )
    )
  }

  openNewServerMenu() {
    this.menuStack.push(this.menu) 
    this.openMenu(
      this.createMenu('new-server-menu', [
        'map',
        'max player', 
        'dings', 
        'dongs',
        'changs'
      ], (chosen) => {
      }, () => {
        this.openMenu(this.menuStack.pop())
      })
    )
  }

  openSettingsMenu() {
    this.menuStack.push(this.menu) 
    this.openMenu(
      this.createMenu('setting-menu', [
          'audio', 
          'graphics',
          'controls'
        ], (chosen) => {
        }, () => {
          this.openMenu(this.menuStack.pop())
        }
      )
    )
  }

  createMenu(name, options, selectCallback, backCallback) {
    var menu = {
      anim: {
        duration: 250,
        rotation: 0,
        dest: 0
      },
      selected: 0,
      selectCallback,
      backCallback,
      options,
      optionElements: []    
    }

    var step = 1 / options.length
    for(var i = 0; i < options.length; i++) {
      var option = document.createElement('div')
      option.style.transform = `translate(-50%, -50%) rotate(${i * step}turn) translate(0, -20vh)`
      option.style.width = `` // calculate so, that the edges overlap 
      option.textContent = options[i] 
      option.className = 'option'
      menu.optionElements[i] = option
    }
    return menu 
  }

  openMenu(menu) {
    this.menu = menu
    while(this.wheel.lastChild) {
      this.wheel.removeChild(this.wheel.lastChild) 
    }
    this.wheel.style.transform = 'rotation(0turn)'    
    for(var i = 0; i < this.menu.options.length; i++) {
      this.wheel.appendChild(this.menu.optionElements[i]) 
    }
    this.selectOption(menu.selected, menu.selected)
  }

  selectOption(optionId, wheelPos) {
    this.menu.optionElements[this.menu.selected].classList.remove('selected') 
    this.menu.selected = optionId
    this.wheelPos = wheelPos || optionId
    this.menu.anim.startTime = Date.now()
    this.menu.anim.start = this.menu.anim.rotation
    this.menu.anim.dest = + this.wheelPos / this.menu.options.length
    console.log(this.menu.options) 
    console.log(this) 
    this.rotateMenuWheel()
  }
  
  rotateMenuWheel() {
    var x = ( Date.now() - this.menu.anim.startTime ) / this.menu.anim.duration
    if( x < 1 ) {
      requestAnimationFrame(this.rotateMenuWheel.bind(this))
    } else {
      x = 1
      this.menu.optionElements[this.menu.selected].classList.add('selected') 
    } 
    x = (1 - Math.cos(Math.PI * x)) / 2
    var y = this.menu.anim.start * ( 1 - x ) + this.menu.anim.dest * x
    console.log(this.menu.anim)
    this.menu.anim.rotation = y
    this.wheel.style.transform = `rotate(${-y}turn)`
  }

  blink() {
      this.closeTime = Date.now() + this.closeDuration
      this.open()
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
    this.canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.canvas.setAttribute('preserveAspectRatio', 'none')
    this.canvas.setAttribute('viewBox', '-1 -1 2 2')
    this.canvas.id = 'hud-lids'

    this.rgb = '125,55,255'
    this.lids = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    this.lids.setAttributeNS(null, 'fill', `rgba(${this.rgb},255)`)
    this.lids.setAttributeNS(null, 'stroke', 'transparent')
    
    this.updateLids(1)
  
    this.canvas.appendChild(this.lids) 
    
    this.overlay.appendChild(this.canvas) 
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

  openWide(fd) {
    this.updateLids(0) 
    this.fadeStart = Date.now()
    this.zoomIn()
  }

  zoomIn() {
    var x = (Date.now() - this.fadeStart) / this.removeDuration
    var y = 1 + 1.3 * Math.min(x, 1)
    this.lids.setAttributeNS(null, 'transform', `scale(${y}, ${y})`)
    if(x < 1){
      requestAnimationFrame(this.zoomIn.bind(this))
    } else {
      this.wheel.style.display = 'none'
    }
    this.wheel.style.transform = `rotate(${-this.menu.anim.rotation}turn) scale(${1.3*y}, ${1.3*y})`
  }
}
