import { browserLanguages } from "../../src/browser/locale";
import "./style.css";
import { readPreferences } from "../../src/browser/preferences";
import { defaults } from "../../src/core/preferences";
import { renderPopup } from "./render";

renderPopup(await readPreferences().catch(() => defaults), browserLanguages());
