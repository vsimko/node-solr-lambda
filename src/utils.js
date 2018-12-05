const mergeConfig = (a, b) => mergeConfigImpure({ ...a }, b)

function mergeConfigImpure (target, source) {
  for (let k in source) {
    const objOrScalar = target[k]
    if (objOrScalar != null && objOrScalar.constructor === Object) {
      mergeConfigImpure(objOrScalar, source[k]) // recurse on objects
    } else {
      target[k] = source[k] // assign scalar value
    }
  }
  return target
}

/** @type {(x:object) => object|object[]} */
const ensureArray = x => (Object(x) instanceof Array ? x : [x])

const isEmptyObject = obj =>
  Object.keys(obj).length === 0 && obj.constructor === Object

module.exports = {
  mergeConfig,
  mergeConfigImpure,
  ensureArray,
  isEmptyObject
}
