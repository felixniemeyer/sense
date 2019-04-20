export default class HUD {
  constructor(callbacks) {
    this.overlay = document.getElementById('hud') 
    this.menuStack = []
    this.initLids() 
    this.openingDuration = 150
    this.closeDuration = 50 //50 is good
    this.removeDuration = 200
    
    this.callbacks = callbacks

    document.addEventListener('keydown', (ev) => {
      if(ev.code === 'Enter') {
        this.onEnter()
      }
      if(ev.code === 'Backspace') {
        this.onBackspace()
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
      if(ev.code === 'ArrowRight' || ev.code === 'ArrowUp') {
        this.selectOption( (this.menu.selected + 1) % len, this.wheelPos + 1 ) 
      }
      if(ev.code === 'ArrowLeft' || ev.code === 'ArrowDown') {
        this.selectOption( (len + this.menu.selected - 1) % len, this.wheelPos - 1 ) 
      }
    })
    this.openMainMenu()
  }

  openMainMenu() {
    this.blink()
    this.openMenu(
      this.createMenu('main-menu', [
          'join server',
          'settings',
          'about'
        ], (chosen) => {
          switch(chosen) {
            case 'join server': 
              this.chooseName()
              break   
            case 'about': 
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

  chooseName() {
    this.menuStack.push(this.menu) 
    this.updateLids(0)
    this.show('choose-name') 
    this.select('name') 
    this.onEnter = () => {
      this.unshow('choose-name') 
      this.open()
      this.openWide()
      this.callbacks.joinServer(document.getElementById('name'))
      this.enableSpectate()
    }
    this.onBackspace = () => {
      if( document.getElementById('name').textContent.length === 0 ) {
        this.unshow('choose-name') 
        this.deZoom()
        this.openMenu(this.menuStack.pop())
      }
    }
  }

  enableSpectate() {
    this.onEnter = () => {
      this.unshow('respawn-hint') 
      this.enableIngame.bind(this) 
    }
    this.onBackspace = () => {
      this.unshow('respawn-hint')
      this.openMenu(this.menuStack.pop()) 
    }
  }

  show(id) {
    document.getElementById(id).style.display = 'block'
  }

  select(id) {
    var selection = window.getSelection()
    var range = document.createRange()
    range.selectNodeContents(document.getElementById(id))
    selection.removeAllRanges()
    selection.addRange(range)
  }

  unshow(id) {
    document.getElementById(id).style.display = ''
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
          'fullscreen',
          'no',
          'more',
          'settings', 
          'yet', 
        ], (chosen) => {
          switch(chosen) {
          case 'fullscreen': 
            this.callbacks.toggleFullscreen()
            break
          default: 
          }
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
    this.blink()
    this.onEnter = () => { 
      this.menu.selectCallback(this.menu.options[this.menu.selected]) 
    }
    this.onBackspace = () => { 
      this.menu.backCallback() 
    }
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
    this.fadeStart = Date.now()
    this.zoomIn()
  }

  zoomIn() {
    var x = (Date.now() - this.fadeStart) / this.removeDuration
    var y = 1 + 1.3 * Math.min(x, 1)
    this.lids.setAttributeNS(null, 'transform', `scale(${y}, ${y})`)
    this.updateLids(x) 
    if(x < 1){
      requestAnimationFrame(this.zoomIn.bind(this))
    } else {
      this.wheel.style.display = 'none'
    }
    var z = 1 + 2 * Math.min(x, 1) 
    this.wheel.style.transform = `rotate(${-this.menu.anim.rotation}turn) scale(${z}, ${z})`
  }
  
  deZoom() {
    this.lids.setAttributeNS(null, 'transform', '') 
    this.wheel.style.transform = `rotate(${-this.menu.anim.rotation}turn)`
  }

  log(value, seconds, id) {
    seconds = seconds || 60
    var elementId = 'info_' + id 
    var container = document.getElementById('info')
    var info = id === undefined ? null : document.getElementById(elementId) 
    if(info === null) {
      info = document.createElement('p') 
      if(id) {
        info.id = elementId
      }
      container.appendChild(info) 
      setTimeout(() => {
        container.removeChild(info) 
      }, seconds * 1000)
    }
    info.textContent = ( id ? `${id}: ` : '' ) + value
  }
}
