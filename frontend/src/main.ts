import { KnaveMail } from "./app/KnaveMail";

window.addEventListener("load", () => new KnaveMail(window).start(), { once: true });
