import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSSRSassClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { EmailService } from "@/lib/email/resend";
import { invitationRateLimiter } from "@/lib/rate-limiting/invitation-rate-limiter";

interface InvitationResult {
  success: boolean;
  message: string;
  invitation_id?: string;
  invitation_link?: string;
  email_method: string;
  email_sent: boolean;
  rate_limit_info?: {
    remaining: number;
    resetTime: number;
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
): Promise<NextResponse<InvitationResult>> {
  try {
    const { workspaceId } = await params;
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
          email_method: "validation_error",
          email_sent: false,
        },
        { status: 400 }
      );
    }

    // Verify user is authenticated and owns the workspace
    const cookieStore = await cookies();
    const supabase = await createSSRSassClient(cookieStore);
    const adminClient = await createServerAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.getSupabaseClient().auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
          email_method: "auth_error",
          email_sent: false,
        },
        { status: 401 }
      );
    }

    // Check rate limiting (per user)
    const rateLimitIdentifier = user.id;
    const rateLimitResult =
      invitationRateLimiter.checkRateLimit(rateLimitIdentifier);

    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime);
      return NextResponse.json(
        {
          success: false,
          message: `Rate limit exceeded. You can send more invitations after ${resetDate.toLocaleString()}`,
          email_method: "rate_limited",
          email_sent: false,
          rate_limit_info: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
          },
        },
        { status: 429 }
      );
    }

    // Check if user owns the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .getSupabaseClient()
      .from("workspaces")
      .select("owner_id, name")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace || workspace.owner_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - You don't own this workspace",
          email_method: "permission_error",
          email_sent: false,
        },
        { status: 403 }
      );
    }

    // Check if the email being invited corresponds to a user who is already a member
    const { data: users } = await adminClient.auth.admin.listUsers();
    const existingUser = users?.users?.find((u) => u.email === email);

    if (existingUser) {
      // If user exists, check if they're already a member of this workspace
      const { data: existingMember } = await supabase
        .getSupabaseClient()
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          {
            success: false,
            message: "User is already a member of this workspace",
            email_method: "already_member",
            email_sent: false,
          },
          { status: 400 }
        );
      }
    }

    // Check if invitation already exists and is still pending/valid
    const { data: existingInvitation } = await supabase
      .getSupabaseClient()
      .from("invitations")
      .select("id, status, expires_at")
      .eq("workspace_id", workspaceId)
      .eq("invited_email", email)
      .single();

    if (existingInvitation) {
      // If invitation exists and is still pending and not expired, don't allow re-invite
      if (
        existingInvitation.status === "pending" &&
        new Date(existingInvitation.expires_at) > new Date()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invitation already sent and is still valid",
            email_method: "duplicate_invitation",
            email_sent: false,
            rate_limit_info: {
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime,
            },
          },
          { status: 400 }
        );
      }
    }

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .getSupabaseClient()
      .from("invitations")
      .insert({
        workspace_id: workspaceId,
        invited_email: email,
        invited_by: user.id,
      })
      .select()
      .single();

    if (invitationError) {
      throw invitationError;
    }

    // Create the invitation URL
    const inviteUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/accept-invite?token=${invitation.invitation_token}`;

    // Send invitation email using Resend
    let emailSent = false;
    let emailMethod = "";
    let emailError: string | undefined;

    try {
      // Check if Resend is configured
      if (!process.env.RESEND_API_KEY) {
        console.warn(
          "RESEND_API_KEY not configured, falling back to Supabase email"
        );

        // Fallback to Supabase email
        const { error: emailError } =
          await adminClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: inviteUrl,
            data: {
              workspace_id: workspaceId,
              invitation_token: invitation.invitation_token,
            },
          });

        if (emailError) {
          console.log(`Supabase email error for ${email}:`, emailError.message);
          emailSent = false;
          emailMethod = "supabase_fallback_error";
        } else {
          emailSent = true;
          emailMethod = "supabase_fallback";
        }
      } else {
        // Use Resend for email delivery
        const emailService = new EmailService();

        const emailResult = await emailService.sendInvitationEmail(
          email,
          workspace.name,
          user.email || "Unknown",
          inviteUrl
        );

        if (emailResult.success) {
          emailSent = true;
          emailMethod = "resend";
        } else {
          emailSent = false;
          emailMethod = "resend_error";
          emailError = emailResult.error;
          console.error(`Resend email error for ${email}:`, emailResult.error);
        }
      }
    } catch (error) {
      console.error(`Failed to send invitation to ${email}:`, error);
      emailSent = false;
      emailMethod = "send_error";
      emailError = error instanceof Error ? error.message : "Unknown error";
    }

    // Prepare the response
    const response: InvitationResult = {
      success: true,
      message: emailSent
        ? "Invitation sent successfully!"
        : "Invitation created, but email delivery failed. Please share the link manually.",
      invitation_id: invitation.id,
      invitation_link: inviteUrl,
      email_method: emailMethod,
      email_sent: emailSent,
      rate_limit_info: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    };

    if (!emailSent && emailError) {
      response.error = emailError;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send invitation",
        email_method: "server_error",
        email_sent: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const { invitationId } = await request.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Verify user is authenticated and owns the workspace
    const cookieStore = await cookies();
    const supabase = await createSSRSassClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.getSupabaseClient().auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .getSupabaseClient()
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify invitation belongs to this workspace and is still pending
    const { data: invitation, error: invitationError } = await supabase
      .getSupabaseClient()
      .from("invitations")
      .select("id, status")
      .eq("id", invitationId)
      .eq("workspace_id", workspaceId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        {
          error: "Cannot cancel invitation that is not pending",
        },
        { status: 400 }
      );
    }

    // Update invitation status to cancelled
    const { error: cancelError } = await supabase
      .getSupabaseClient()
      .from("invitations")
      .update({ status: "cancelled" })
      .eq("id", invitationId);

    if (cancelError) {
      throw cancelError;
    }

    return NextResponse.json({
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
