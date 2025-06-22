export interface InvitationEmailData {
  workspaceName: string;
  inviterEmail: string;
  inviteUrl: string;
  invitedEmail: string;
  expirationDate: string;
}

export class EmailTemplates {
  static generateInvitationSubject(workspaceName: string): string {
    return `You've been invited to join ${workspaceName}`;
  }

  static generateReminderSubject(workspaceName: string): string {
    return `Reminder: Your invitation to join ${workspaceName} expires soon`;
  }

  static generateInvitationHTML(data: InvitationEmailData): string {
    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || 'CoStride';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://costride.com';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Invitation</title>
    <!--[if mso]>
    <style>
        table, tr, td {border-collapse: collapse;}
    </style>
    <![endif]-->
    <style>
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 20px !important; }
            .button { padding: 12px 24px !important; font-size: 16px !important; }
        }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f8fafc; 
            line-height: 1.6;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header { 
            background: linear-gradient(135deg, #0c98d0 0%, #0670a3 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .content { padding: 40px 30px; }
        .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #0c98d0 0%, #0670a3 100%); 
            color: white !important; 
            text-decoration: none; 
            padding: 16px 32px; 
            border-radius: 8px; 
            font-weight: 600; 
            margin: 20px 0; 
            border: none;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        .button:hover { transform: translateY(-1px); }
        .footer { 
            background-color: #f1f5f9; 
            padding: 20px 30px; 
            text-align: center; 
            color: #64748b; 
            font-size: 14px; 
        }
        .workspace-name { color: #0c98d0; font-weight: 600; }
        .inviter { color: #334155; font-weight: 500; }
        .highlight-box {
            background-color: #f0f9ff;
            border-left: 4px solid #0c98d0;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .feature-list {
            background-color: #fafafa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .feature-list ul {
            margin: 0;
            padding-left: 20px;
        }
        .feature-list li {
            margin: 8px 0;
            color: #374151;
        }
    </style>
</head>
<body>
    <div style="padding: 20px;">
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${productName}</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Team Accountability Platform</p>
            </div>
            
            <div class="content">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 24px;">You've been invited to collaborate! 🎉</h2>
                
                <p style="color: #374151; font-size: 16px;">
                    <span class="inviter">${data.inviterEmail}</span> has invited you to join the 
                    <span class="workspace-name">${data.workspaceName}</span> workspace on ${productName}.
                </p>
                
                <div class="highlight-box">
                    <p style="margin: 0; color: #0c4a6e; font-weight: 500;">
                        🚀 Ready to boost your team's accountability and collaboration?
                    </p>
                </div>
                
                <div class="feature-list">
                    <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">What you'll get:</h3>
                    <ul>
                        <li>📊 <strong>Daily Progress Tracking</strong> - Share updates with your team</li>
                        <li>⭐ <strong>Peer Feedback System</strong> - Rate and comment on team progress</li>
                        <li>🤖 <strong>AI-Powered Insights</strong> - Get intelligent summaries and recommendations</li>
                        <li>📈 <strong>Team Analytics</strong> - Track performance and engagement metrics</li>
                        <li>💬 <strong>Real-time Collaboration</strong> - Stay connected with your team</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.inviteUrl}" class="button" style="font-size: 18px;">
                        🚀 Accept Invitation & Join Team
                    </a>
                </div>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        ⏰ <strong>Time-sensitive:</strong> This invitation expires on ${data.expirationDate}
                    </p>
                </div>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
                        <strong>Having trouble with the button?</strong> Copy and paste this link:
                    </p>
                    <p style="background-color: #f8fafc; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px; margin: 0;">
                        <a href="${data.inviteUrl}" style="color: #0c98d0;">${data.inviteUrl}</a>
                    </p>
                </div>
                
                <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                    If you don't want to join this workspace, you can safely ignore this email. 
                    No account will be created for you.
                </p>
            </div>
            
            <div class="footer">
                <p style="margin: 0; font-weight: 500;">
                    This invitation was sent by ${productName}
                </p>
                <p style="margin: 5px 0 0 0;">
                    on behalf of ${data.inviterEmail}
                </p>
                <p style="margin: 15px 0 0 0;">
                    <a href="${siteUrl}" style="color: #0c98d0; text-decoration: none;">
                        Visit ${productName} →
                    </a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  static generateInvitationText(data: InvitationEmailData): string {
    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || 'CoStride';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://costride.com';
    
    return `
🎉 You've been invited to join ${data.workspaceName}!

${data.inviterEmail} has invited you to join the ${data.workspaceName} workspace on ${productName}.

🚀 What you'll get:
• Daily Progress Tracking - Share updates with your team
• Peer Feedback System - Rate and comment on team progress  
• AI-Powered Insights - Get intelligent summaries and recommendations
• Team Analytics - Track performance and engagement metrics
• Real-time Collaboration - Stay connected with your team

Accept your invitation:
${data.inviteUrl}

⏰ Time-sensitive: This invitation expires on ${data.expirationDate}

If you don't want to join this workspace, you can safely ignore this email. No account will be created for you.

---
This invitation was sent by ${productName} on behalf of ${data.inviterEmail}
${siteUrl}
`;
  }
}