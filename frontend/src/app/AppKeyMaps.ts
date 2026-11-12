import { type Action, type KeyMode, LIST_BINDINGS, THREAD_BINDINGS } from "../keys/KeyBindings";
import { KeyMap } from "../keys/KeyMap";
import { ModalKeyMap } from "../keys/ModalKeyMap";

export class AppKeyMaps {
  create(): ModalKeyMap<KeyMode, Action> {
    const keyMaps = new Map<KeyMode, KeyMap<Action>>([
      ["list", new KeyMap<Action>(LIST_BINDINGS)],
      ["thread", new KeyMap<Action>(THREAD_BINDINGS)],
    ]);
    return new ModalKeyMap(keyMaps, "list");
  }
}
