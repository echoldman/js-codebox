export enum BreakpointType { GetVar, SetVar }

export interface BreakpointFunction {
  (): any;
}

interface Breakpoint {
  type: BreakpointType;
  comment: string;
  name: string;
  resolve: any;
  fun: BreakpointFunction;
}

class Breakpoints {
  private _breakpoints: Breakpoint[];

  public constructor() {
    this._breakpoints = [];
  }

  get count(): number {
    return this._breakpoints.length;
  }

  public put(type: BreakpointType, comment: string, name: string, resolve: any, fun: BreakpointFunction): void {
    this._breakpoints.push({ type, comment, name, resolve, fun });
  }

  public pop(): Breakpoint | undefined {
    return this._breakpoints.shift();
  }
}

export interface BreakpointEvent {
  comment: string;
  name: string;
}

export interface BreakpointEventCallback {
  (event: BreakpointEvent): void;
}

export class Debugger {

  private _watchings: string[];

  private _breakpoints: Breakpoints;

  private _callbackGetVar: BreakpointEventCallback;
  private _callbackSetVar: BreakpointEventCallback;

  public constructor() {
    this._watchings = [];
    this._breakpoints = new Breakpoints();

    // @ts-ignore
    this._callbackGetVar = null;
    // @ts-ignore
    this._callbackSetVar = null;
  }

  get breakpoints(): Breakpoints {
    return this._breakpoints;
  }

  public isWatching(name: string): boolean {
    const len = this._watchings.length;
    for (let i = 0; i < len; i++) {
      const existing = this._watchings[i];
      if (existing === name) {
        return true;
      }
    }
    return false;
  }

  public watch(name: string): boolean {
    let existed = this.isWatching(name);
    if (!(this.isWatching(name))) {
      this._watchings.push(name);
      return true;
    } else {
      return false
    }
  }

  public unwatch(name: string): boolean {
    let existed = false;
    const len = this._watchings.length;
    for (let i = 0; i < len; i++) {
      const existing = this._watchings[i];
      if (existing === name) {
        this._watchings.splice(i, 1);
        existed = true;
        break
      }
    }

    return existed;
  }

  public enterBreakpoint(type: BreakpointType, comment: string, name: string, fun: BreakpointFunction): Promise<void> {
    // enter event.
    switch (type) {
      case BreakpointType.GetVar: {
        if (this._callbackGetVar !== null) {
          (new Promise<void>((resolve: any) => {
            this._callbackGetVar({ comment, name })
            resolve();
          })).then(() => { }).catch(() => { });
        }
        break;
      }
      case BreakpointType.SetVar: {
        if (this._callbackSetVar !== null) {
          (new Promise<void>((resolve: any) => {
            this._callbackSetVar({ comment, name })
            resolve();
          })).then(() => { }).catch(() => { });
        }
        break;
      }
    }

    return new Promise<void>((resolve: any) => {
      this._breakpoints.put(type, comment, name, resolve, fun);
    });
  }

  public on(type: BreakpointType, callback: BreakpointEventCallback): void {
    switch (type) {
      case BreakpointType.GetVar: {
        this._callbackGetVar = callback;
        break;
      }
      case BreakpointType.SetVar: {
        this._callbackSetVar = callback;
        break;
      }
      default: {
        throw new Error(`Unknown breakpoint type: ${type}`);
      }
    }
  }

  public continue(): boolean {
    const breakpoint = this._breakpoints.pop();
    if (breakpoint !== undefined) {
      const result = breakpoint.fun();
      breakpoint.resolve(result);
      return true;
    } else {
      return false;
    }
  }
}
