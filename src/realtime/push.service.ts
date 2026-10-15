import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { App } from 'firebase-admin/app';
import type { Messaging } from 'firebase-admin/messaging';
import { SupabaseService } from '../common/supabase.service';

interface NotificationRow {
  id: string;
  cible: 'user' | 'clients' | 'staff';
  user_id: string | null;
  titre: string;
  message: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * Envoie les notifications push (Firebase Cloud Messaging).
 * Chaque ligne insérée dans la table `notifications` (par les triggers SQL)
 * est transformée en push :
 *   - cible "user"    → token FCM de l'utilisateur
 *   - cible "clients" → topic FCM "clients"
 *   - cible "staff"   → topic FCM "staff"
 * Optionnel : sans FIREBASE_SERVICE_ACCOUNT, les notifications restent
 * visibles dans les applications (temps réel Supabase), sans push.
 */
@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private messaging: Messaging | null = null;
  private canal: RealtimeChannel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly supa: SupabaseService,
  ) {}

  async onModuleInit() {
    const brut = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!brut || !this.supa.serviceRoleDisponible) {
      this.logger.log(
        'Push FCM désactivé (FIREBASE_SERVICE_ACCOUNT non défini).',
      );
      return;
    }
    try {
      const { initializeApp, cert, getApps } =
        await import('firebase-admin/app');
      const { getMessaging } = await import('firebase-admin/messaging');
      const compte = JSON.parse(brut) as Record<string, string>;
      const app: App =
        getApps()[0] ?? initializeApp({ credential: cert(compte) });
      this.messaging = getMessaging(app);
    } catch (e) {
      this.logger.error(
        `FCM : configuration invalide (${(e as Error).message})`,
      );
      return;
    }

    this.canal = this.supa.admin
      .channel('push-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => void this.envoyer(payload.new as NotificationRow),
      )
      .subscribe((statut) => this.logger.log(`Push FCM : canal ${statut}`));
  }

  async onModuleDestroy() {
    if (this.canal) await this.supa.admin.removeChannel(this.canal);
  }

  private async envoyer(n: NotificationRow) {
    if (!this.messaging) return;
    const data: Record<string, string> = {
      type: n.type,
      notification_id: n.id,
    };
    for (const [k, v] of Object.entries(n.data ?? {})) data[k] = String(v);
    const notification = { title: n.titre, body: n.message };
    try {
      if (n.cible === 'user' && n.user_id) {
        const { data: p } = await this.supa.admin
          .from('profiles')
          .select('fcm_token')
          .eq('id', n.user_id)
          .maybeSingle<{ fcm_token: string | null }>();
        if (!p?.fcm_token) return;
        await this.messaging.send({
          token: p.fcm_token,
          notification,
          data,
          android: { priority: 'high' },
        });
      } else {
        await this.messaging.send({ topic: n.cible, notification, data });
      }
    } catch (e) {
      this.logger.warn(
        `Push non envoyé (${n.cible}) : ${(e as Error).message}`,
      );
    }
  }
}
