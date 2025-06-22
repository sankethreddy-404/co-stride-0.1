interface QueuedInvitation {
  id: string;
  email: string;
  workspaceName: string;
  inviterEmail: string;
  inviteUrl: string;
  attempts: number;
  maxAttempts: number;
  nextRetry: number;
  createdAt: number;
}

class InvitationEmailQueue {
  private queue: Map<string, QueuedInvitation> = new Map();
  private processing = false;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 5000; // 5 seconds

  async addToQueue(invitation: Omit<QueuedInvitation, 'id' | 'attempts' | 'maxAttempts' | 'nextRetry' | 'createdAt'>) {
    const id = `${invitation.email}-${Date.now()}`;
    const queuedInvitation: QueuedInvitation = {
      ...invitation,
      id,
      attempts: 0,
      maxAttempts: this.maxRetries,
      nextRetry: Date.now(),
      createdAt: Date.now(),
    };

    this.queue.set(id, queuedInvitation);
    
    if (!this.processing) {
      this.processQueue();
    }

    return id;
  }

  private async processQueue() {
    if (this.processing) return;
    
    this.processing = true;

    while (this.queue.size > 0) {
      const now = Date.now();
      const readyInvitations = Array.from(this.queue.values())
        .filter(inv => inv.nextRetry <= now)
        .sort((a, b) => a.nextRetry - b.nextRetry);

      if (readyInvitations.length === 0) {
        // Wait for the next retry time
        const nextRetry = Math.min(...Array.from(this.queue.values()).map(inv => inv.nextRetry));
        const waitTime = Math.max(100, nextRetry - now);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      for (const invitation of readyInvitations) {
        try {
          await this.sendInvitation(invitation);
          this.queue.delete(invitation.id);
        } catch (error) {
          console.error(`Failed to send invitation to ${invitation.email}:`, error);
          
          invitation.attempts++;
          if (invitation.attempts >= invitation.maxAttempts) {
            console.error(`Max retries exceeded for invitation to ${invitation.email}`);
            this.queue.delete(invitation.id);
          } else {
            // Exponential backoff: 5s, 10s, 20s
            const backoffDelay = this.retryDelayMs * Math.pow(2, invitation.attempts - 1);
            invitation.nextRetry = now + backoffDelay;
            console.log(`Retrying invitation to ${invitation.email} in ${backoffDelay}ms (attempt ${invitation.attempts}/${invitation.maxAttempts})`);
          }
        }
      }

      // Small delay to prevent overwhelming the email service
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  private async sendInvitation(invitation: QueuedInvitation) {
    const { EmailService } = await import('./resend');
    const emailService = new EmailService();
    
    const result = await emailService.sendInvitationEmail(
      invitation.email,
      invitation.workspaceName,
      invitation.inviterEmail,
      invitation.inviteUrl
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    return result;
  }

  // Get queue status for monitoring
  getQueueStatus() {
    return {
      queueSize: this.queue.size,
      processing: this.processing,
      invitations: Array.from(this.queue.values()).map(inv => ({
        id: inv.id,
        email: inv.email,
        attempts: inv.attempts,
        nextRetry: inv.nextRetry,
        createdAt: inv.createdAt,
      })),
    };
  }

  // Clear failed invitations (useful for cleanup)
  clearFailed() {
    const failed = Array.from(this.queue.values())
      .filter(inv => inv.attempts >= inv.maxAttempts);
    
    failed.forEach(inv => this.queue.delete(inv.id));
    
    return failed.length;
  }
}

// Export singleton instance
export const invitationEmailQueue = new InvitationEmailQueue();