import { useCallback, useEffect } from "react";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import { TOUR_STEPS } from "./tourSteps";
import "./DashboardTour.css";

export const TOUR_STORAGE_KEY = "urbanflow-tour-completed";

export function CustomTooltip({
  continuous,
  index,
  isLastStep,
  size,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}) {
  return (
    <div className="urbanflow-tour-tooltip" {...tooltipProps}>
      <div className="tour-tooltip__header">
        <div className="tour-tooltip__header-main">
          <span className="tour-tooltip__badge">
            Step {index + 1} of {size}
          </span>
          {step.title && <h3 className="tour-tooltip__title">{step.title}</h3>}
        </div>
        <button
          type="button"
          className="tour-tooltip__close-btn"
          aria-label="Close"
          {...closeProps}
        >
          ✕
        </button>
      </div>

      <div className="tour-tooltip__body">
        {step.content}
      </div>

      <div className="tour-tooltip__footer">
        <div className="tour-tooltip__footer-left">
          {continuous && !isLastStep && (
            <button
              type="button"
              className="tour-btn tour-btn--skip"
              {...skipProps}
              aria-label="Skip Tour"
            >
              Skip Tour
            </button>
          )}
        </div>
        <div className="tour-tooltip__footer-right">
          {index > 0 && (
            <button
              type="button"
              className="tour-btn tour-btn--back"
              {...backProps}
              aria-label="Back"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            className="tour-btn tour-btn--primary"
            {...primaryProps}
            aria-label={isLastStep ? "Finish Tour" : "Next"}
          >
            {isLastStep ? "Finish Tour 🎉" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardTour({ run, onToggleRun, activePage, onNavigate, stepIndex, setStepIndex }) {
  // Ensure the correct page is loaded and scrolled to top when current step changes
  useEffect(() => {
    if (!run) return;
    const currentStep = TOUR_STEPS[stepIndex];
    if (currentStep?.page && currentStep.page !== activePage) {
      onNavigate(currentStep.page);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [run, stepIndex, activePage, onNavigate]);

  const handleJoyrideCallback = useCallback(
    (data) => {
      const { action, index, status, type } = data;

      // Handle tour completion or skip
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        onToggleRun(false);
        setStepIndex(0);
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, "true");
        } catch {
          // Ignore localStorage errors (e.g. private browsing)
        }
        return;
      }

      // Handle close button click
      if (action === ACTIONS.CLOSE) {
        onToggleRun(false);
        setStepIndex(0);
        return;
      }

      // Handle step navigation (Next or Back)
      if (type === EVENTS.STEP_AFTER) {
        const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        if (nextIndex >= 0 && nextIndex < TOUR_STEPS.length) {
          const nextStep = TOUR_STEPS[nextIndex];
          if (nextStep?.page && nextStep.page !== activePage) {
            onNavigate(nextStep.page);
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          }
          setStepIndex(nextIndex);
        } else {
          onToggleRun(false);
          setStepIndex(0);
          try {
            localStorage.setItem(TOUR_STORAGE_KEY, "true");
          } catch {
            // Ignore
          }
        }
      } else if (type === EVENTS.TARGET_NOT_FOUND) {
        // Safely skip missing or delayed targets without crashing
        console.warn(`[UrbanFlow Tour] Target not found for step ${index}:`, data.step?.target);
        const nextIndex = index + 1;
        if (nextIndex < TOUR_STEPS.length) {
          const nextStep = TOUR_STEPS[nextIndex];
          if (nextStep?.page && nextStep.page !== activePage) {
            onNavigate(nextStep.page);
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          }
          setStepIndex(nextIndex);
        } else {
          onToggleRun(false);
          setStepIndex(0);
        }
      }
    },
    [activePage, onNavigate, onToggleRun, setStepIndex]
  );

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      tooltipComponent={CustomTooltip}
      onEvent={handleJoyrideCallback}
      callback={handleJoyrideCallback}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish Tour",
        next: "Next",
        skip: "Skip Tour",
      }}
      options={{
        arrowColor: "#ffffff",
        backgroundColor: "#ffffff",
        overlayColor: "rgba(15, 23, 42, 0.65)",
        primaryColor: "#2563eb",
        textColor: "#0f172a",
        width: 440,
        zIndex: 10000,
        targetWaitTimeout: 3000,
        disableScrolling: false,
        scrollOffset: 120,
        spotlightPadding: 16,
      }}
    />
  );
}
