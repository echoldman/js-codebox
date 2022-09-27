export interface CodeboxEntry {
  (...params: any[]): void;
}

export class Codebox {

  public id: string | null;

  public description: string | null;

  public entry: CodeboxEntry;

  constructor() {
    this.id = null;
    this.description = null;
    this.entry = () => { };
  }
}
