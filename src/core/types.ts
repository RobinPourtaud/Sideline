import type { LocalePreference } from "../i18n";
import type { Language } from "./languages";
export type Theme = "dark" | "light" | "midnight" | "sakura" | "system";
export type DisplayStyle = "box" | "scroll" | "top" | "bottom";
export interface MessagePart {
  text: string;
  image?: string;
}
export interface Message {
  id: string;
  author: string;
  text: string;
  time?: number;
  avatar?: string;
  profileUrl?: string;
  badges?: { label: string; image?: string }[];
  parts?: MessagePart[];
  sticker?: { image: string; label: string };
}
export interface Coverage {
  threads: number;
  references: number;
  capped: boolean;
}
export interface ChatSnapshot {
  messages: Message[];
  available: boolean;
  mode: string;
}
export interface Preferences {
  version: 1;
  interfaceLanguage: LocalePreference;
  translationSource: Language;
  translationTarget: Language;
  visible: boolean;
  theme: Theme;
  displayStyle: DisplayStyle;
  scrollArea: "top" | "bottom" | "full";
  direction: "rtl" | "ltr";
  speed: number;
  density: number;
  preloadComments: number;
  fontSize: number;
  overlayFontSize: number;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
