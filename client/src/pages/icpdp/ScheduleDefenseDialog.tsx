import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAvailableDefenseRooms, useEventDefenseActions } from "@/hooks/useEventDefense";

interface ScheduleDefenseDialogProps {
  open: boolean;
  mode: "schedule" | "reschedule";
  eventId: string;
  eventTitle: string;
  csrfToken: string;
  excludeDefenseId?: string;
  onClose: () => void;
}

type RoomConflictKey =
  | "eventDefense.conflict_maintenance"
  | "eventDefense.conflict_booking"
  | "eventDefense.conflict_event"
  | "eventDefense.conflict_defense"
  | "eventDefense.conflict_other";

const ROOM_CONFLICT_KEYS: Record<string, RoomConflictKey> = {
  "Maintenance / Blackout": "eventDefense.conflict_maintenance",
  "Busy (Allocation / Booking)": "eventDefense.conflict_booking",
  "Busy (Event)": "eventDefense.conflict_event",
  "Busy (Defense Session)": "eventDefense.conflict_defense",
};

function roomConflictKey(reason: string | undefined): RoomConflictKey {
  return (reason && ROOM_CONFLICT_KEYS[reason]) || "eventDefense.conflict_other";
}

function defaultStartLocal(): string {
  const target = new Date(Date.now() + 72 * 3600_000);
  target.setMinutes(0, 0, 0);
  return new Date(target.getTime() + 7 * 3600_000).toISOString().slice(0, 16);
}

function toIsoFromLocal(localValue: string): string | undefined {
  if (!localValue) return undefined;
  const parsed = new Date(`${localValue}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function ScheduleDefenseDialog({
  open,
  mode,
  eventId,
  eventTitle,
  csrfToken,
  excludeDefenseId,
  onClose,
}: ScheduleDefenseDialogProps) {
  const { t } = useTranslation();
  const defenseAction = useEventDefenseActions();

  const [title, setTitle] = useState(`Defense: ${eventTitle}`.slice(0, 200));
  const [startLocal, setStartLocal] = useState(defaultStartLocal);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [propertyId, setPropertyId] = useState("");
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const startIso = toIsoFromLocal(startLocal);
  const rooms = useAvailableDefenseRooms(startIso, durationMinutes, open && Boolean(startIso), excludeDefenseId);

  const roomOptions = [
    { value: "", label: rooms.isPending ? t("eventDefense.loadingRooms") : `-- ${t("eventDefense.roomLabel")} --` },
    ...(rooms.data ?? []).map((room) => ({
      value: room.id,
      disabled: !room.available,
      label: `${room.code} · ${room.name} (${room.available ? t("eventDefense.roomAvailableSuffix") : `${t("eventDefense.roomBusySuffix")}: ${t(roomConflictKey(room.conflictReason))}`})`,
    })),
  ];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setValidationError(null);
    defenseAction.reset();
    if (!startIso) {
      setValidationError(t("eventDefense.startAtRequired"));
      return;
    }
    const startMs = new Date(startIso).getTime();
    if (mode === "schedule" && startMs - Date.now() < 48 * 3600_000) {
      setValidationError(t("eventDefense.errors.scheduleNotice", { hours: 48 }));
      return;
    }
    if (mode === "reschedule" && startMs <= Date.now()) {
      setValidationError(t("eventDefense.errors.futureStartRequired"));
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
      setValidationError(t("eventDefense.durationInvalid"));
      return;
    }
    if (mode === "schedule" && !title.trim()) {
      setValidationError(t("eventDefense.titleRequired"));
      return;
    }
    if (!propertyId) {
      setValidationError(t("eventDefense.roomRequired"));
      return;
    }

    try {
      if (mode === "schedule") {
        await defenseAction.mutateAsync({
          kind: "schedule",
          eventId,
          csrfToken,
          input: {
            title: title.trim(),
            startAt: startIso,
            durationMinutes,
            propertyId,
            ...(note.trim() ? { note: note.trim() } : {}),
          },
        });
      } else {
        await defenseAction.mutateAsync({
          kind: "respondReschedule",
          eventId,
          csrfToken,
          input: {
            accept: true,
            startAt: startIso,
            durationMinutes,
            propertyId,
            ...(note.trim() ? { note: note.trim() } : {}),
          },
        });
      }
      onClose();
    } catch (error) {
      console.error("[ScheduleDefenseDialog] schedule defense failed:", error);
    }
  }

  return (
    <AppDialog
      open={open}
      title={mode === "schedule" ? t("eventDefense.scheduleTitle") : t("eventDefense.acceptReschedule")}
      closeLabel={t("clubEvents.close")}
      onClose={() => { if (!defenseAction.isPending) onClose(); }}
      footer={(
        <AppButton type="submit" form="schedule-defense-form" disabled={defenseAction.isPending}>
          {defenseAction.isPending ? t("eventDefense.creatingSchedule") : t("eventDefense.createSchedule")}
        </AppButton>
      )}
    >
      <form id="schedule-defense-form" onSubmit={(e) => void submit(e)} className="space-y-4">
        <AppNotice>{t("eventDefense.scheduleHint")}</AppNotice>

        {mode === "schedule" && (
          <label className="block text-sm font-medium text-text-app">
            {t("eventDefense.defenseTitleLabel")}<AppRequiredMark />
            <AppInput
              value={title}
              maxLength={200}
              onChange={(e) => { setTitle(e.target.value); setValidationError(null); defenseAction.reset(); }}
              className="mt-1.5 w-full font-normal"
            />
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-text-app">
            {t("eventDefense.startAtLabel")}<AppRequiredMark />
            <AppInput
              type="datetime-local"
              value={startLocal}
              onChange={(e) => { setStartLocal(e.target.value); setPropertyId(""); setValidationError(null); defenseAction.reset(); }}
              className="mt-1.5 w-full font-normal"
            />
          </label>
          <label className="block text-sm font-medium text-text-app">
            {t("eventDefense.durationLabel")}<AppRequiredMark />
            <AppInput
              type="number"
              min={15}
              max={240}
              step={15}
              value={durationMinutes}
              onChange={(e) => { setDurationMinutes(Number(e.target.value)); setPropertyId(""); setValidationError(null); defenseAction.reset(); }}
              className="mt-1.5 w-full font-normal tabular-nums"
            />
          </label>
        </div>

        <div className="block text-sm font-medium text-text-app">
          {t("eventDefense.roomLabel")}<AppRequiredMark />
          <div className="mt-1.5">
            <AppSelect
              fitWidth
              required
              invalid={Boolean(validationError && !propertyId)}
              label={t("eventDefense.roomLabel")}
              value={propertyId}
              options={roomOptions}
              onChange={(value) => { setPropertyId(value); setValidationError(null); defenseAction.reset(); }}
              disabled={rooms.isPending}
            />
          </div>
          {rooms.data?.length === 0 && (
            <p className="mt-1 text-xs text-muted-app">{t("eventDefense.noRooms")}</p>
          )}
        </div>

        <label className="block text-sm font-medium text-text-app">
          {t("eventDefense.noteLabel")}
          <AppTextarea
            value={note}
            maxLength={2000}
            placeholder={t("eventDefense.notePlaceholder")}
            onChange={(e) => { setNote(e.target.value); defenseAction.reset(); }}
            className="mt-1.5 min-h-24 w-full font-normal"
          />
        </label>

        <AppFieldError message={validationError ?? defenseAction.error?.message ?? rooms.error?.message} />
      </form>
    </AppDialog>
  );
}
