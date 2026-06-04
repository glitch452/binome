'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '@/lib/utils';

interface TooltipProps {
  /** Text shown inside the tooltip popup. */
  content: string;
  /** The element that triggers the tooltip. Must accept HTML event props. */
  children: React.ReactElement;
  /** Open delay in milliseconds. Defaults to 0 (instant). */
  delay?: number;
}

/**
 * Lightweight tooltip built on `@base-ui/react/tooltip`.
 * Wraps any trigger element and shows a short text label on hover/focus.
 * @param root0
 * @param root0.content
 * @param root0.children
 * @param root0.delay
 */
export function Tooltip({ content, children, delay = 0 }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} delay={delay} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner sideOffset={8}>
          <TooltipPrimitive.Popup
            className={cn(
              'bg-popover text-popover-foreground z-50 rounded-md px-2 py-1 text-xs shadow-md',
              'transition-[transform,scale,opacity] duration-150 ease-in-out',
              'data-ending-style:scale-95 data-ending-style:opacity-0',
              'data-starting-style:scale-95 data-starting-style:opacity-0',
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
