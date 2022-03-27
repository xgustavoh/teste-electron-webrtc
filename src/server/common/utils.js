module.exports.sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

module.exports.timeout = (ms, desc) =>
  new Promise((_, reject) => setTimeout(() => reject(desc), ms));

module.exports.yieldThread = setImmediate
  ? () => new Promise(setImmediate)
  : () => new Promise(setTimeout);

module.exports.mapMap = function* mapMap(map, func) {
  for (const [k, v] of map) {
    yield [k, func(v)];
  }
};
