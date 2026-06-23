"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCustomFields } from "@/lib/api";

interface CustomFieldsDisplayProps {
  modelName: "lead" | "customer" | "deal";
  customData?: Record<string, any>;
}

export function CustomFieldsDisplay({ modelName, customData }: CustomFieldsDisplayProps) {
  const { data: customFieldsData } = useQuery({
    queryKey: ["crm", "custom-fields"],
    queryFn: () => fetchCustomFields(),
  });

  const customFields = customFieldsData?.results ?? [];
  const fields = customFields.filter((cf) => cf.model_name === modelName);

  if (!customData || fields.length === 0) return null;

  const activeFields = fields.filter((cf) => {
    const val = customData[cf.name];
    return val !== undefined && val !== null && val !== "";
  });

  if (activeFields.length === 0) return null;

  return (
    <div className="card p-5 animate-rise">
      <div className="card-title text-[14px] uppercase tracking-wider mb-4 border-b border-line pb-2">
        Custom Attributes
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeFields.map((cf) => {
          let val = customData[cf.name];
          if (cf.field_type === "boolean") {
            val = val === true ? "Yes" : "No";
          }
          return (
            <div key={cf.id} className="space-y-1">
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider block">
                {cf.label}
              </span>
              <span className="text-[13px] text-ink font-medium">
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
