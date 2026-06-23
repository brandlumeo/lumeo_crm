"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCustomFields } from "@/lib/api";

interface CustomFieldsFormInputsProps {
  modelName: "lead" | "customer" | "deal";
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

export function CustomFieldsFormInputs({ modelName, values, onChange }: CustomFieldsFormInputsProps) {
  const { data: customFieldsData, isLoading } = useQuery({
    queryKey: ["crm", "custom-fields"],
    queryFn: () => fetchCustomFields(),
  });

  const customFields = customFieldsData?.results ?? [];
  const fields = customFields.filter((cf) => cf.model_name === modelName);

  if (isLoading || fields.length === 0) return null;

  const handleFieldChange = (key: string, value: any) => {
    onChange({
      ...values,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-line">
      <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
        Additional Information
      </span>
      {fields.map((cf) => {
        const value = values[cf.name] ?? "";

        return (
          <label key={cf.id} className="block">
            <span className="label flex items-center gap-1">
              {cf.label}
              {cf.required && <span className="text-red-500 font-bold">*</span>}
            </span>

            {cf.field_type === "boolean" ? (
              <select
                className="select"
                value={value === true ? "true" : value === false ? "false" : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFieldChange(cf.name, val === "true" ? true : val === "false" ? false : "");
                }}
                required={cf.required}
              >
                <option value="">-- Choose Option --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : cf.field_type === "number" ? (
              <input
                type="number"
                step="any"
                className="input"
                placeholder={`Enter ${cf.label.toLowerCase()}`}
                value={value}
                onChange={(e) => handleFieldChange(cf.name, e.target.value)}
                required={cf.required}
              />
            ) : cf.field_type === "date" ? (
              <input
                type="date"
                className="input"
                value={value}
                onChange={(e) => handleFieldChange(cf.name, e.target.value)}
                required={cf.required}
              />
            ) : (
              <input
                type="text"
                className="input"
                placeholder={`Enter ${cf.label.toLowerCase()}`}
                value={value}
                onChange={(e) => handleFieldChange(cf.name, e.target.value)}
                required={cf.required}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
