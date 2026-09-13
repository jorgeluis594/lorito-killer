"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TableDraftItem, TableSession } from "../types";
import { saveTableDraft } from "../actions";

export function useTableDraft(session: TableSession) {
  const [items, setItems] = useState<TableDraftItem[]>(session.draft ?? []);
  const [status, setStatus] = useState<
    "saved" | "pending" | "saving" | "error"
  >("saved");
  const [error, setError] = useState("");
  const current = useRef(items);
  const saved = useRef(items);
  const revision = useRef(session.draftRevision ?? 0);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const edit = (next: TableDraftItem[]) => {
    current.current = next;
    setItems(next);
    setStatus("pending");
    setError("");
  };

  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;
    const save = async () => {
      while (current.current !== saved.current) {
        const snapshot = current.current;
        setStatus("saving");
        try {
          const result = await saveTableDraft({
            sessionId: session.id,
            revision: revision.current,
            items: snapshot,
          });
          if (!result.success) {
            setError(result.message);
            setStatus("error");
            return false;
          }
          revision.current = result.data.revision;
          saved.current = snapshot;
        } catch {
          setError(
            "No pudimos guardar los cambios. Revisa tu conexión y vuelve a intentar.",
          );
          setStatus("error");
          return false;
        }
      }
      setStatus("saved");
      setError("");
      return true;
    };
    inFlight.current = save();
    try {
      return await inFlight.current;
    } finally {
      inFlight.current = null;
    }
  }, [session.id]);

  useEffect(() => {
    if (current.current === saved.current) return;
    const timeout = setTimeout(() => void flush(), 500);
    return () => clearTimeout(timeout);
  }, [items, flush]);

  useEffect(() => {
    // A realtime refresh may update a clean draft, never replace local edits.
    if (current.current !== saved.current || inFlight.current) return;
    if ((session.draftRevision ?? 0) > revision.current) {
      revision.current = session.draftRevision ?? 0;
      current.current = session.draft ?? [];
      saved.current = current.current;
      setItems(current.current);
    }
  }, [session.draft, session.draftRevision]);

  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (current.current !== saved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, []);

  const reloadSaved = () => {
    current.current = saved.current;
    window.location.reload();
  };
  return { items, edit, flush, revision, status, error, reloadSaved };
}
