import { EventEmitter } from 'events';

/**
 * Service de notification pour les événements des obligations
 * Permet de réagir en temps réel aux changements
 */
export class BondEventNotifier extends EventEmitter {
  private webhookUrl?: string;

  constructor(webhookUrl?: string) {
    super();
    this.webhookUrl = webhookUrl;
  }

  /**
   * Notifie un transfert de token
   */
  async notifyTransfer(data: {
    bondId: string;
    bondName: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    txHash: string;
    timestamp: number;
  }) {
    console.log(`📤 Transfert détecté: ${data.amount} tokens de ${data.bondName}`);
    
    this.emit('transfer', data);
    
    if (this.webhookUrl) {
      await this.sendWebhook('transfer', data);
    }
  }

  /**
   * Notifie un nouveau holder
   */
  async notifyNewHolder(data: {
    bondId: string;
    bondName: string;
    holderAddress: string;
    initialBalance: string;
    timestamp: number;
  }) {
    console.log(`👤 Nouveau détenteur: ${data.holderAddress} pour ${data.bondName}`);
    
    this.emit('new_holder', data);
    
    if (this.webhookUrl) {
      await this.sendWebhook('new_holder', data);
    }
  }

  /**
   * Notifie un paiement de coupon
   */
  async notifyCouponPayment(data: {
    bondId: string;
    bondName: string;
    totalAmount: string;
    recipientCount: number;
    timestamp: number;
  }) {
    console.log(`💰 Coupon distribué: ${data.totalAmount} à ${data.recipientCount} holders`);
    
    this.emit('coupon_payment', data);
    
    if (this.webhookUrl) {
      await this.sendWebhook('coupon_payment', data);
    }
  }

  /**
   * Notifie un holder qui n'a plus de tokens
   */
  async notifyHolderExit(data: {
    bondId: string;
    bondName: string;
    holderAddress: string;
    timestamp: number;
  }) {
    console.log(`🚪 Holder sorti: ${data.holderAddress} de ${data.bondName}`);
    
    this.emit('holder_exit', data);
    
    if (this.webhookUrl) {
      await this.sendWebhook('holder_exit', data);
    }
  }

  /**
   * Notifie une balance importante
   */
  async notifyLargeBalance(data: {
    bondId: string;
    bondName: string;
    holderAddress: string;
    balance: string;
    percentageOfTotal: number;
    timestamp: number;
  }) {
    console.log(`⚠️  Grosse position: ${data.holderAddress} détient ${data.percentageOfTotal}% de ${data.bondName}`);
    
    this.emit('large_balance', data);
    
    if (this.webhookUrl) {
      await this.sendWebhook('large_balance', data);
    }
  }

  /**
   * Envoie un webhook HTTP
   */
  private async sendWebhook(event: string, data: any) {
    if (!this.webhookUrl) return;

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          data,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        console.error(`❌ Erreur webhook: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du webhook:', error);
    }
  }

  /**
   * Configure l'URL du webhook
   */
  setWebhookUrl(url: string) {
    this.webhookUrl = url;
  }
}
