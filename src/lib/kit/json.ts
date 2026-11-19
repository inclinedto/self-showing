export type JsonProblem = { line: number; column: number; message: string };

class Problem extends Error {
  at: number;
  constructor(at: number, message: string) {
    super(message);
    this.at = at;
  }
}

/**
 * Finds the first syntax error in `source`, for text that `JSON.parse` has already rejected.
 * V8 no longer reports a position for most errors, so this re-scans the text to point at one.
 */
export function findJsonProblem(source: string): JsonProblem | null {
  let index = 0;

  const fail = (message: string, at = index): never => {
    throw new Problem(at, message);
  };
  const skipSpace = () => {
    while (index < source.length && " \t\n\r".includes(source[index])) index++;
  };
  const expectEnd = (what: string) => {
    if (index >= source.length) fail(`内容不完整，${what}`);
  };

  const parseString = () => {
    index++;
    while (true) {
      expectEnd("字符串少了结尾的双引号");
      const char = source[index];
      if (char === '"') {
        index++;
        return;
      }
      if (char === "\n" || char === "\r") fail("字符串里不能直接换行，请写成 \\n");
      if (char.charCodeAt(0) < 0x20) fail("字符串里有不可见的控制字符");
      if (char === "\\") {
        const next = source[index + 1];
        if (next === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(source.slice(index + 2, index + 6))) fail("\\u 后面应该是 4 位十六进制数字");
          index += 6;
          continue;
        }
        if (next === undefined || !'"\\/bfnrt'.includes(next)) fail(`不支持的转义 \\${next ?? ""}`);
        index += 2;
        continue;
      }
      index++;
    }
  };

  const parseNumber = () => {
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(source.slice(index));
    if (!match) fail("数字格式不对");
    index += (match as RegExpExecArray)[0].length;
    if (/[0-9.]/.test(source[index] ?? "")) fail("数字格式不对，开头不能有多余的 0，小数点后要有数字");
  };

  const parseValue = (): void => {
    skipSpace();
    expectEnd("这里还缺一个值");
    const char = source[index];
    if (char === "{") {
      parseObject();
      return;
    }
    if (char === "[") {
      parseArray();
      return;
    }
    if (char === '"') {
      parseString();
      return;
    }
    if (char === "'") fail("JSON 只能用双引号，不能用单引号");
    if (char === "-" || (char >= "0" && char <= "9")) {
      parseNumber();
      return;
    }
    for (const word of ["true", "false", "null"]) {
      if (source.startsWith(word, index)) {
        index += word.length;
        return;
      }
    }
    if (/^(undefined|NaN|Infinity)/.test(source.slice(index))) fail("JSON 里没有 undefined、NaN、Infinity，可以改成 null");
    if (char === "}" || char === "]") fail("这里少了一个值，或者多了一个逗号");
    fail(`这里不应该出现「${char}」`);
  };

  const parseObject = () => {
    index++;
    skipSpace();
    if (source[index] === "}") {
      index++;
      return;
    }
    while (true) {
      skipSpace();
      expectEnd("对象少了结尾的 }");
      const char = source[index];
      if (char === "}") fail("最后一项后面不能有逗号");
      if (char === "'") fail("键名只能用双引号，不能用单引号");
      if (char !== '"') fail("键名要用双引号包起来");
      parseString();
      skipSpace();
      expectEnd("键名后面少了冒号和值");
      if (source[index] !== ":") fail("键名后面应该是冒号 :");
      index++;
      parseValue();
      skipSpace();
      expectEnd("对象少了结尾的 }");
      if (source[index] === ",") {
        index++;
        continue;
      }
      if (source[index] === "}") {
        index++;
        return;
      }
      fail("这里少了逗号，或者少了结尾的 }");
    }
  };

  const parseArray = () => {
    index++;
    skipSpace();
    if (source[index] === "]") {
      index++;
      return;
    }
    while (true) {
      skipSpace();
      if (source[index] === "]") fail("最后一项后面不能有逗号");
      parseValue();
      skipSpace();
      expectEnd("数组少了结尾的 ]");
      if (source[index] === ",") {
        index++;
        continue;
      }
      if (source[index] === "]") {
        index++;
        return;
      }
      fail("这里少了逗号，或者少了结尾的 ]");
    }
  };

  try {
    parseValue();
    skipSpace();
    if (index < source.length) fail("JSON 已经结束了，后面还有多余的内容");
    return null;
  } catch (error) {
    if (!(error instanceof Problem)) throw error;
    const at = Math.min(error.at, source.length);
    const before = source.slice(0, at);
    const line = before.split("\n").length;
    const column = at - before.lastIndexOf("\n");
    return { line, column, message: error.message };
  }
}
