export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const timeout = (ms, desc) =>
  new Promise((_, reject) => setTimeout(() => reject(desc), ms));

export const yieldThread = setImmediate
  ? () => new Promise(setImmediate)
  : () => new Promise(setTimeout);

export const mapMap = function* mapMap(map, func) {
  for (const [k, v] of map) {
    yield [k, func(v)];
  }
};
