/**
 * The Staffroom (teachers chatting by learning area) and the jobs feed: limits and lists shared
 * by the pages and the server actions.
 */

export const GENERAL_ROOM = "general";
export const roomLabel = (room: string) =>
  room === GENERAL_ROOM ? "General" : room;

export const MESSAGE_MAX = 1000;
/** Messages a teacher can send a minute, so one person can't flood a room. */
export const MESSAGES_PER_MINUTE = 10;
/** New accounts can't post links for a few days: most spam comes from fresh sign-ups. */
export const NEW_ACCOUNT_DAYS = 3;
/** How often an open Staffroom checks for new messages. Only while the page is on screen. */
export const POLL_MS = 10_000;
/** Messages shown when a room opens. */
export const ROOM_PAGE = 50;

export const LINK_PATTERN =
  /(https?:\/\/|www\.|wa\.me|bit\.ly|\b[a-z0-9-]+\.(com|co\.ke|ke|net|org|info|me|ly)\b)/i;

export type StaffroomMessageView = {
  id: string;
  body: string;
  createdAt: string;
  author: string;
  authorId: string;
  isStaff: boolean;
  mine: boolean;
};

export const JOB_KINDS = {
  BOM: "BOM teacher",
  PRIVATE: "Private school",
  TSC: "TSC advert",
  TUITION: "Tuition or holiday",
  OTHER: "Other",
} as const;
export type JobKind = keyof typeof JOB_KINDS;

export const JOB_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const KENYA_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
] as const;
