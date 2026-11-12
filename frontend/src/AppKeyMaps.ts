import { type Action, type KeyMode, LIST_BINDINGS, THREAD_BINDINGS } from "./KeyBindings";
import { KeyMap } from "./KeyMap";
import { ModalKeyMap } from "./ModalKeyMap";

export class AppKeyMaps {
  create(): ModalKeyMap<KeyMode, Action> {
    const keyMaps = new Map<KeyMode, KeyMap<Action>>([
      ["list", new KeyMap<Action>(LIST_BINDINGS)],
      ["thread", new KeyMap<Action>(THREAD_BINDINGS)],
    ]);
    return new ModalKeyMap(keyMaps, "list");
  }
}
