import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import type { BookableHours, Property, PropertyDetails, PropertyType } from "@/services/properties";
import { cn } from "@/utils/cn";

const days = [1, 2, 3, 4, 5, 6, 7];
export const dayKeys = ["properties.day1", "properties.day2", "properties.day3", "properties.day4",
  "properties.day5", "properties.day6", "properties.day7"] as const;
const types: PropertyType[] = ["ROOM", "HALL", "OUTDOOR", "STAGE", "EQUIPMENT"];
interface BlackoutDraft {
  key: number;
  startAt: string;
  endAt: string;
  reason: string;
}

/** `datetime-local` works in local time without a zone; convert at the boundary only. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function sameHours(hours: BookableHours[]): boolean {
  return hours.every((window) => window.open === hours[0]?.open && window.close === hours[0]?.close);
}

interface PropertyEditorProps {
  property?: Property;
  pending: boolean;
  /** Server-reported invalid field, shown next to the form. */
  error: string | null;
  onSubmit: (value: PropertyDetails & { type: PropertyType }) => void;
  onCancel: () => void;
}

export function PropertyEditor({ property, pending, error, onSubmit, onCancel }: PropertyEditorProps) {
  const { t } = useTranslation();
  const initialHours = property?.bookableHours.length ? property.bookableHours
    : days.map((day) => ({ day, open: "07:00", close: "21:00" }));
  const [type, setType] = useState<PropertyType>(property?.type ?? "ROOM");
  const [name, setName] = useState(property?.name ?? "");
  const [location, setLocation] = useState(property?.location ?? "");
  const [capacity, setCapacity] = useState(property?.capacity ? String(property.capacity) : "");
  const [equipment, setEquipment] = useState<string[]>(property?.equipment ?? []);
  const [tag, setTag] = useState("");
  const [custom, setCustom] = useState(!sameHours(initialHours));
  const [hours, setHours] = useState<Record<number, { open: string; close: string } | null>>(
    Object.fromEntries(days.map((day) => {
      const window = initialHours.find((item) => item.day === day);
      return [day, window ? { open: window.open, close: window.close } : null];
    })));
  const [shared, setShared] = useState({ open: initialHours[0]?.open ?? "07:00", close: initialHours[0]?.close ?? "21:00" });
  const [blackouts, setBlackouts] = useState<BlackoutDraft[]>((property?.blackouts ?? []).map((blackout, index) => ({
    key: index, startAt: toLocalInput(blackout.startAt), endAt: toLocalInput(blackout.endAt), reason: blackout.reason })));
  const [nextKey, setNextKey] = useState(blackouts.length);
  const bookableHours = days.flatMap((day) => hours[day] ? [{ day, ...(custom ? hours[day]! : shared) }] : []);
  const capacityValue = Number(capacity);
  const field = useFieldValidation<string>({
    name: name.trim() ? null : t("common.fieldRequired"),
    location: location.trim() ? null : t("common.fieldRequired"),
    capacity: type === "EQUIPMENT" ? null : !capacity.trim() ? t("common.fieldRequired")
      : !Number.isInteger(capacityValue) ? t("common.invalidNumber")
        : capacityValue < 1 ? t("common.numberMin", { min: 1 })
          : capacityValue > 10_000 ? t("common.numberMax", { max: 10_000 }) : null,
    hours: bookableHours.length && bookableHours.every((window) => window.open && window.close && window.open < window.close)
      ? null : t("properties.invalid_bookableHours"),
    ...Object.fromEntries(blackouts.flatMap((blackout) => [
      [`blackoutStart${blackout.key}`, blackout.startAt ? null : t("common.fieldRequired")],
      [`blackoutEnd${blackout.key}`, !blackout.endAt ? t("common.fieldRequired")
        : blackout.startAt && blackout.endAt <= blackout.startAt ? t("common.endAfterStart") : null],
      [`blackoutReason${blackout.key}`, blackout.reason.trim() ? null : t("common.fieldRequired")],
    ])),
  });

  function addTag(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    const value = tag.trim();
    if (value && !equipment.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setEquipment([...equipment, value]);
    }
    setTag("");
  }

  function toggleDay(day: number) {
    setHours({ ...hours, [day]: hours[day] ? null : { ...shared } });
    field.touch("hours");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!field.touchAll()) return;
    onSubmit({
      type, name, location, equipment, bookableHours,
      ...(type === "EQUIPMENT" ? {} : { capacity: Number(capacity) }),
      blackouts: blackouts.map((blackout) => ({ reason: blackout.reason,
        startAt: blackout.startAt ? new Date(blackout.startAt).toISOString() : "",
        endAt: blackout.endAt ? new Date(blackout.endAt).toISOString() : "" })),
    });
  }

  return (
    <form className="space-y-6 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs" noValidate onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block text-sm font-medium text-text-app">{t("properties.type")}
          {property ? <p className="mt-1.5 font-normal">{property.code} · {t(`properties.type${property.type}`)}</p>
            : <AppSelect className="mt-1.5 w-full" label={t("properties.type")} value={type} onChange={setType}
              options={types.map((value) => ({ value, label: t(`properties.type${value}`) }))} />}
          {!property && <span className="mt-1 block text-xs font-normal text-muted-app">{t("properties.typeHint")}</span>}
        </div>
        <label className="block text-sm font-medium text-text-app">{t("properties.name")}<AppRequiredMark />
          <AppInput className="mt-1.5 block w-full" maxLength={120} value={name} {...field.control("name")}
            onChange={(event) => setName(event.target.value)} />
          <AppFieldError message={field.error("name")} />
        </label>
        <label className="block text-sm font-medium text-text-app">{t("properties.location")}<AppRequiredMark />
          <AppInput className="mt-1.5 block w-full" maxLength={200} value={location} {...field.control("location")}
            onChange={(event) => setLocation(event.target.value)} />
          <AppFieldError message={field.error("location")} />
        </label>
        {type !== "EQUIPMENT" && <label className="block text-sm font-medium text-text-app">{t("properties.capacity")}<AppRequiredMark />
          <AppInput className="mt-1.5 block w-full" type="number" min="1" max="10000" value={capacity} {...field.control("capacity")}
            onChange={(event) => setCapacity(event.target.value)} />
          <AppFieldError message={field.error("capacity")} />
        </label>}
      </div>

      <div className="block text-sm font-medium text-text-app">{t("properties.equipment")}
        {/* Tag box sized like AppInput; the inner field is borderless because the box is the visible control. */}
        <div className="mt-1.5 flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-border-app bg-bg-app px-2 py-0.5 shadow-xs transition-colors focus-within:border-ring-app focus-within:ring-3 focus-within:ring-ring-app/20 sm:min-h-9">
          {equipment.map((item) => <span key={item} className="flex items-center gap-1 rounded-md bg-surface-strong-app px-2 py-0.5 text-sm font-normal text-text-app">
            {item}
            <button type="button" aria-label={t("properties.removeTag", { name: item })}
              onClick={() => setEquipment(equipment.filter((value) => value !== item))}>
              <AppIcon name="close" className="size-3.5" /></button>
          </span>)}
          <input className="h-7 min-w-40 flex-1 bg-transparent px-1 text-sm font-normal text-text-app outline-none placeholder:text-muted-app" value={tag}
            placeholder={t("properties.equipmentPlaceholder")} maxLength={60}
            onChange={(event) => setTag(event.target.value)} onKeyDown={addTag} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text-app">{t("properties.hours")}<AppRequiredMark /></legend>
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">
          {[false, true].map((value) => <button key={String(value)} type="button" onClick={() => setCustom(value)}
            className={cn("inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app",
              { "bg-segment-app text-text-app shadow-xs": custom === value })}>
            {value ? t("properties.hoursCustom") : t("properties.hoursSame")}</button>)}
        </div>
        {!custom && <>
          <div className="flex flex-wrap gap-2">{days.map((day) => (
            <button key={day} type="button" aria-pressed={Boolean(hours[day])} onClick={() => toggleDay(day)}
              className={cn("min-h-10 min-w-12 rounded-lg border border-border-app bg-bg-app px-3 text-sm font-medium text-muted-app transition-colors hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app",
                { "border-brand-app bg-primary-soft-app text-primary-app hover:bg-primary-soft-app hover:text-primary-app": Boolean(hours[day]) })}>
              {t(dayKeys[day - 1]!)}</button>))}
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="block text-sm font-medium text-text-app">{t("properties.from")}<AppInput type="time" className="mt-1.5 block"
              value={shared.open} {...field.control("hours")} onChange={(event) => setShared({ ...shared, open: event.target.value })} /></label>
            <label className="block text-sm font-medium text-text-app">{t("properties.to")}<AppInput type="time" className="mt-1.5 block"
              value={shared.close} {...field.control("hours")} onChange={(event) => setShared({ ...shared, close: event.target.value })} /></label>
          </div>
        </>}
        {custom && <ul className="divide-y divide-border-app rounded-xl border border-border-app">{days.map((day) => {
          const window = hours[day];
          return <li key={day} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <label className="flex min-h-10 w-24 items-center gap-2 text-sm font-medium text-text-app">
              <input type="checkbox" className="size-4 accent-primary-app" checked={Boolean(window)}
                onChange={() => toggleDay(day)} />{t(dayKeys[day - 1]!)}</label>
            {window ? <div className="flex flex-wrap gap-3">
              <AppInput type="time" aria-label={`${t(dayKeys[day - 1]!)} ${t("properties.from")}`}
                value={window.open} {...field.control("hours")}
                onChange={(event) => setHours({ ...hours, [day]: { ...window, open: event.target.value } })} />
              <AppInput type="time" aria-label={`${t(dayKeys[day - 1]!)} ${t("properties.to")}`}
                value={window.close} {...field.control("hours")}
                onChange={(event) => setHours({ ...hours, [day]: { ...window, close: event.target.value } })} />
            </div> : <span className="text-sm text-muted-app">{t("properties.closed")}</span>}
          </li>;
        })}</ul>}
        <AppFieldError message={field.error("hours")} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text-app">{t("properties.blackouts")}</legend>
        <p className="text-xs text-muted-app">{t("properties.blackoutsHint")}</p>
        {blackouts.length === 0 && <AppEmptyState message={t("properties.noBlackouts")} />}
        {blackouts.map((blackout) => {
          function patch(update: Partial<BlackoutDraft>) {
            setBlackouts(blackouts.map((item) => item.key === blackout.key ? { ...item, ...update } : item));
          }
          return <div key={blackout.key} className="flex flex-wrap items-end gap-3 rounded-xl border border-border-app p-3">
            <label className="block text-sm font-medium text-text-app">{t("properties.from")}<AppRequiredMark /><AppInput type="datetime-local" className="mt-1.5 block"
              value={blackout.startAt} {...field.control(`blackoutStart${blackout.key}`)} onChange={(event) => patch({ startAt: event.target.value })} />
              <AppFieldError message={field.error(`blackoutStart${blackout.key}`)} /></label>
            <label className="block text-sm font-medium text-text-app">{t("properties.to")}<AppRequiredMark /><AppInput type="datetime-local" className="mt-1.5 block"
              value={blackout.endAt} {...field.control(`blackoutEnd${blackout.key}`)} onChange={(event) => patch({ endAt: event.target.value })} />
              <AppFieldError message={field.error(`blackoutEnd${blackout.key}`)} /></label>
            <label className="min-w-0 flex-1 basis-48 block text-sm font-medium text-text-app">{t("properties.blackoutReason")}<AppRequiredMark />
              <AppInput className="mt-1.5 block w-full" maxLength={200} value={blackout.reason} {...field.control(`blackoutReason${blackout.key}`)}
                onChange={(event) => patch({ reason: event.target.value })} />
              <AppFieldError message={field.error(`blackoutReason${blackout.key}`)} /></label>
            <AppButton type="button" variant="ghost" onClick={() => setBlackouts(blackouts.filter((item) => item.key !== blackout.key))}>
              {t("properties.removeBlackout")}</AppButton>
          </div>;
        })}
        <AppButton type="button" variant="secondary" onClick={() => {
          setBlackouts([...blackouts, { key: nextKey, startAt: "", endAt: "", reason: "" }]);
          setNextKey(nextKey + 1);
        }}><AppIcon name="plus" className="size-4" />{t("properties.addBlackout")}</AppButton>
      </fieldset>

      {error && <p role="alert" className="text-sm text-danger-app">{error}</p>}
      <div className="flex flex-wrap gap-3 border-t border-border-app pt-4">
        <AppButton type="submit" disabled={pending}>
          {pending ? t("properties.saving") : property ? t("properties.save") : t("properties.create")}</AppButton>
        <AppButton type="button" variant="ghost" onClick={onCancel}>{t("properties.cancel")}</AppButton>
      </div>
    </form>
  );
}
