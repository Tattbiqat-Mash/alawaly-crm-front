"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OPEN_SERVICE_REQUEST_STATUSES } from "@/config/statuses";
import { ownerPortalApi, type NewServiceRequest, type NewWarrantyClaim } from "./api";

// No push channel yet: owner data refreshes on open and when the app regains focus.
const live = { refetchOnWindowFocus: true } as const;
/** A 404 means "not yours / not there": show it at once, retrying will not change it. */
const noRetryOn404 = (count: number, error: unknown) => count < 2 && (error as { status?: number })?.status !== 404;

function useOwnerMutation<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner"] }) });
}

// ---------- units (O04, O05) ----------
export const useMyUnits = () => useQuery({ queryKey: ["owner", "units"], queryFn: ownerPortalApi.units, ...live });
export const useMyUnit = (id: number) => useQuery({ queryKey: ["owner", "unit", id], queryFn: () => ownerPortalApi.unit(id), retry: noRetryOn404, ...live });
export const useEligibility = (id: number | null) =>
  useQuery({ queryKey: ["owner", "eligibility", id], queryFn: () => ownerPortalApi.eligibility(id!), enabled: id !== null, retry: noRetryOn404 });

// ---------- reserve and pay (O06–O08) ----------
export const useAvailability = (unitId: number) =>
  useQuery({ queryKey: ["owner", "availability", unitId], queryFn: () => ownerPortalApi.availability(unitId), retry: noRetryOn404, ...live });
export const useReserve = () => useOwnerMutation(({ unitId, key }: { unitId: number; key: string }) => ownerPortalApi.reserve(unitId, key));
export const useMyReservations = () => useQuery({ queryKey: ["owner", "reservations"], queryFn: ownerPortalApi.reservations, ...live });
export const useCancelReservation = () => useOwnerMutation((id: number) => ownerPortalApi.cancelReservation(id));
export const useInitiateReservationPayment = () =>
  useOwnerMutation(({ reservationId, key }: { reservationId: number; key: string }) => ownerPortalApi.initiateReservationPayment(reservationId, key));
/** Server-verified payment state; polled while not yet paid so confirmation shows up by itself. */
export const usePayment = (id: number) =>
  useQuery({
    queryKey: ["owner", "payment", id],
    queryFn: () => ownerPortalApi.payment(id),
    retry: noRetryOn404,
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "paid" ? 30_000 : false),
    ...live,
  });

// ---------- purchase and handover (O09, O10) ----------
export const useMySales = () => useQuery({ queryKey: ["owner", "sales"], queryFn: ownerPortalApi.sales, ...live });
export const useInstallments = (saleId: number) =>
  useQuery({ queryKey: ["owner", "sales", saleId, "installments"], queryFn: () => ownerPortalApi.installments(saleId), retry: noRetryOn404, ...live });
export const useMyHandover = (saleId: number) =>
  useQuery({ queryKey: ["owner", "sales", saleId, "handover"], queryFn: () => ownerPortalApi.handover(saleId), retry: noRetryOn404, ...live });
export const useAcceptHandover = () => useOwnerMutation((id: number) => ownerPortalApi.acceptHandover(id));

// ---------- warranties and service (O11–O14) ----------
export const useMyWarranties = () => useQuery({ queryKey: ["owner", "warranties"], queryFn: ownerPortalApi.warranties, ...live });

export const REQUEST_FILTERS = ["all", "open", "done"] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];
const DONE_STATUSES = ["completed", "closed", "rejected"] as const;

export const useMyRequests = (filter: RequestFilter) =>
  useQuery({
    queryKey: ["owner", "requests", filter],
    queryFn: () => ownerPortalApi.requests(filter === "open" ? OPEN_SERVICE_REQUEST_STATUSES : filter === "done" ? DONE_STATUSES : null),
    ...live,
  });
export const useMyRequest = (id: number) => useQuery({ queryKey: ["owner", "request", id], queryFn: () => ownerPortalApi.request(id), retry: noRetryOn404, ...live });

export const useCreateRequest = () =>
  useOwnerMutation(({ kind, body, key }: { kind: "warranty"; body: NewWarrantyClaim; key: string } | { kind: "service"; body: NewServiceRequest; key: string }) =>
    kind === "warranty" ? ownerPortalApi.createWarrantyClaim(body, key) : ownerPortalApi.createRequest(body, key),
  );
export const useAttachPhoto = (requestId: number) =>
  useOwnerMutation(({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) => ownerPortalApi.attachPhoto(requestId, file, onProgress));
export const useFeedback = (requestId: number) => useOwnerMutation((body: { rating: number; comment?: string }) => ownerPortalApi.feedback(requestId, body));
export const useReopen = (requestId: number) => useOwnerMutation((reason: string) => ownerPortalApi.reopen(requestId, reason));

// ---------- notifications (O15) ----------
export const useMyNotifications = (page: number) =>
  useQuery({ queryKey: ["owner", "notifications", "page", page], queryFn: () => ownerPortalApi.notifications(page), ...live });
export const useMarkRead = () => useOwnerMutation((id: number) => ownerPortalApi.markRead(id));

// ---------- rentals (O16) ----------
export const useMyMandates = () => useQuery({ queryKey: ["owner", "mandates"], queryFn: ownerPortalApi.mandates, ...live });
export const useMyStatements = (mandateId: number, enabled: boolean) =>
  useQuery({ queryKey: ["owner", "mandates", mandateId, "statements"], queryFn: () => ownerPortalApi.statements(mandateId), enabled });
