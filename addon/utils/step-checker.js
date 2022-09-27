export function modifiesSelection(steps) {
  return steps.some(
    (step) => step.type === 'selection-step' || step.type === 'operation-step'
  );
}
