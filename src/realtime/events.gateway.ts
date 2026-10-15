import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Temps réel via socket.io (en complément du temps réel Supabase).
 *   - un client suit sa commande  : emit('suivre_commande', commandeId)
 *   - le back-office écoute tout  : emit('rejoindre_staff')
 * Événements émis : 'changement_statut' (compatibilité), 'commande_maj',
 * 'position_livreur', 'paiement', 'nouvelle_commande'.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`Socket connecté : ${client.id}`);
  }

  @SubscribeMessage('suivre_commande')
  suivre(@MessageBody() commandeId: string, @ConnectedSocket() client: Socket) {
    if (typeof commandeId === 'string' && commandeId.length < 64) {
      void client.join(`commande_${commandeId}`);
    }
    return { ok: true };
  }

  @SubscribeMessage('rejoindre_staff')
  rejoindreStaff(@ConnectedSocket() client: Socket) {
    void client.join('staff');
    return { ok: true };
  }

  commandeMiseAJour(cmd: { id: string; statut: string; [k: string]: unknown }) {
    if (!this.server) return;
    this.server.to(`commande_${cmd.id}`).emit('changement_statut', cmd.statut);
    this.server.to(`commande_${cmd.id}`).emit('commande_maj', cmd);
    this.server.to('staff').emit('commande_maj', cmd);
  }

  nouvelleCommande(cmd: Record<string, unknown>) {
    this.server?.to('staff').emit('nouvelle_commande', cmd);
  }

  position(commandeId: string, latitude: number, longitude: number) {
    const payload = { commande_id: commandeId, latitude, longitude };
    this.server?.to(`commande_${commandeId}`).emit('position_livreur', payload);
    this.server?.to('staff').emit('position_livreur', payload);
  }

  paiement(commandeId: string, payload: Record<string, unknown>) {
    this.server?.to(`commande_${commandeId}`).emit('paiement', payload);
    this.server
      ?.to('staff')
      .emit('paiement', { commande_id: commandeId, ...payload });
  }
}
