import type { ReactNode } from "react";
import {
  AlertHexaIcon,
  AlertIcon,
  BoltIcon,
  BoxCubeIcon,
  BoxIcon,
  BoxIconLine,
  CalenderIcon,
  ChatIcon,
  CheckCircleIcon,
  CheckLineIcon,
  DocsIcon,
  DollarLineIcon,
  DownloadIcon,
  EnvelopeIcon,
  EyeCloseIcon,
  EyeIcon,
  FileIcon,
  FolderIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  InfoIcon,
  ListIcon,
  LockIcon,
  MailIcon,
  PageIcon,
  PaperPlaneIcon,
  PencilIcon,
  PieChartIcon,
  PlugInIcon,
  ShootingStarIcon,
  TableIcon,
  TaskIcon,
  TimeIcon,
  TrashBinIcon,
  UserCircleIcon,
  UserIcon,
  VideoIcon,
} from "../icons";

export type SidebarIconOption = {
  key: string;
  label: string;
  node: ReactNode;
};

/** Pickable icons for the Menus form (visual grid). */
export const SIDEBAR_ICON_OPTIONS: SidebarIconOption[] = [
  { key: "pie-chart", label: "Chart", node: <PieChartIcon /> },
  { key: "grid", label: "Grid", node: <GridIcon /> },
  { key: "folder", label: "Folder", node: <FolderIcon /> },
  { key: "box", label: "Box", node: <BoxIcon /> },
  { key: "box-line", label: "Box line", node: <BoxIconLine /> },
  { key: "box-cube", label: "Cube", node: <BoxCubeIcon /> },
  { key: "table", label: "Table", node: <TableIcon /> },
  { key: "list", label: "List", node: <ListIcon /> },
  { key: "page", label: "Page", node: <PageIcon /> },
  { key: "docs", label: "Docs", node: <DocsIcon /> },
  { key: "file", label: "File", node: <FileIcon /> },
  { key: "task", label: "Task", node: <TaskIcon /> },
  { key: "calendar", label: "Calendar", node: <CalenderIcon /> },
  { key: "time", label: "Time", node: <TimeIcon /> },
  { key: "user", label: "User", node: <UserIcon /> },
  { key: "user-circle", label: "User circle", node: <UserCircleIcon /> },
  { key: "group", label: "Group", node: <GroupIcon /> },
  { key: "eye", label: "Eye", node: <EyeIcon /> },
  { key: "eye-close", label: "Eye close", node: <EyeCloseIcon /> },
  { key: "lock", label: "Lock", node: <LockIcon /> },
  { key: "pencil", label: "Pencil", node: <PencilIcon /> },
  { key: "check-circle", label: "Check", node: <CheckCircleIcon /> },
  { key: "check-line", label: "Check line", node: <CheckLineIcon /> },
  { key: "bolt", label: "Bolt", node: <BoltIcon /> },
  { key: "plug-in", label: "Plug-in", node: <PlugInIcon /> },
  { key: "shooting-star", label: "Star", node: <ShootingStarIcon /> },
  { key: "download", label: "Download", node: <DownloadIcon /> },
  { key: "paper-plane", label: "Send", node: <PaperPlaneIcon /> },
  { key: "chat", label: "Chat", node: <ChatIcon /> },
  { key: "mail", label: "Mail", node: <MailIcon /> },
  { key: "envelope", label: "Envelope", node: <EnvelopeIcon /> },
  { key: "dollar", label: "Dollar", node: <DollarLineIcon /> },
  { key: "info", label: "Info", node: <InfoIcon /> },
  { key: "alert", label: "Alert", node: <AlertIcon /> },
  { key: "alert-hexa", label: "Alert hexa", node: <AlertHexaIcon /> },
  { key: "trash", label: "Trash", node: <TrashBinIcon /> },
  { key: "video", label: "Video", node: <VideoIcon /> },
  { key: "more", label: "More", node: <HorizontaLDots /> },
];

const ICON_BY_KEY: Record<string, ReactNode> = Object.fromEntries(
  SIDEBAR_ICON_OPTIONS.map((opt) => [opt.key, opt.node]),
);

// Aliases for older seeds / free-typed values
ICON_BY_KEY.piechart = ICON_BY_KEY["pie-chart"];
ICON_BY_KEY.boxcube = ICON_BY_KEY["box-cube"];
ICON_BY_KEY.boxline = ICON_BY_KEY["box-line"];
ICON_BY_KEY.usercircle = ICON_BY_KEY["user-circle"];
ICON_BY_KEY.users = ICON_BY_KEY.group;
ICON_BY_KEY.calender = ICON_BY_KEY.calendar;
ICON_BY_KEY.checkcircle = ICON_BY_KEY["check-circle"];
ICON_BY_KEY.checkline = ICON_BY_KEY["check-line"];
ICON_BY_KEY.edit = ICON_BY_KEY.pencil;
ICON_BY_KEY.settings = ICON_BY_KEY.lock;
ICON_BY_KEY.plugin = ICON_BY_KEY["plug-in"];
ICON_BY_KEY.star = ICON_BY_KEY["shooting-star"];
ICON_BY_KEY.send = ICON_BY_KEY["paper-plane"];
ICON_BY_KEY.email = ICON_BY_KEY.mail;
ICON_BY_KEY.fingerprint = ICON_BY_KEY.time;
ICON_BY_KEY["finger-error"] = ICON_BY_KEY.time;
ICON_BY_KEY.finger_error = ICON_BY_KEY.time;

/** Canonical keys shown in docs / datalist. */
export const SIDEBAR_ICON_KEYS = SIDEBAR_ICON_OPTIONS.map((o) => o.key);

export function resolveSidebarIcon(
  iconKey?: string | null,
  menuCode?: string | null,
): ReactNode {
  const key = String(iconKey || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (key && ICON_BY_KEY[key]) return ICON_BY_KEY[key];

  const code = String(menuCode || "").toLowerCase();
  if (code.includes("dashboard")) return ICON_BY_KEY["pie-chart"];
  if (code.includes("profile") || code.includes("user")) return ICON_BY_KEY.user;
  if (code.includes("roster") || code.includes("calendar")) {
    return ICON_BY_KEY.calendar;
  }
  if (
    code.includes("work_pattern") ||
    code.includes("work-pattern") ||
    code.includes("pola") ||
    code.includes("task")
  ) {
    return ICON_BY_KEY.task;
  }
  if (code.includes("sakit") || code.includes("sickness")) {
    return ICON_BY_KEY.alert;
  }
  if (code.includes("permit") || code.includes("ijin")) {
    return ICON_BY_KEY.file;
  }
  if (
    code.includes("finger_error") ||
    code.includes("finger-error") ||
    code.includes("fingerprint")
  ) {
    return ICON_BY_KEY.time;
  }
  if (code.includes("reconcil")) return ICON_BY_KEY["check-circle"];
  if (
    code.includes("permission") ||
    code.includes("privilege") ||
    code.includes("policy")
  ) {
    return ICON_BY_KEY.lock;
  }
  if (code.includes("enum") || code.includes("docs")) return ICON_BY_KEY.docs;
  if (code.includes("menu")) return ICON_BY_KEY.page;
  if (code.includes("jobsite") || code.includes("level")) {
    return ICON_BY_KEY.table;
  }
  if (code.includes("master")) return ICON_BY_KEY.folder;
  return ICON_BY_KEY.grid;
}
