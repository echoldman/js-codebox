import { Codebox } from './codebox';
import { BreakpointType, BreakpointFunction, Debugger } from './debug';

function stringEqualIgnoreCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function variantTypeIs(variant: any, type: string): boolean {
  return stringEqualIgnoreCase(Object.prototype.toString.call(variant), `[object ${type}]`);
}

export interface RuntimeDone {
  (result: any): void;
}

export class RunnerError extends Error {

  private _type: ErrorType;

  public constructor(error: Error | string, type: ErrorType) {
    if (variantTypeIs(error, 'string')) {
      super(<string>error);
    } else {
      super((<Error>error).message);
      this.name = (<Error>error).name;
      this.stack = (<Error>error).stack;
    }

    this._type = type;
  }

  public get type(): ErrorType {
    return this._type;
  }
}

export interface RuntimeCast {
  (error: RunnerError, codebox: Codebox): void;
}

export interface CodeboxCatch {
  (error: RunnerError, codebox: Codebox): void;
}

export enum ErrorType {
  RuntimeError,
  CodeboxError
}

export class Runner {

  private _current: number;
  private _tail: number;
  private _queue: Codebox[];

  private _codeboxResolve: any;
  private _codeboxReject: any;

  private _varContainer: Object;

  private _debugger: Debugger;
  private _debug: boolean;

  private _done: RuntimeDone;
  private _cast: RuntimeCast;
  private _codeboxCatch: CodeboxCatch;


  public constructor() {
    this._current = -1;
    this._tail = 0;
    this._queue = [];

    this._codeboxResolve = null;
    this._codeboxReject = null;

    this._varContainer = new Object();

    this._debugger = new Debugger();
    this._debug = false;

    // @ts-ignore
    this._done = null;
    // @ts-ignore
    this._cast = null;
    // @ts-ignore
    this._codeboxCatch = null;
  }

  public get codeboxResolve() {
    return this._codeboxResolve;
  }

  public get codeboxReject() {
    return this._codeboxReject;
  }

  public get debugger() {
    return this._debugger;
  }

  public set done(done: RuntimeDone) {
    this._done = done;
  }

  public set cast(cast: RuntimeCast) {
    this._cast = cast;
  }

  public set catch(codeboxCatch: CodeboxCatch) {
    this._codeboxCatch = codeboxCatch;
  }

  public addCodebox(codebox: Codebox): void {
    this._tail = this._tail + 1;
    this._queue.push(codebox);
  }

  public run(debug: boolean) {
    this._debug = debug;

    // @ts-ignore
    const _run = (queueResolve, queueReject) => {
      new Promise<void>((codeboxResolve, codeboxReject) => {
        this._codeboxResolve = codeboxResolve;
        this._codeboxReject = codeboxReject;
        const codebox = this._queue[this._current];
        codebox.entry();
      }).then((result: any) => {
        this._current = this._current + 1;
        if (this._current < this._tail) {
          _run(queueResolve, queueReject);
        } else {
          queueResolve(result);
        }
      }).catch((error: RunnerError) => {
        queueReject(error)
      });
    }

    new Promise<void>((resolve, reject) => {
      this._current = 0;
      _run(resolve, reject);
    }).then((result: any) => {
      if (this._done !== null) {
        this._done(result);
      }
    }).catch((error: RunnerError) => {
      if (error.type === ErrorType.RuntimeError) {
        if (this._cast !== null) {
          this._cast(error, this._queue[this._current]);
        }
      } else if (error.type === ErrorType.CodeboxError) {
        if (this._codeboxCatch !== null) {
          this._codeboxCatch(error, this._queue[this._current]);
        }
      } else {
        // TODO 处理运行前端给出不正确的错误类型
      }
    });
  }

  private enterVarBreakpoint(comment: string, name: string, type: BreakpointType, action: BreakpointFunction): Promise<any> {
    const var_promise = () => {
      return new Promise<any>((resolve: any) => {
        resolve(action());
      });
    }
    if (this._debug) {
      if (this._debugger.isWatching(name)) {
        return this._debugger.enterBreakpoint(type, comment, name, action)
      } else {
        return var_promise();
      }
    } else {
      return var_promise();
    }
  }

  /**
   * 以下是 runtime 的功能
   * 每个 runtime 功能都包含注释参数，此项是必需的
   */

  public getVar(comment: string, name: string): Promise<any> {
    return this.enterVarBreakpoint(comment, name, BreakpointType.GetVar, () => {
      // @ts-ignore
      return this._varContainer[name];
    });
  }

  public setVar(comment: string, name: string, value: any): Promise<void> {
    return this.enterVarBreakpoint(comment, name, BreakpointType.SetVar, () => {
      // @ts-ignore
      this._varContainer[name] = value;
    });
  }
}
