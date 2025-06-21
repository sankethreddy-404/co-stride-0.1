"use client";

import React, { useState, useEffect } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import { Plus, Users, Calendar, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Workspace } from "@/lib/types";

type WorkspaceWithMembers = Workspace & {
  workspace_members: Array<{ role: string; user_id: string }> | null;
};

export default function WorkspacesPage() {
  const { user } = useGlobal();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadWorkspaces();
    }
  }, [user?.id]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const supabase = await createSPASassClient();
      const { data, error } = await supabase.getMyWorkspaces();

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (err) {
      setError("Failed to load workspaces");
      console.error("Error loading workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      setCreating(true);
      const supabase = await createSPASassClient();
      const { error } = await supabase.createWorkspace(newWorkspaceName.trim());

      if (error) throw error;

      setNewWorkspaceName("");
      setCreateDialogOpen(false);
      await loadWorkspaces();
    } catch (err) {
      setError("Failed to create workspace");
      console.error("Error creating workspace:", err);
    } finally {
      setCreating(false);
    }
  };

  const getUserRole = (workspace: WorkspaceWithMembers) => {
    if (workspace.owner_id === user?.id) {
      return "owner";
    }
    const memberInfo = workspace.workspace_members?.find(
      (m) => m.user_id === user?.id
    );
    return memberInfo?.role || "member";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">
            Collaborate with your team on progress updates and accountability
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary-600 text-white hover:bg-primary-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="workspace-name" className="text-sm font-medium">
                  Workspace Name
                </label>
                <Input
                  id="workspace-name"
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-primary-600 text-white hover:bg-primary-700"
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Workspace
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No workspaces yet
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Create your first workspace to start collaborating with your team
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-primary-600 text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{workspace.name}</CardTitle>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      getUserRole(workspace) === "owner"
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {getUserRole(workspace)}
                  </span>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created {new Date(workspace.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>Members</span>
                  </div>
                  <Link href={`/app/workspaces/${workspace.id}`}>
                    <Button variant="outline" size="sm">
                      Open Workspace
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
