"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Mail,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
} from "lucide-react";
import { Workspace, Invitation } from "@/lib/types";

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { user } = useGlobal();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [cancellingInvite, setCancellingInvite] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceId && user?.id) {
      loadWorkspaceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, user?.id]);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const supabase = await createSPASassClient();

      // Load workspace
      const { data: workspaceData, error: workspaceError } =
        await supabase.getWorkspace(workspaceId);
      if (workspaceError) throw workspaceError;

      setWorkspace(workspaceData);
      setIsOwner(workspaceData.owner_id === user?.id);

      // Load invitations (only if owner)
      if (workspaceData.owner_id === user?.id) {
        const { data: invitationsData, error: invitationsError } =
          await supabase.getWorkspaceInvitations(workspaceId);
        if (invitationsError) throw invitationsError;
        setInvitations(invitationsData || []);
      }

      // Load members
      const { data: membersData, error: membersError } =
        await supabase.getWorkspaceMembers(workspaceId);
      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (err) {
      setError("Failed to load workspace data");
      console.error("Error loading workspace data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          data.message?.includes("already sent") ||
          data.message?.includes("already valid")
        ) {
          setError(
            data.message ||
              "A new invitation is already pending. Please check your email."
          );
        } else if (data.message?.includes("Rate limit")) {
          setError(data.message);
        } else {
          throw new Error(
            data.message || data.error || "Failed to request new link"
          );
        }
      } else {
        setError("");
        setSuccess(data.message || "New invitation sent successfully!");
        await loadWorkspaceData(); // Reload to show the new invitation
      }

      // Handle different scenarios
      if (data.email_sent) {
        setSuccess("Invitation sent successfully!");
      } else {
        setSuccess(
          `Invitation created! Please share this link directly: ${data.invitation_link}`
        );
      }

      setInviteEmail("");
      setInviteDialogOpen(false);
      await loadWorkspaceData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send invitation"
      );
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      setCancellingInvite(invitationId);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel invitation");
      }

      setSuccess("Invitation cancelled successfully!");
      await loadWorkspaceData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel invitation"
      );
    } finally {
      setCancellingInvite(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "expired":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isInvitationExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const canCancelInvitation = (invitation: Invitation) => {
    return (
      invitation.status === "pending" &&
      !isInvitationExpired(invitation.expires_at)
    );
  };

  const canResendInvitation = (invitation: Invitation) => {
    return (
      invitation.status === "declined" ||
      invitation.status === "expired" ||
      (invitation.status === "pending" &&
        isInvitationExpired(invitation.expires_at))
    );
  };

  const handleResendInvitation = async (email: string) => {
    try {
      setInviting(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend invitation");
      }

      setSuccess("Invitation resent successfully!");
      await loadWorkspaceData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to resend invitation"
      );
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="space-y-6 p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only workspace owners can access settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold tracking-tight">
          Workspace Settings
        </h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Workspace Info */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <p className="mt-1 text-sm">{workspace?.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="mt-1 text-sm">
              {workspace?.created_at
                ? new Date(workspace.created_at).toLocaleDateString()
                : "Unknown"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({members.length})
          </CardTitle>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary-600 text-white hover:bg-primary-700">
                <Plus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="invite-email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviting}
                    className="bg-primary-600 text-white hover:bg-primary-700"
                  >
                    {inviting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No members yet</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 font-medium text-sm">
                        {member.user_id.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.user_id}</p>
                      <p className="text-sm text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      member.role === "owner"
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations (
            {invitations.filter((i) => i.status === "pending").length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No invitations sent
            </p>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{invitation.invited_email}</p>
                      <p className="text-sm text-gray-500">
                        Sent{" "}
                        {new Date(invitation.created_at).toLocaleDateString()}
                        {invitation.expires_at && (
                          <>
                            {" • "}
                            {isInvitationExpired(invitation.expires_at) ? (
                              <span className="text-red-500">Expired</span>
                            ) : (
                              <>
                                Expires{" "}
                                {new Date(
                                  invitation.expires_at
                                ).toLocaleDateString()}
                              </>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                        invitation.status
                      )}`}
                    >
                      {invitation.status}
                    </span>
                    {canResendInvitation(invitation) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleResendInvitation(invitation.invited_email)
                        }
                        disabled={inviting}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {inviting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Resend"
                        )}
                      </Button>
                    )}
                    {canCancelInvitation(invitation) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={cancellingInvite === invitation.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {cancellingInvite === invitation.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Cancel"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
