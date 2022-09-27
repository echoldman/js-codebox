import { Codebox } from '../src/codebox';
import { Runner, RunnerError, ErrorType } from '../src/runner';
import { BreakpointType, BreakpointEvent } from '../src/debug';

/**
 * 设置运行环境
 */

const runner = new Runner();

/**
 * 设置变量获取函数
 */
const get = async (comment: string, name: string): Promise<void> => {
  return runner.getVar(comment, name);
}
const set = async (comment: string, name: string, value: any): Promise<void> => {
  return runner.setVar(comment, name, value);
}

/**
 * 设置 Codebox 完成/错误函数
 */
const done = (result: any): void => {
  const resolve = runner.codeboxResolve;
  resolve(result);
}
const cast = (message: string): void => {
  const reject = runner.codeboxReject;
  reject(new RunnerError(message, ErrorType.RuntimeError));
}
const codeboxError = (error: Error): void => {
  const reject = runner.codeboxReject;
  reject(new RunnerError(error, ErrorType.CodeboxError));
}

/**
 * 工具函数
 */
const P = (): Promise<void> => {
  return new Promise<void>((resolve) => { resolve(); });
}


/**
 * 构建业务流
 */

const box1 = new Codebox();
get.bind(box1);
set.bind(box1);
box1.id = 'box1';
box1.description = 'box1 description';
box1.entry = () => {
  P().then(() => {
    console.log('Codebox-1: 设置变量 str_a')
    return set('设置变量 str_a 的值为 abc', 'str_a', 'abc');
  }).then(() => {
    done(undefined);
  }).catch((error) => {
    codeboxError(error);
  });
}
runner.addCodebox(box1);

const box2 = new Codebox();
get.bind(box2);
set.bind(box2);
box2.id = 'box2';
box2.description = 'box2 description';
box2.entry = () => {
  P().then(() => {
    cast('runtime get-var error');
    console.log('Codebox-2: 读取变量 str_a')
    return get('读取变量 str_a 的值', 'str_a');
  }).then((str_a: any) => {
    console.log('box2 hello: ' + str_a);
    done(undefined);
  }).catch((error: Error) => {
    codeboxError(error);
  });
}
runner.addCodebox(box2);


/**
 * 设置调试
 */

runner.debugger.watch('str_a');
setTimeout(() => {
  console.log("已经过去 5 秒，continue");
  runner.debugger.continue();
}, 1000 * 5);

/**
 * 调试事件
 */

runner.debugger.on(BreakpointType.GetVar, (event: BreakpointEvent) => {
  console.log('调试：');
  console.log(`  get-var: ${event.comment}: ${event.name}`);
});
runner.debugger.on(BreakpointType.SetVar, (event: BreakpointEvent) => {
  console.log('调试：');
  console.log(`\tset-var: ${event.comment}: ${event.name}`);
});


/**
 * 以开启调试的方式运行
 */

runner.done = (result: any) => {
  console.log('last result:');
  console.log(result);
}

runner.cast = (error: RunnerError, codebox: Codebox) => {
  console.log(`runtime error from: ${codebox.id}`);
  console.log(error.message);
}

runner.catch = (error: RunnerError, codebox: Codebox) => {
  console.log(`codebox error from: ${codebox.id}`);
  console.log(error.message);
}

runner.run(true);
