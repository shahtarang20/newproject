import * as React from 'react';
import * as M from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/utils/cn';

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;
export const DropdownMenuPortal = M.Portal;
export const DropdownMenuSub = M.Sub;
export const DropdownMenuRadioGroup = M.RadioGroup;

const itemBase =
  'relative flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0';
const contentBase =
  'z-50 min-w-[10rem] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-float data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof M.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof M.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <M.SubTrigger ref={ref} className={cn(itemBase, 'data-[state=open]:bg-secondary', inset && 'pl-8', className)} {...props}>
    {children}
    <ChevronRight className="ml-auto" />
  </M.SubTrigger>
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof M.SubContent>,
  React.ComponentPropsWithoutRef<typeof M.SubContent>
>(({ className, ...props }, ref) => <M.SubContent ref={ref} className={cn(contentBase, className)} {...props} />);
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof M.Content>,
  React.ComponentPropsWithoutRef<typeof M.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <M.Portal>
    <M.Content ref={ref} sideOffset={sideOffset} className={cn(contentBase, className)} {...props} />
  </M.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof M.Item>,
  React.ComponentPropsWithoutRef<typeof M.Item> & { inset?: boolean; destructive?: boolean }
>(({ className, inset, destructive, ...props }, ref) => (
  <M.Item
    ref={ref}
    className={cn(itemBase, inset && 'pl-8', destructive && 'text-destructive focus:bg-destructive/10 focus:text-destructive', className)}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof M.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof M.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <M.CheckboxItem ref={ref} className={cn(itemBase, 'pl-8', className)} checked={checked} {...props}>
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
      <M.ItemIndicator>
        <Check className="h-4 w-4" />
      </M.ItemIndicator>
    </span>
    {children}
  </M.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof M.RadioItem>,
  React.ComponentPropsWithoutRef<typeof M.RadioItem>
>(({ className, children, ...props }, ref) => (
  <M.RadioItem ref={ref} className={cn(itemBase, 'pl-8', className)} {...props}>
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
      <M.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </M.ItemIndicator>
    </span>
    {children}
  </M.RadioItem>
));
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof M.Label>,
  React.ComponentPropsWithoutRef<typeof M.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <M.Label ref={ref} className={cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', inset && 'pl-8', className)} {...props} />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof M.Separator>,
  React.ComponentPropsWithoutRef<typeof M.Separator>
>(({ className, ...props }, ref) => <M.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />);
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';
