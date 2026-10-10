import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import type { BookableHours, Property, PropertyDetails, PropertyType } from "@/services/properties";
import { cn } from "@/utils/cn";

const days = [1, 2, 3, 4, 5, 6, 7];
export const dayKeys = ["properties.day1", "properties.day2", "properties.day3", "properties.day4",
  "properties.day5", "properties.day6", "properties.day7"] as const;
const types: PropertyType[] = ["ROOM", "HALL", "EQUIPMENT"];
const timeInputClass = "mt-1 min-h-11 rounded-xl border border-border-app bg-bg-app px-3 text-text-app focus-visible:border-ring-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none";

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
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bookableHours = days.flatMap((day) => hours[day]
      ? [{ day, ...(custom ? hours[day]! : shared) }] : []);
    onSubmit({
      type, name, location, equipment, bookableHours,
      ...(type === "EQUIPMENT" ? {} : { capacity: Number(capacity) }),
      blackouts: blackouts.map((blackout) => ({ reason: blackout.reason,
        startAt: blackout.startAt ? new Date(blackout.startAt).toISOString() : "",
        endAt: blackout.endAt ? new Date(blackout.endAt).toISOString() : "" })),
    });
  }

  return (
    <form className="space-y-6 rounded-2xl bg-surface-app p-4 sm:p-6" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm font-medium">{t("properties.type")}
          {property ? <p className="mt-2 font-normal">{property.code} · {t(`properties.type${property.type}`)}</p>
            : <AppSelect className="mt-2 w-full" label={t("properties.type")} value={type} onChange={setType}
              options={types.map((value) => ({ value, label: t(`properties.type${value}`) }))} />}
          {!property && <span className="mt-1 block text-xs font-normal text-muted-app">{t("properties.typeHint")}</span>}
        </div>
        <label className="text-sm font-medium">{t("properties.name")}
          <AppInput className="mt-2 block w-full" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="text-sm font-medium">{t("properties.location")}
          <AppInput className="mt-2 block w-full" maxLength={200} value={location}
            onChange={(event) => setLocation(event.target.value)} />
        </label>
        {type !== "EQUIPMENT" && <label className="text-sm font-medium">{t("properties.capacity")}
          <AppInput className="mt-2 block w-full" type="number" min="1" max="10000" value={capacity}
            onChange={(event) => setCapacity(event.target.value)} />
        </label>}
      </div>

      <div className="text-sm font-medium">{t("properties.equipment")}
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-border-app bg-bg-app p-2">
          {equipment.map((item) => <span key={item} className="flex items-center gap-1 rounded-full bg-primary-soft-app px-3 py-1 text-sm font-normal text-primary-app">
            {item}
            <button type="button" aria-label={t("properties.removeTag", { name: item })}
              onClick={() => setEquipment(equipment.filter((value) => value !== item))}>
              <AppIcon name="close" className="size-3.5" /></button>
          </span>)}
          <input className="min-w-40 flex-1 bg-transparent px-2 py-1 font-normal text-text-app outline-none" value={tag}
            placeholder={t("properties.equipmentPlaceholder")} maxLength={60}
            onChange={(event) => setTag(event.target.value)} onKeyDown={addTag} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t("properties.hours")}</legend>
        <div className="flex flex-wrap gap-2">
          {[false, true].map((value) => <button key={String(value)} type="button" onClick={() => setCustom(value)}
            className={cn("min-h-10 rounded-full border border-border-app px-4 text-sm text-muted-app",
              { "border-primary-app bg-primary-soft-app text-primary-app": custom === value })}>
            {value ? t("properties.hoursCustom") : t("properties.hoursSame")}</button>)}
        </div>
        {!custom && <>
          <div className="flex flex-wrap gap-2">{days.map((day) => (
            <button key={day} type="button" aria-pressed={Boolean(hours[day])} onClick={() => toggleDay(day)}
              className={cn("min-h-10 min-w-12 rounded-full border border-border-app px-3 text-sm text-muted-app",
                { "border-primary-app bg-primary-app text-white": Boolean(hours[day]) })}>
              {t(dayKeys[day - 1]!)}</button>))}
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="text-sm">{t("properties.from")}<input type="time" className={cn(timeInputClass, "block")}
              value={shared.open} onChange={(event) => setShared({ ...shared, open: event.target.value })} /></label>
            <label className="text-sm">{t("properties.to")}<input type="time" className={cn(timeInputClass, "block")}
              value={shared.close} onChange={(event) => setShared({ ...shared, close: event.target.value })} /></label>
          </div>
        </>}
        {custom && <ul className="divide-y divide-border-app rounded-xl border border-border-app">{days.map((day) => {
          const window = hours[day];
          return <li key={day} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <label className="flex min-h-10 w-24 items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="size-4 accent-primary-app" checked={Boolean(window)}
                onChange={() => toggleDay(day)} />{t(dayKeys[day - 1]!)}</label>
            {window ? <div className="flex flex-wrap gap-3">
              <input type="time" aria-label={`${t(dayKeys[day - 1]!)} ${t("properties.from")}`} className={timeInputClass}
                value={window.open} onChange={(event) => setHours({ ...hours, [day]: { ...window, open: event.target.value } })} />
              <input type="time" aria-label={`${t(dayKeys[day - 1]!)} ${t("properties.to")}`} className={timeInputClass}
                value={window.close} onChange={(event) => setHours({ ...hours, [day]: { ...window, close: event.target.value } })} />
            </div> : <span className="text-sm text-muted-app">{t("properties.closed")}</span>}
          </li>;
        })}</ul>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t("properties.blackouts")}</legend>
        <p className="text-xs text-muted-app">{t("properties.blackoutsHint")}</p>
        {blackouts.length === 0 && <p className="text-sm text-muted-app">{t("properties.noBlackouts")}</p>}
        {blackouts.map((blackout) => {
          function patch(update: Partial<BlackoutDraft>) {
            setBlackouts(blackouts.map((item) => item.key === blackout.key ? { ...item, ...update } : item));
          }
          return <div key={blackout.key} className="flex flex-wrap items-end gap-3 rounded-xl border border-border-app p-3">
            <label className="text-sm">{t("properties.from")}<input type="datetime-local" className={cn(timeInputClass, "block")}
              value={blackout.startAt} onChange={(event) => patch({ startAt: event.target.value })} /></label>
            <label className="text-sm">{t("properties.to")}<input type="datetime-local" className={cn(timeInputClass, "block")}
              value={blackout.endAt} onChange={(event) => patch({ endAt: event.target.value })} /></label>
            <label className="min-w-0 flex-1 basis-48 text-sm">{t("properties.blackoutReason")}
              <AppInput className="mt-1 block w-full" maxLength={200} value={blackout.reason}
                onChange={(event) => patch({ reason: event.target.value })} /></label>
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
