import type { ErrorKind } from "../../src/bridge/Protocol";

export type ScalarType = "string" | "number" | "boolean" | "strings" | "nullable string" | "error kind";

export type Shape = { readonly [field: string]: FieldType };

export type FieldType = ScalarType | Shape | ListOf;

export type ShapeOf<T> = { readonly [K in keyof T]-?: FieldType };

export class ListOf {
  constructor(readonly item: Shape) {}
}

export class JsonShape {
  private static readonly errorKinds: Record<ErrorKind, true> = {
    usage: true,
    "not-found": true,
    "auth-required": true,
    network: true,
    throttled: true,
    internal: true,
  };

  problemsIn(value: unknown, type: FieldType, path: string): string[] {
    if (type instanceof ListOf) return this.listProblems(value, type.item, path);
    if (typeof type === "string") return this.fits(value, type) ? [] : [`${path}: expected ${type}`];
    return this.objectProblems(value, type, path);
  }

  private listProblems(value: unknown, item: Shape, path: string): string[] {
    if (!Array.isArray(value) || value.length === 0) return [`${path}: expected a list with entries`];
    return value.flatMap((entry, index) => this.problemsIn(entry, item, `${path}[${index}]`));
  }

  private objectProblems(value: unknown, shape: Shape, path: string): string[] {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return [`${path}: expected an object`];
    const record = value as Record<string, unknown>;
    const unknownFields = Object.keys(record)
      .filter((field) => !(field in shape))
      .map((field) => `${path}.${field}: not in the protocol`);
    const fieldProblems = Object.entries(shape).flatMap(([field, type]) =>
      this.problemsIn(record[field], type, `${path}.${field}`),
    );
    return [...unknownFields, ...fieldProblems];
  }

  private fits(value: unknown, type: ScalarType): boolean {
    switch (type) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number";
      case "boolean":
        return typeof value === "boolean";
      case "strings":
        return Array.isArray(value) && value.every((item) => typeof item === "string");
      case "nullable string":
        return value === null || typeof value === "string";
      case "error kind":
        return typeof value === "string" && Object.hasOwn(JsonShape.errorKinds, value);
    }
  }
}
