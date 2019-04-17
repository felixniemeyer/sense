const WS = require('ws') 
import 

const wss = new WS.Server({
  port: 8080
})

function noop() {}

function heartbeat() {
  this.isAlive = true
}

class PlayerConnection {
  constructor() {
  }
  

wss.on('connection', (ws) => {
  ws.isAlive = true
  ws.player = new Player
  ws.on('pong', heartbeat) 
  ws.on('message', handleMessage) 
      
      
)

function handleMessage = (ws, rawMsg) {
    var msg = parseMessage(rawMsg) 
    if(msg !== undefined) {
      switch(msg.type) {
      case 'position': 
        update
}     

function parseMessage(rawMsg) {
  try {
    return JSON.parse(rawMsg)
  } catch(e) {
    console.log('could not parse message', rawMsg) 
  }
}

const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if(ws.isAlive === false) {
      return ws.terminate()
    }
    ws.isAlive = false
    es.ping(noop) 
  })
}, 30000)
