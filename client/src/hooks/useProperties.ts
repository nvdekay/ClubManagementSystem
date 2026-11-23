import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createProperty, deleteProperty, fetchProperties, setPropertyActive, updateProperty,
  type PropertyDetails, type PropertyType,
} from "@/services/properties";

const propertiesKeyRoot = ["properties"] as const;

export function useProperties(enabled: boolean) {
  return useQuery({ queryKey: [...propertiesKeyRoot, "catalogue"],
    queryFn: ({ signal }) => fetchProperties(signal), enabled, retry: false });
}

/** The list is sorted server-side (active first, then code), so every change refetches it. */
export function usePropertyAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action:
      | { kind: "create"; input: PropertyDetails & { type: PropertyType }; csrfToken: string }
      | { kind: "update"; id: string; details: PropertyDetails; csrfToken: string }
      | { kind: "activation"; id: string; isActive: boolean; csrfToken: string }
      | { kind: "delete"; id: string; csrfToken: string }) => {
      switch (action.kind) {
        case "create": return createProperty(action.input, action.csrfToken);
        case "update": return updateProperty(action.id, action.details, action.csrfToken);
        case "activation": return setPropertyActive(action.id, action.isActive, action.csrfToken);
        case "delete": return deleteProperty(action.id, action.csrfToken);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: propertiesKeyRoot }),
  });
}
