import {
   OutgoingMessage,
   SupportedMessage as OutgoingSupportedMessage,
} from './messages/outgoingMessages';
import { server as WebSocketServer, connection } from 'websocket';
import http from 'http';
import { IncomingMessage, SupportedMessage } from './messages/incomingMessages';
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
      userManager.addUser(payload.name, payload.userId, payload.roomId, ws);
   }

   if (message.type === SupportedMessage.SendMessage) {
      const payload = message.payload;
      const user = userManager.getUser(payload.roomId, payload.userId);
      if (!user) {
         console.log('User not found in db');
         return;
      }
      let chat = store.addChat(
         payload.userId,
         user.name,
         payload.roomId,
         payload.message
      );
      if (!chat) {
         return;
      }
      // Todo add broadcast logic here
      const outgoingPayload: OutgoingMessage = {
         type: OutgoingSupportedMessage.AddChat,
         payload: {
            chatId: chat.id,
            roomId: payload.roomId,
            message: payload.message,
            name: user.name,
            upvotes: 0,
         },
      };
      userManager.broadcast(payload.roomId, payload.userId, outgoingPayload);
   }

   if (message.type === SupportedMessage.UpvoteMessage) {
      const payload = message.payload;
      const chat = store.upvote(payload.userId, payload.roomId, payload.chatId);
      if (!chat) {
         return;
      }

      const outgoingPayload: OutgoingMessage = {
         type: OutgoingSupportedMessage.UpdateChat,
         payload: {
            chatId: payload.chatId,
            roomId: payload.roomId,
            upvotes: chat.upvotes.length,
         },
      };
      userManager.broadcast(payload.roomId, payload.userId, outgoingPayload);
   }
}
