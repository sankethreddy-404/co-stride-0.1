"use client";
import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGlobal } from "@/lib/context/GlobalContext";
import { User, CheckCircle } from "lucide-react";
import { MFASetup } from "@/components/MFASetup";

export default function UserSettingsPage() {
  const { user } = useGlobal();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleError = (error: string) => {
    setError(error);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">User Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and security preferences
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Details
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  User ID
                </label>
                <p className="mt-1 text-sm">{user?.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Email
                </label>
                <p className="mt-1 text-sm">{user?.email}</p>
                <p className="mt-1 text-xs text-gray-400">Managed by Google</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Account Type
                </label>
                <p className="mt-1 text-sm">Google OAuth</p>
                <p className="mt-1 text-xs text-gray-400">
                  Your account is secured through Google. No password management
                  needed.
                </p>
              </div>
            </CardContent>
          </Card>

          <MFASetup
            onError={handleError}
            onStatusChange={() => {
              setSuccess(
                "Two-factor authentication settings updated successfully"
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
