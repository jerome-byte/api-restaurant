import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // En production, on mettra l'URL de l'app Flutter
  },
})
export class CommandesGateway {
  @WebSocketServer()
  server!: Server;

  // Quand un client ouvre l'app, il se connecte
  handleConnection(client: Socket) {
    console.log(`📱 Client connecté au temps réel : ${client.id}`);
  }

  // Le client s'inscrit pour suivre UNE commande spécifique
  @SubscribeMessage('suivre_commande')
  handleMessage(@MessageBody() commandeId: string, @ConnectedSocket() client: Socket) {
    client.join(`commande_${commandeId}`);
    console.log(`👀 Client ${client.id} suit la commande ${commandeId}`);
  }

  // Fonction qui sera appelée par le Back-Office plus tard pour mettre à jour le statut
  emettreStatut(commandeId: string, statut: string) {
    this.server.to(`commande_${commandeId}`).emit('changement_statut', statut);
  }
}