"use client";

import { useToast } from "@once-ui-system/core";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import styles from "./admin.module.scss";

export { styles };

/** Loads an admin resource and exposes a reload; errors surface as a string. */
export function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await api<T>(path));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}

/** Runs a mutation, toasts the outcome and reloads on success. */
export function useAction(reload: () => unknown) {
  const { addToast } = useToast();
  const [busy, setBusy] = useState<string>();

  const run = async <T,>(key: string, action: () => Promise<T>, success?: string): Promise<T | undefined> => {
    setBusy(key);
    try {
      const result = await action();
      if (success) addToast({ variant: "success", message: success });
      await reload();
      return result;
    } catch (actionError) {
      addToast({ variant: "danger", message: errorMessage(actionError) });
      return undefined;
    } finally {
      setBusy(undefined);
    }
  };
  return { busy, run };
}
