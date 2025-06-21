"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSPASassClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { CheckCircle, Loader2, AlertCircle, Users } from "lucide-react";
import { Invitation, Workspace } from "@/lib/types";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [processingAction, setProcessingAction] = useState<
    "accept" | "reject" | "request_link" | null
  >(null);
  const [showRequestLink, setShowRequestLink] = useState(false);
  const [requestLinkEmail, setRequestLinkEmail] = useState("");

  const verifyInvitation = async () => {
    try {
      const supabase = await createSPASassClient();

      // First try to get invitation details regardless of expiration
      const { data: invitationData, error: invitationError } = await supabase
        .getSupabaseClient()
        .from("invitations")
        .select(
          `
                    *,
                    workspaces(name)
                `
        )
        .eq("invitation_token", token)
        .single();

      if (invitationError || !invitationData) {
        setError("Invalid invitation link");
        setLoading(false);
        return;
      }

      // Check if invitation is expired or not pending
      const isExpired = new Date(invitationData.expires_at) < new Date();
      const isNotPending = invitationData.status !== "pending";

      if (isExpired || isNotPending) {
        setInvitation(invitationData);
        setWorkspace(invitationData.workspaces);
        setRequestLinkEmail(invitationData.invited_email);

        if (isExpired) {
          setError(
            "This invitation has expired. You can request a new link below."
          );
        } else if (invitationData.status === "declined") {
          setError(
            "This invitation was declined. You can request a new link below."
          );
        } else if (invitationData.status === "accepted") {
          setError("This invitation has already been accepted.");
        } else if (invitationData.status === "cancelled") {
          setError(
            "This invitation has been cancelled. You can request a new link below."
          );
        }

        setShowRequestLink(
          isExpired ||
            invitationData.status === "declined" ||
            invitationData.status === "cancelled"
        );
        setLoading(false);
        return;
      }

      // Invitation is valid
      setInvitation(invitationData);
      setWorkspace(invitationData.workspaces);
      setLoading(false);
    } catch (err) {
      console.error("Error verifying invitation:", err);
      setError("Failed to verify invitation");
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    try {
      setProcessingAction("accept");
      setError("");

      const supabase = await createSPASassClient();

      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.getSupabaseClient().auth.getUser();

      if (!user) {
        // User not authenticated - redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.href);
        router.push(
          `/auth/login?returnUrl=${returnUrl}&message=Please log in to accept this invitation`
        );
        return;
      }

      // User is authenticated - proceed with accepting invitation
      await joinWorkspace(invitation!.workspace_id, invitation!.id);
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError("Failed to accept invitation");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectInvitation = async () => {
    try {
      setProcessingAction("reject");
      setError("");

      const supabase = await createSPASassClient();

      // Update invitation status to declined - no auth required for rejection
      const { error: invitationError } = await supabase.updateInvitationStatus(
        invitation!.id,
        "declined"
      );

      if (invitationError) throw invitationError;

      setRejected(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      console.error("Error rejecting invitation:", err);
      setError("Failed to reject invitation");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRequestNewLink = async () => {
    try {
      setProcessingAction("request_link");
      setError("");

      if (!requestLinkEmail || !invitation?.workspace_id) {
        setError("Missing required information to request new link");
        return;
      }

      const response = await fetch(
        `/api/workspaces/${invitation.workspace_id}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: requestLinkEmail }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes("already sent")) {
          setError(
            "A new invitation is already pending. Please check your email."
          );
        } else {
          throw new Error(data.error || "Failed to request new link");
        }
      } else {
        setError("");
        setSuccess(true);
        // Show success message instead of redirecting
      }
    } catch (err) {
      console.error("Error requesting new link:", err);
      setError(
        err instanceof Error ? err.message : "Failed to request new link"
      );
    } finally {
      setProcessingAction(null);
    }
  };

  useEffect(() => {
    if (token) {
      verifyInvitation();
    } else {
      setError("Invalid invitation link");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const joinWorkspace = async (workspaceId: string, invitationId: string) => {
    try {
      const supabase = await createSPASassClient();
      const {
        data: { user },
      } = await supabase.getSupabaseClient().auth.getUser();

      if (!user) {
        setError("Authentication required");
        return;
      }

      // Add user to workspace
      const { error: memberError } = await supabase.joinWorkspace(
        workspaceId,
        user.id
      );
      if (memberError) throw memberError;

      // Update invitation status
      const { error: invitationError } = await supabase.updateInvitationStatus(
        invitationId,
        "accepted"
      );
      if (invitationError) throw invitationError;

      setSuccess(true);
      setTimeout(() => {
        router.push(`/app/workspaces/${workspaceId}`);
      }, 2000);
    } catch (err) {
      console.error("Error joining workspace:", err);
      setError("Failed to join workspace");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-4" />
            <p className="text-gray-600">Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {processingAction === "request_link"
                ? "New Link Sent!"
                : "Welcome to the team!"}
            </h2>
            <p className="text-gray-600 text-center mb-4">
              {processingAction === "request_link"
                ? `A new invitation link has been sent to ${requestLinkEmail}. Please check your email.`
                : `You have successfully joined ${workspace?.name}`}
            </p>
            {processingAction !== "request_link" && (
              <p className="text-sm text-gray-500">
                Redirecting to workspace...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invitation Declined
            </h2>
            <p className="text-gray-600 text-center mb-4">
              You have declined the invitation to join{" "}
              <strong>{workspace?.name}</strong>
            </p>
            <p className="text-sm text-gray-500">Redirecting to home page...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <Users className="h-12 w-12 text-primary-600" />
          </div>
          <CardTitle className="text-center">Workspace Invitation</CardTitle>
          {workspace && (
            <p className="text-center text-gray-600">
              You have been invited to join <strong>{workspace.name}</strong>
            </p>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Invitation for: <strong>{invitation?.invited_email}</strong>
            </p>

            {/* Show accept/reject buttons only for valid invitations */}
            {!showRequestLink && (
              <div className="space-y-3">
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={processingAction !== null}
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                >
                  {processingAction === "accept" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Accept Invitation
                </Button>

                <Button
                  onClick={handleRejectInvitation}
                  disabled={processingAction !== null}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  {processingAction === "reject" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Decline Invitation
                </Button>
              </div>
            )}

            {/* Show request new link button for expired/cancelled invitations */}
            {showRequestLink && (
              <div className="space-y-3">
                <Button
                  onClick={handleRequestNewLink}
                  disabled={processingAction !== null}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  {processingAction === "request_link" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Request New Invitation Link
                </Button>
              </div>
            )}

            {!showRequestLink && (
              <p className="text-sm text-gray-500">
                If you accept, you may need to log in or create an account.
              </p>
            )}

            {showRequestLink && (
              <p className="text-sm text-gray-500">
                A new invitation email will be sent to your email address.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-4" />
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
