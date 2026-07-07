import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Landing page for Supabase password-recovery links. The link signs the user
 * into a temporary recovery session; we let them set a new password, then
 * send them into the app.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The recovery link may still be exchanging the token when we mount —
    // listen briefly instead of checking once.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      setChecking(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const save = async () => {
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords don't match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — you're signed in.");
    navigate("/", { replace: true });
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-obsidian p-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <BrandLogo size="lg" />
        </div>
        <Card className="border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Set a new password</CardTitle>
            <CardDescription className="text-center">
              {checking ? "Checking your reset link…" : hasSession ? "Choose a new password for your account." : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checking ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !hasSession ? (
              <div className="text-center space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  This reset link has expired or was already used. Request a fresh one from the sign-in page.
                </p>
                <Button variant="outline" onClick={() => navigate("/auth")}>Back to sign in</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={show ? "text" : "password"}
                    placeholder="New password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input
                  type={show ? "text" : "password"}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                />
                <Button className="w-full" disabled={saving} onClick={save}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update password
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
