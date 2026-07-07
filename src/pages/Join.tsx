import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, Mail, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useStaffInvitation } from "@/hooks/useStaffInvitation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PageState = "loading" | "invalid" | "signup" | "login" | "accepting" | "success" | "email_mismatch" | "email_verification";

interface InviteInfo {
  valid: boolean;
  staff_name?: string;
  email?: string;
  salon_name?: string;
  expires_at?: string;
  error?: string;
  error_code?: string;
}

export default function Join() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getInviteInfo, acceptInvite } = useStaffInvitation();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [expectedEmail, setExpectedEmail] = useState("");
  const acceptAttemptedRef = useRef(false);

  // Auth form state
  const [authMode, setAuthMode] = useState<"signup" | "login">("login");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listen for auth state changes (e.g. email verification in another tab)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          event === "SIGNED_IN" &&
          session &&
          pageState === "email_verification" &&
          !acceptAttemptedRef.current
        ) {
          // User just verified their email — proceed to accept
          acceptAttemptedRef.current = true;
          setPageState("accepting");
          await doAcceptInvite();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [pageState, shortCode]);

  // Load invite info on mount
  useEffect(() => {
    const loadInviteInfo = async () => {
      if (!shortCode) {
        setErrorMessage("Invalid invitation link");
        setPageState("invalid");
        return;
      }

      const info = await getInviteInfo(shortCode);
      setInviteInfo(info);

      if (!info.valid) {
        setErrorMessage(info.error || "Invalid invitation");
        setPageState("invalid");
        return;
      }

      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        if (session.user.email?.toLowerCase() === info.email?.toLowerCase()) {
          setPageState("accepting");
          doAcceptInvite();
        } else {
          setExpectedEmail(info.email || "");
          setPageState("email_mismatch");
        }
      } else {
        setPageState("login");
      }
    };

    loadInviteInfo();
  }, [shortCode]);

  const doAcceptInvite = async () => {
    if (!shortCode) return;

    try {
      const result = await acceptInvite.mutateAsync(shortCode);
      // Invalidate onboarding cache so ProtectedRoute doesn't redirect to /onboarding
      await queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      toast.success(`Welcome to ${result.salon_name}!`);
      setPageState("success");

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      if (error.message?.includes("sign in with")) {
        setExpectedEmail(inviteInfo?.email || "");
        setPageState("email_mismatch");
      } else {
        setErrorMessage(error.message);
        setPageState("invalid");
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteInfo?.email) return;

    setIsSubmitting(true);

    try {
      if (authMode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords don't match");
          setIsSubmitting(false);
          return;
        }

        if (password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setIsSubmitting(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: inviteInfo.email,
          password,
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            toast.error("An account with this email already exists. Please sign in instead.");
            setAuthMode("login");
          } else {
            toast.error(signUpError.message);
          }
          setIsSubmitting(false);
          return;
        }

        // If no session returned, email confirmation is required
        if (!data.session) {
          setPageState("email_verification");
          setIsSubmitting(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: inviteInfo.email,
          password,
        });

        if (signInError) {
          toast.error(signInError.message);
          setIsSubmitting(false);
          return;
        }
      }

      // Now accept the invite
      setPageState("accepting");
      await doAcceptInvite();
    } catch (error: any) {
      toast.error(error.message);
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setPageState("login");
  };

  // Loading state
  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid/Error state
  if (pageState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accepting state
  if (pageState === "accepting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Linking your account...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
            <CardTitle>Welcome to the Team!</CardTitle>
            <CardDescription>
              Your account has been linked to {inviteInfo?.salon_name}. Redirecting you now...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Email verification state
  if (pageState === "email_verification") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <MailCheck className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We sent a confirmation email to <strong>{inviteInfo?.email}</strong>.
              Please verify your email, then come back to this page — we'll automatically finish linking your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Keep this tab open. Once you confirm your email, you'll be redirected automatically.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email mismatch state
  if (pageState === "email_mismatch") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="w-12 h-12 mx-auto text-warning mb-4" />
            <CardTitle>Different Account Required</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{expectedEmail}</strong>.
              Please sign out and use the correct account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                You're currently signed in with a different email address.
                Sign out and create an account or sign in with {expectedEmail}.
              </AlertDescription>
            </Alert>
            <Button onClick={handleSignOut} className="w-full">
              Sign Out & Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup/Login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-sm text-muted-foreground mb-2">You're invited to join</p>
          <CardTitle className="text-2xl">{inviteInfo?.salon_name}</CardTitle>
          <CardDescription className="mt-2">
            {inviteInfo?.staff_name}, {authMode === "login" ? "sign in to join the team!" : "create your account to join the team!"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteInfo?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This email is linked to your invitation and cannot be changed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === "signup" ? "Create a password" : "Enter your password"}
                required
                minLength={6}
              />
            </div>

            {authMode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {authMode === "signup" ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                authMode === "signup" ? "Create Account & Join Team" : "Sign In & Join Team"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            {authMode === "login" ? (
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className="text-primary hover:underline"
                >
                  Create one
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="text-primary hover:underline"
                >
                  Sign in instead
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
