import { useId } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { FieldSpec, FormRecord } from "@/lib/candidates/model";
import { label } from "@/lib/candidates/model";
export function Choice({
  title,
  value,
  onChange,
  items,
  empty = "Not selected",
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
  empty?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{title}</Label>
      <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">{empty}</SelectItem>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function Fields({
  fields,
  value,
  onChange,
  errors = {},
}: {
  fields: FieldSpec[];
  value: FormRecord;
  onChange: (key: string, v: string | number | boolean | null) => void;
  errors?: Record<string, string>;
}) {
  const base = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields
        .filter(
          (f) =>
            !(f.key.startsWith("gap_") || f.key === "currently_in_gap") || value["has_career_gap"],
        )
        .map((f) => {
          const id = base + f.key;
          const v = value[f.key];
          return (
            <div
              key={f.key}
              className={
                f.type === "textarea" ? "space-y-1.5 sm:col-span-2 lg:col-span-3" : "space-y-1.5"
              }
            >
              {f.options ? (
                <Choice
                  title={f.title}
                  value={String(v ?? "")}
                  onChange={(v) => onChange(f.key, v)}
                  items={f.options.map((o) => ({ value: o, label: label(o) }))}
                />
              ) : (
                <>
                  <Label htmlFor={id}>
                    {f.title}
                    {f.required ? " *" : ""}
                  </Label>
                  {f.type === "boolean" ? (
                    <div className="flex h-9 items-center gap-3">
                      <Switch
                        id={id}
                        checked={Boolean(v)}
                        onCheckedChange={(v) => onChange(f.key, v)}
                      />
                      <span className="text-sm text-muted-foreground">{v ? "Yes" : "No"}</span>
                    </div>
                  ) : f.type === "textarea" ? (
                    <Textarea
                      id={id}
                      value={String(v ?? "")}
                      onChange={(e) => onChange(f.key, e.target.value)}
                    />
                  ) : f.type === "photo" ? (
                    <>
                      <Input
                        id={id}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 1000000) {
                            toast.error("Choose a photo smaller than 1 MB");
                            return;
                          }
                          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                            toast.error("Choose JPG, PNG or WebP");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => onChange(f.key, String(reader.result));
                          reader.readAsDataURL(file);
                        }}
                      />
                      {typeof v === "string" && v && (
                        <img
                          src={v}
                          alt="Candidate profile"
                          className="mt-2 size-20 rounded-md object-cover"
                        />
                      )}
                    </>
                  ) : (
                    <Input
                      id={id}
                      type={
                        f.type === "date"
                          ? "date"
                          : f.type === "number"
                            ? "number"
                            : f.key.includes("email")
                              ? "email"
                              : f.key.includes("mobile")
                                ? "tel"
                                : "text"
                      }
                      min={f.type === "number" ? 0 : undefined}
                      step={f.type === "number" ? "any" : undefined}
                      value={String(v ?? "")}
                      disabled={
                        (f.key === "end_date" && Boolean(value["currently_working"])) ||
                        (f.key === "gap_end_date" && Boolean(value["currently_in_gap"]))
                      }
                      onChange={(e) =>
                        onChange(
                          f.key,
                          f.type === "number"
                            ? e.target.value === ""
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                  )}
                </>
              )}
              {errors[f.key] && (
                <p className="text-xs text-destructive" role="alert">
                  {errors[f.key]}
                </p>
              )}
            </div>
          );
        })}
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${value === "DRAFT" || value === "NOT_ACTIVATED" ? "bg-muted text-muted-foreground" : value === "CANCELLED" || value === "DISCONTINUED" || value === "DISABLED" ? "bg-danger-soft text-destructive" : "bg-accent text-accent-foreground"}`}
    >
      {label(value)}
    </span>
  );
}
