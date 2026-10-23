import { useCallback, useEffect, useState } from "react";
import { notifySocketUrl } from "../config/env";
import { useAuth } from "../context/AuthContext";
import { usePermission } from "./usePermission";
import { api } from "../lib/api";

export type LiveNotice = {
  module: string;
  id: number;
  nrp: string;
  full_name: string;
  jabatan: string;
  queue: string;
  url: string;
  created_at?: string | null;
};

type NoticeResponse = {
  success?: boolean;
  data?: LiveNotice[];
};

const QUEUE_LABEL: Record<string, string> = {
  group: "Group Leader",
  section: "Section Head",
  department: "Department",
  hr: "Personalia HR",
};

export function queueLabel(queue: string) {
  return QUEUE_LABEL[queue] || "Atasan";
}

/**
 * One socket while an approver is signed in.
 * The list is filled once from GET /api/notifications; later rows arrive on the socket.
 */
export function useLiveNotifications() {
  const { token, isAuthenticated } = useAuth();
  const sakitSection = usePermission("hr_sickness_section");
  const sakitGroup = usePermission("hr_sickness_group");
  const sakitDepartment = usePermission("hr_sickness_department");
  const sakitPersonalia = usePermission("hr_sickness_hr");
  const ijinSection = usePermission("hr_permit_section");
  const ijinGroup = usePermission("hr_permit_group");
  const ijinDepartment = usePermission("hr_permit_department");
  const ijinPersonalia = usePermission("hr_permit_hr");
  const enabled =
    isAuthenticated &&
    Boolean(token) &&
    (sakitSection.canApprove ||
      sakitGroup.canApprove ||
      sakitDepartment.canApprove ||
      sakitPersonalia.canApprove ||
      ijinSection.canApprove ||
      ijinGroup.canApprove ||
      ijinDepartment.canApprove ||
      ijinPersonalia.canApprove);

  const [items, setItems] = useState<LiveNotice[]>([]);
  const [unseen, setUnseen] = useState(false);
  const [toast, setToast] = useState<LiveNotice | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      setItems([]);
      setUnseen(false);
      setToast(null);
      return;
    }

    let socket: WebSocket | null = null;
    let stopped = false;

    const remember = (notice: LiveNotice, announce: boolean) => {
      setItems((current) => {
        const next = [
          notice,
          ...current.filter(
            (item) => !(item.module === notice.module && item.id === notice.id),
          ),
        ];
        return next.slice(0, 20);
      });
      if (announce) {
        setUnseen(true);
        setToast(notice);
        window.dispatchEvent(
          new CustomEvent("myhr-notify", { detail: notice }),
        );
      }
    };

    api
      .get<NoticeResponse>("/notifications")
      .then((body) => {
        if (stopped) return;
        setItems(Array.isArray(body.data) ? body.data.slice(0, 20) : []);
      })
      .catch(() => {
        if (!stopped) setItems([]);
      });

    socket = new WebSocket(notifySocketUrl(token));
    socket.onmessage = (event) => {
      try {
        const notice = JSON.parse(String(event.data)) as LiveNotice;
        if (!notice?.module || !notice.id) return;
        remember(notice, true);
      } catch {
        /* ignore a malformed frame */
      }
    };

    return () => {
      stopped = true;
      socket?.close();
    };
  }, [enabled, token]);

  const markSeen = useCallback(() => setUnseen(false), []);
  const dismissToast = useCallback(() => setToast(null), []);

  return {
    enabled,
    items,
    unseen,
    toast,
    markSeen,
    dismissToast,
  };
}
