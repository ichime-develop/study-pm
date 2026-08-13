// 複数画面にまたがる作成フローの現在位置と完了済みステップを表示する。
type FlowStepperProps = {
  currentStep: number;
  steps: string[];
};

export const FlowStepper = ({ currentStep, steps }: FlowStepperProps) => (
  <ol aria-label="AI作成の進行状況" className="ai-plan-stepper">
    {steps.map((label, index) => {
      const step = index + 1;
      const state = step < currentStep ? "done" : step === currentStep ? "active" : "pending";
      return (
        <li aria-current={state === "active" ? "step" : undefined} className={state} key={label}>
          <span>{state === "done" ? "✓" : step}</span>
          {label}
        </li>
      );
    })}
  </ol>
);
