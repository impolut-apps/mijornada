import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const Ctx = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <div className="modal-backdrop" onClick={() => close(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="h2 center" style={{ marginBottom: 8 }}>{opts.title}</h3>
            {opts.message && <p className="muted center" style={{ marginTop: 0 }}>{opts.message}</p>}
            <div className="col" style={{ gap: 10, marginTop: 18 }}>
              <button
                className={`btn btn-block btn-lg ${opts.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => close(true)}
              >
                {opts.confirmText ?? "Confirmar"}
              </button>
              <button className="btn btn-ghost btn-block btn-lg" onClick={() => close(false)}>
                {opts.cancelText ?? "Cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx;
}
