/**
 * useConfirm Hook
 * Provides an imperative API for showing confirmation dialogs
 * 
 * Usage:
 * const { confirm, ConfirmDialogComponent } = useConfirm();
 * 
 * // In your handler:
 * const confirmed = await confirm({
 *   title: "Delete Item?",
 *   description: "This action cannot be undone.",
 *   confirmLabel: "Delete",
 *   variant: "destructive",
 * });
 * if (confirmed) { ... }
 * 
 * // In your JSX (render once at component level):
 * return (
 *   <>
 *     {ConfirmDialogComponent}
 *     ...rest of your UI
 *   </>
 * )
 */

import * as React from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

const defaultState: ConfirmState = {
  open: false,
  title: "",
  description: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  variant: "default",
  resolve: null,
};

export function useConfirm() {
  const [state, setState] = React.useState<ConfirmState>(defaultState);

  const confirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        ...options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState(defaultState);
  }, [state.resolve]);

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false);
    setState(defaultState);
  }, [state.resolve]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      state.resolve?.(false);
      setState(defaultState);
    }
  }, [state.resolve]);

  // The dialog component to render
  const ConfirmDialogComponent = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return {
    confirm,
    ConfirmDialogComponent,
  };
}

// =============================================================================
// Global Confirm Provider (Alternative approach)
// For cases where you want a single global confirm dialog
// =============================================================================

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { confirm, ConfirmDialogComponent } = useConfirm();

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {ConfirmDialogComponent}
    </ConfirmContext.Provider>
  );
}

export function useGlobalConfirm() {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error("useGlobalConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}

