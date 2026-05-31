'use client';

interface FlashOverlayProps {
  active?: boolean;
}

export function FlashOverlay({ active = false }: FlashOverlayProps) {
  if (!active) {
    return null;
  }

  return (
    <div
      data-testid="flash-overlay"
      className="bg-destructive/80 pointer-events-none fixed inset-0 [animation:flash-pulse_0.5s_linear_infinite]"
      aria-hidden="true"
    />
  );
}
