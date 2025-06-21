import { NextRequest, NextResponse } from "next/server";
import { createSSRSassClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Verify user is authenticated and owns the workspace
    const supabase = await createSSRSassClient();
    const adminClient = await createServerAdminClient();
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

    // Check if the email being invited corresponds to a user who is already a member
    // Use admin client to check if user exists
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
          { error: "User is already a member" },
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
            error: "Invitation already sent and is still valid",
            expires_at: existingInvitation.expires_at,
          },
          { status: 400 }
        );
      }

      // If invitation exists but is expired or declined, we'll create a new one
      // (the old one will remain in the database for audit purposes)
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

    // Create the invitation URL that will be sent in the email
    const inviteUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/accept-invite?token=${invitation.invitation_token}`;

    // Send invitation email using inviteUserByEmail for everyone
    let emailSent = false;
    let emailMethod = "";

    try {
      const { error: emailError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: inviteUrl,
          data: {
            workspace_id: workspaceId,
            invitation_token: invitation.invitation_token,
          },
        });

      if (emailError) {
        console.log(
          `inviteUserByEmail error for ${email}:`,
          emailError.message
        );
        // Even if there's an error, the email might still be sent in some cases
        // So we'll assume it worked and provide the fallback link
        emailSent = false;
        emailMethod = "inviteUserByEmail_with_error";
      } else {
        emailSent = true;
        emailMethod = "inviteUserByEmail";
        console.log(`Invitation email sent to: ${email}`);
      }
    } catch (error) {
      console.error(`Failed to send invitation to ${email}:`, error);
      emailSent = false;
      emailMethod = "failed";
    }

    return NextResponse.json({
      message: emailSent
        ? "Invitation sent successfully!"
        : "Invitation created. If email failed, use the link below.",
      invitation_id: invitation.id,
      invitation_link: inviteUrl,
      email_method: emailMethod,
      email_sent: emailSent,
      instructions: !emailSent
        ? "Share this invitation link directly with the user. The link expires in 30 days."
        : undefined,
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
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
    const supabase = await createSSRSassClient();
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

    // Update invitation status to cancelled (or delete it)
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
