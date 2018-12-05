// @ts-check
/**
 * Merges `b` configuration structure to `a` by creating
 * a deep copy of `a`.
 * - Note: The configuration structure `a` must be serializable to JSON.
 * - This function is pure
 *
 * @template T
 * @param {T} a
 * @param {T} b
 */
const mergeConfig = (a, b) => mergeConfigImpure(deepCopy(a), b)

/**
 * Creates a deep copy of an object using JSON seriazlie/deserialize.
 * This function is pure
 * @template T
 * @param {T} x Must be serializable to JSON!
 * @return {T}
 */
const deepCopy = x => JSON.parse(JSON.stringify(x))

/**
 * Merges `b` to `a` by altering `a`.
 * @template T
 * @param {T} target
 * @param {T} source
 */
function mergeConfigImpure (target, source) {
  for (let k in source) {
    const maybeObject = target[k]
    if (maybeObject != null && maybeObject.constructor === Object) {
      mergeConfigImpure(maybeObject, source[k]) // recurse on objects
    } else {
      target[k] = deepCopy(source[k]) // assign scalar value
    }
  }
  return target
}

/**
 * @template T
 * @param {T | T[]} x
 * @return {T[]}
 */
const ensureArray = x => x instanceof Array ? x : [x]

const isEmptyObject = obj =>
  Object.keys(obj).length === 0 && obj.constructor === Object

module.exports = {
  mergeConfig,
  mergeConfigImpure,
  ensureArray,
  isEmptyObject
}
