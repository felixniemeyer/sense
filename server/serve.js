const fs = require('fs') 
const WS = require('ws') 
const PNG = require('pngjs').PNG

const port = 8080

const params = {
  map: {
    filePath: '../maps/128_skull.png',
    size: 0
  },
  collisionRadius: 0.1, 
  maxParticleDistance: 1.5
}

console.log('loading map') 
var data = fs.readFileSync(params.map.filePath) 
var png = PNG.sync.read(data)
function isPowerOf2(number) {
  if(number === 1) {
    return true
  }
  if(number === 0 || number % 2 === 1) {
    return false
  } else {
    return isPowerOf2(number / 2) 
  }
}
params.map.size = png.width
if(isPowerOf2(png.width) && png.width === png.height) 
var playerSpawnPoints = []
var itemSpawnPoints = []
var alphaValues = {}
for(var y = 0; y < png.height; y ++) {
  for(var x = 0; x < png.width; x++) {
    var idx = ( (png.width * y) + x ) * 4
    var a = png.data[idx + 3]
    if(alphaValues[a] === undefined) {
      alphaValues[a] = [x, y] 
    }
    if(alphaValues === 128) {
      var r = png.data[index + 0]
      var g = png.data[index + 1]
      var b = png.data[index + 2]
      if(g === 255) {
        if(b === 255) {
          itemSpawnPoints.push([x, y])
        } else {
          playerSpawnPoints.push([x, y]) 
        }
      }
    }
  }
}
console.log('Alpha values occured with the coordinates of first occurance') 
console.log('Player spawn points', playerSpawnPoints) 
console.log('done\n') 

var objectMap = {
  map: {},
  get: (x, y, k) => {
    if(x in map) {
      if(y in map[x]) {
        return map[x][y][k]
      }
    }
  },
  set: (x, y, k, v) => {
    if(x in map) {
      if(y in map[x]) {
        map[x][y][k] = v
      }
    }
  }
}



console.log(`starting websocket server on port ${port}`) 
var tickInterval 
const wss = new WS.Server({
  port: 8080
}, function() {
  tickInterval = setInterval(tick, 1000 / 15) 
})
console.log('done\n')

function noop() {}

function heartbeat() {
  this.isAlive = true
}

wss.on('headers', (headers, req) => {
  headers.push('Access-Control-Allow-Origin: file:///')
})

wss.on('connection', (ws) => {
  ws.isAlive = true
  initPlayer(ws) 
  sendParams(ws) 
  ws.on('pong', heartbeat) 
  ws.on('message', (rawMsg) => { handleMessage(ws, rawMsg) })
})

var clientIdSequence = 0
function initPlayer(ws) {
  ws.player = {
    lastBroadcast: {
      position: [0,0]  
    },
    position: [0, 0],
    mode: 'spectating',
    id: clientIdSequence++
  }
}

function sendParams(ws) {
  ws.send(JSON.stringify({
    type: 'params', 
    payload: params
  }))
}

function handleMessage(ws, rawMsg) {
    var msg = parseMessage(rawMsg) 
    console.log('received msg', msg) 
    if(msg !== undefined) {
      switch(msg.type) {
      case 'set-player-name':
        ws.player.name = msg.payload.playerName
        console.log(`player ${ws.player.id} set his name to ${ws.player.name}`)
        break
      case 'set-player-position': 
        ws.player.position = msg.payload.playerPosition
        break
      default: 
    }
  } 
}     

function parseMessage(rawMsg) {
  try {
    return JSON.parse(rawMsg)
  } catch(e) {
    console.log('could not parse message', rawMsg) 
  }
}

const pingInterval = setInterval(() => {
  console.log('pinging clients') 
  wss.clients.forEach((ws) => {
    console.log(ws.player.id) 
    if(ws.isAlive === false) {
      disconnectPlayer(ws) 
      return ws.terminate()
    }
    ws.isAlive = false
    ws.ping(noop) 
  })
}, 30000) //30000 is good

function tick() {
  updateClients()
  var clients = Array.from(wss.clients) 
  var ws1, ws2; 
  for(var i1 = 0; i1 < clients.length; i1++) {
    for(var i2 = 0; i2 < i1; i2++) {
      ws1 = clients[i1]
      ws2 = clients[i2]
      checkCollision(ws1, ws2) 
    }
  }
}

function checkCollision(ws1, ws2) {
  if(squareDistance(ws1.player.position , ws2.player.position) < Math.pow(params.collisionRadius, 2)) {
    if(ws1.player.mode === 'berserk') {
      if(ws2.player.mode === 'active') {
        // kill!
        kill(ws1, ws2) 
      }
    } else if(ws2.player.mode === 'berserk') {
      if(ws1.player.mode === 'active') {
        kill(ws2, ws1) 
      }
    }
  }
}

function kill(killer, victim) {
  victim.send(JSON.stringify({
    type: 'you-got-killed'
  }))
  killer.send(JSON.stringify({
    type: 'you-killed' 
  }))
  victim.player.mode = 'spectating' 
  victim.player.deaths++
  killer.player.mode = 'active'
  killer.player.kills++
}

function squareDistance(A, B) {
  return Math.pow(A[0] - B[0], 2) + Math.pow(A[1] - B[1], 2) 
}

function updateClients() {
  wss.clients.forEach(playerWs => {
    var sqrD = squareDistance(playerWs.player.lastBroadcast.position, playerWs.player.position) 
    var bcPosition = sqrD > Math.pow(0.01, 2) 
    if(bcPosition) {
      playerWs.player.lastBroadcast.position = playerWs.player.position.slice()
    }
    wss.clients.forEach(receiverPlayerWs => {
      if(playerWs !== receiverPlayerWs && playerInSight(playerWs.player, receiverPlayerWs.player)) {
        if(bcPosition) {
          receiverPlayerWs.send(JSON.stringify({
            type: 'enemy-position',
            payload: {
              enemyId: playerWs.player.id,
              enemyPosition: playerWs.player.position
            }
          }))
        } 
      }
    })
  })
}
 
function playerInSight(p1, p2) {
  return Math.sqrt(squareDistance(p1.position, p2.position)) < params.maxParticleDistance // buggy: when player doesn't move, an approaching player doesn't get an update
}

function respawnPlayer(ws, payload) { 
  var i = Math.floor((Math.random() * playerSpawnPoints.length))
  ws.player.position = playerSpawnPoints[i].splice()
}

function disconnectPlayer(ws) { 
  wss.clients.forEach(ws2 => {
    if(ws != ws2) {
      ws2.send(JSON.stringify({
        type: 'remove-enemy',
        payload: {
          enemyId: ws.player.id
        }
      }))
    }
  })
}
