import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSetupProgress, SetupStep } from "@/hooks/useSetupProgress";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { cn } from "@/lib/utils";

function StepCard({ step, index }: { step: SetupStep; index: number }) {
  const navigate = useNavigate();
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
    >
      <button
        onClick={() => navigate(step.route)}
        className={cn(
          "w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left",
          "hover:bg-accent/50 hover:border-primary/30",
          step.isComplete
            ? "bg-primary/5 border-primary/20"
            : "bg-card border-border"
        )}
      >
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            step.isComplete
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {step.isComplete ? (
            <Check className="w-5 h-5" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-medium",
              step.isComplete ? "text-primary" : "text-foreground"
            )}
          >
            {step.title}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {step.description}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </button>
    </motion.div>
  );
}

export function SetupWizard() {
  const navigate = useNavigate();
  const {
    steps,
    completedSteps,
    totalSteps,
    progressPercent,
    allStepsComplete,
  } = useSetupProgress();
  const { updateSettings, isUpdating } = useSalonSettings();

  const handleComplete = () => {
    updateSettings({ setup_completed_at: new Date().toISOString() } as any);
  };

  // Find first incomplete step for the main CTA
  const nextStep = steps.find((s) => !s.isComplete);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Let's get you set up!</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComplete}
              disabled={isUpdating}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Complete these steps to get the most out of your salon management.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">
                {completedSteps} of {totalSteps} complete
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, index) => (
              <StepCard key={step.id} step={step} index={index} />
            ))}
          </div>

          {/* CTA */}
          {allStepsComplete ? (
            <Button onClick={handleComplete} className="w-full" disabled={isUpdating}>
              <Check className="w-4 h-4 mr-2" />
              Mark Setup Complete
            </Button>
          ) : nextStep ? (
            <Button onClick={() => navigate(nextStep.route)} className="w-full">
              {nextStep.actionText}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
