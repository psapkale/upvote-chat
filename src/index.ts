import { server as WebSocketServer, connection } from 'websocket';
import http from 'http';
import { IncomingMessage, SupportedMessage } from './messages';
import { UserManager } from './store/UserManger';
import { InMemoryStore } from './store/InMemoryStore';

const server = http.createServer((request: any, response: any) => {
   console.log('HTTP Server');
   response.writeHead(404).end();
});

const userManager = new UserManager();
const store = new InMemoryStore();

server.listen(8080);

const wsServer = new WebSocketServer({
   httpServer: server,
   autoAcceptConnections: true,
});

function originIsAllowed(origin: string) {
   return true;
}

wsServer.on('request', function (request) {
   if (!originIsAllowed(request.origin)) {
      request.reject();
      console.log(`Connection from origin: ${request.origin} rejected`);
      return;
   }

   var connection = request.accept('echo-protocol', request.origin);
   console.log('Conenction accepted');
   connection.on('message', function (message) {
      // Todo add rate limiting logic here
      if (message.type === 'utf8') {
         try {
            messageHandler(connection, JSON.parse(message.utf8Data));
         } catch (e) {}
         // console.log('Received Message: ' + message.utf8Data);
         // connection.sendUTF(message.utf8Data);
      }
   });
   connection.on('close', function (reasonCode, description) {
      console.log(`Peer ${connection.remoteAddress} disconnected`);
   });
});

function messageHandler(ws: connection, message: IncomingMessage) {
   if (message.type == SupportedMessage.JoinRoom) {
      const payload = message.payload;
   }
}
