import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoomAllocation, fetchClubRoomAllocations, fetchRoomAllocationOptions, fetchRoomAllocations,
  fetchRoomOccupancy, revokeRoomAllocation, type RoomAllocationInput } from "@/services/roomAllocations";

const allocationKey = ["room-allocations"] as const;

export function useRoomAllocationOptions(enabled: boolean) {
  return useQuery({ queryKey: [...allocationKey, "options"], enabled, retry: false,
    queryFn: ({ signal }) => fetchRoomAllocationOptions(signal) });
}
export function useRoomAllocations(semesterCode: string) {
  return useQuery({ queryKey: [...allocationKey, "list", semesterCode], enabled: Boolean(semesterCode), retry: false,
    queryFn: ({ signal }) => fetchRoomAllocations(semesterCode, signal) });
}
export function useRoomOccupancy(semesterCode: string, propertyId: string) {
  return useQuery({ queryKey: [...allocationKey, "occupancy", semesterCode, propertyId],
    enabled: Boolean(semesterCode) && Boolean(propertyId), retry: false,
    queryFn: ({ signal }) => fetchRoomOccupancy(semesterCode, propertyId, signal) });
}
export function useClubRoomAllocations(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: [...allocationKey, "club", clubId], enabled: Boolean(clubId) && enabled, retry: false,
    queryFn: ({ signal }) => fetchClubRoomAllocations(clubId, signal) });
}
export function useAllocateRoom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: { input: RoomAllocationInput; csrfToken: string }) => createRoomAllocation(action.input, action.csrfToken),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: allocationKey }); },
  });
}
export function useRevokeRoomAllocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: { id: string; reason: string; csrfToken: string }) => revokeRoomAllocation(action.id, action.reason, action.csrfToken),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: allocationKey }); },
  });
}
