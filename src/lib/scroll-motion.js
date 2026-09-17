// Symmetric, time-based easing: large scroll changes catch up without overshoot.
export function followReveal(current, target, dt, softness = .06) {
  const gap = Math.abs(target - current);
  const response = softness / (1 + gap * 8);
  return current + (target - current) * -Math.expm1(-Math.max(0, dt) / response);
}
