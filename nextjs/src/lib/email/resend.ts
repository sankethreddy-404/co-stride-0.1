import { Resend } from 'resend';

export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    this.resend = new Resend(apiKey);
  }

  async sendInvitationEmail(
    toEmail: string,
    workspaceName: string,
    inviterEmail: string,
    inviteUrl: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@costride.com',
        to: toEmail,
        subject: `You've been invited to join ${workspaceName}`,
        html: this.generateInvitationEmailHTML(workspaceName, inviterEmail, inviteUrl),
        text: this.generateInvitationEmailText(workspaceName, inviterEmail, inviteUrl),
      });

      if (error) {
        console.error('Resend email error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  private generateInvitationEmailHTML(
    workspaceName: string,
    inviterEmail: string,
    inviteUrl: string
  ): string {
    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || 'CoStride';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Invitation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .workspace-name { color: #0284c7; font-weight: 600; }
        .inviter { color: #374151; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">${productName}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Team Accountability Platform</p>
        </div>
        
        <div class="content">
            <h2 style="color: #111827; margin-top: 0;">You've been invited!</h2>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px;">
                <span class="inviter">${inviterEmail}</span> has invited you to join the 
                <span class="workspace-name">${workspaceName}</span> workspace on ${productName}.
            </p>
            
            <p style="color: #374151; line-height: 1.6; font-size: 16px;">
                ${productName} helps teams stay accountable through daily progress updates, 
                peer feedback, and AI-powered insights. Join your team to start collaborating!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #0284c7; word-break: break-all;">${inviteUrl}</a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                This invitation will expire in 30 days. If you don't want to join this workspace, 
                you can safely ignore this email.
            </p>
        </div>
        
        <div class="footer">
            <p style="margin: 0;">
                This invitation was sent by ${productName} on behalf of ${inviterEmail}
            </p>
            <p style="margin: 5px 0 0 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://costride.com'}" style="color: #0284c7;">
                    ${process.env.NEXT_PUBLIC_SITE_URL || 'https://costride.com'}
                </a>
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateInvitationEmailText(
    workspaceName: string,
    inviterEmail: string,
    inviteUrl: string
  ): string {
    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || 'CoStride';
    
    return `
You've been invited to join ${workspaceName}!

${inviterEmail} has invited you to join the ${workspaceName} workspace on ${productName}.

${productName} helps teams stay accountable through daily progress updates, peer feedback, and AI-powered insights. Join your team to start collaborating!

Accept your invitation by clicking this link:
${inviteUrl}

This invitation will expire in 30 days. If you don't want to join this workspace, you can safely ignore this email.

---
This invitation was sent by ${productName} on behalf of ${inviterEmail}
${process.env.NEXT_PUBLIC_SITE_URL || 'https://costride.com'}
`;
  }
}