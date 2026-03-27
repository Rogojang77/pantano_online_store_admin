import { useState, useCallback } from "react";

export function useOdooExtraJson() {
  const [odooFieldsJson, setOdooFieldsJson] = useState("{}");
  const [odooFieldsError, setOdooFieldsError] = useState<string | null>(null);

  const parseOdooFields = useCallback((): Record<string, unknown> | null => {
    setOdooFieldsError(null);
    try {
      const parsed = JSON.parse(odooFieldsJson || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid");
      }
      return parsed as Record<string, unknown>;
    } catch {
      setOdooFieldsError("Odoo fields must be valid JSON object.");
      return null;
    }
  }, [odooFieldsJson]);

  const resetJson = useCallback(() => {
    setOdooFieldsJson("{}");
    setOdooFieldsError(null);
  }, []);

  return {
    odooFieldsJson,
    setOdooFieldsJson,
    odooFieldsError,
    setOdooFieldsError,
    parseOdooFields,
    resetJson,
  };
}
