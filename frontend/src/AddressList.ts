import { AddressScanner } from "./AddressScanner";

const SEPARATOR = ", ";

export class AddressList {
  split(text: string): string[] {
    const scanner = new AddressScanner();
    for (const character of text) scanner.read(character);
    return scanner.addresses().filter((address) => address.length > 0);
  }

  join(addresses: readonly string[]): string {
    return addresses.join(SEPARATOR);
  }
}
