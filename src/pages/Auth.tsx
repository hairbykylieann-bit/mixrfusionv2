import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const signupSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address").max(255),
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters").max(72),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

// Helper to check platform admin status
async function checkPlatformAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

export default function Auth() {
  // Public /auth is SIGN-IN ONLY. Account creation lives at the unlisted
  // /welcome route that Kylie shares when she sets up a salon (and the
  // server-side invite-code gate in complete-onboarding backs it up).
  const isWelcomeRoute = window.location.pathname === "/welcome";
  const [isLogin, setIsLogin] = useState(!isWelcomeRoute);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      checkPlatformAdmin(user.id).then((isPlatformAdmin) => {
        if (isPlatformAdmin) {
          navigate("/platform", { replace: true });
        } else {
          const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
          navigate(from, { replace: true });
        }
      });
    }
  }, [user, navigate, location.state]);



  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Use appropriate form based on mode - cast to any to satisfy TypeScript since both have email/password
  const form = isLogin ? loginForm : (signupForm as unknown as typeof loginForm);

  const sendResetLink = async () => {
    const email = loginForm.getValues("email");
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Enter your email above first, then tap the reset link.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
  };

  const onSubmit = async (values: LoginFormValues | SignupFormValues) => {
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(values.email, values.password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password. Please try again.");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Please verify your email before logging in.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Welcome back!");
      } else {
        const { error } = await signUp(values.email, values.password);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("This email is already registered. Try logging in instead.");
          } else if (error.message.includes("Password")) {
            toast.error("Password must be at least 6 characters.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Account created! You can now log in.");
        setIsLogin(true);
        loginForm.reset();
        signupForm.reset();
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    setShowPassword(false);
    setShowConfirmPassword(false);
    loginForm.reset();
    signupForm.reset();
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-obsidian p-4 pointer-events-auto text-foreground">
      <div className="w-full max-w-md animate-fade-up pointer-events-auto">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-10">
          <BrandLogo size="lg" tagline />
        </div>

        <Card className="border-border/50 relative z-10 pointer-events-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">{isLogin ? "Welcome back" : "Create an account"}</CardTitle>
            <CardDescription className="text-center">
              {isLogin ? "Sign in to access your salon dashboard" : "Enter your details to get started"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@example.com" autoComplete="email" autoFocus />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            className="pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isLogin && (
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              className="pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                        {signupForm.watch("confirmPassword") &&
                          signupForm.watch("password") !== signupForm.watch("confirmPassword") && (
                            <p className="text-sm font-medium text-destructive">Passwords don't match</p>
                          )}
                      </FormItem>
                    )}
                  />
                )}

                {isLogin && (
                  <div className="text-right -mt-2">
                    {resetSent ? (
                      <p className="text-xs text-success">
                        Reset link sent — check your email (and spam folder).
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={sendResetLink}
                        disabled={isSubmitting}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Forgot your password?
                      </button>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isLogin ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    <>{isLogin ? "Sign In" : "Create Account"}</>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            {!isLogin ? (
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <a href="/auth" className="underline underline-offset-2 hover:text-foreground">
                  Sign in
                </a>
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                New salon? Setup is done together with Mix R Fusion — reach out to get started.
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
