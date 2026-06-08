'use client';

import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import { cn } from '@/lib/utils';

const MenuRoot = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;
const MenuPortal = MenuPrimitive.Portal;

function MenuPositioner({ className, ...props }: MenuPrimitive.Positioner.Props) {
  return <MenuPrimitive.Positioner data-slot="menu-positioner" className={cn('isolate z-50', className)} {...props} />;
}

function MenuPopup({ className, ...props }: MenuPrimitive.Popup.Props) {
  return (
    <MenuPrimitive.Popup
      data-slot="menu-popup"
      className={cn(
        'bg-popover text-popover-foreground min-w-36 rounded-lg border p-1 shadow-md outline-none',
        'origin-(--transform-origin) transition-[transform,scale,opacity] duration-150 ease-in-out',
        'data-ending-style:scale-95 data-ending-style:opacity-0',
        'data-starting-style:scale-95 data-starting-style:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none',
        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator data-slot="menu-separator" className={cn('bg-border my-1 h-px', className)} {...props} />
  );
}

function MenuGroup({ className, ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="menu-group" className={cn(className)} {...props} />;
}

function MenuGroupLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-group-label"
      className={cn('text-muted-foreground px-2 py-1 text-xs tracking-widest uppercase', className)}
      {...props}
    />
  );
}

function MenuRadioGroup({ className, ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" className={cn(className)} {...props} />;
}

function MenuRadioItem({ className, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none',
        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function MenuRadioItemIndicator({ className, ...props }: MenuPrimitive.RadioItemIndicator.Props) {
  return (
    <MenuPrimitive.RadioItemIndicator
      data-slot="menu-radio-item-indicator"
      className={cn('ml-auto', className)}
      {...props}
    />
  );
}

export {
  MenuRoot,
  MenuTrigger,
  MenuPortal,
  MenuPositioner,
  MenuPopup,
  MenuItem,
  MenuSeparator,
  MenuGroup,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
};
