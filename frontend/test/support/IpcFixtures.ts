import { readFileSync } from "node:fs";

export class IpcFixtures {
  private static readonly directory: string = `${import.meta.dir}/../../../tests/fixtures/ipc`;

  read(name: string): unknown {
    return JSON.parse(readFileSync(`${IpcFixtures.directory}/${name}.json`, "utf8"));
  }
}
