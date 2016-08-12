#############################################
## LOGGING HELPERS

#############################################
logFormat = Date.ISO8601_DATETIME
logPrefix = module.exports.logPrefix = -> Date.create().format(logFormat)

#############################################
log = module.exports.log = (log) ->
  (res) ->
    console.log Date.create().format(logFormat) + " - #{log}: #{res}"
    res

logIf = module.exports.logIf = (log,val) ->
  (res) ->
    console.log Date.create().format(logFormat) + " - #{log}: #{res}" if res is val
    res

logIfNot = module.exports.logIfNot = (log,val) ->
  (res) ->
    console.log Date.create().format(logFormat) + " - #{log}: #{res}" if res isnt val
    res

#############################################
logProp = module.exports.logProp = (log,prop) ->
  (res) ->
    console.log Date.create().format(logFormat) + " - #{log}: #{res[prop]}"
    res

logPropIf = module.exports.logPropIf = (log,prop,val) ->
  (res) ->
    console.log Date.create().format(logFormat) + " - #{log}: #{res[prop]}" if res[prop] is val
    res

logPropIfNot = module.exports.logPropIfNot = (log,prop,val) ->
  (res) ->
    console.log Date.create().format(logFormat) + " - #{log}: #{res[prop]}" if res[prop] isnt val
    res

#############################################
logArray = module.exports.logArray = (log) ->
  (res) ->
    console.log Date.create().format(logFormat) + " - #{log}: #{res.length}"
    res.forEach (r) -> console.log r
    res

#############################################
logArrayProp = module.exports.logArrayProp = (log,prop) ->
  (res) ->
    console.log Date.create().format(logFormat) + " - #{log}: #{res.length}"
    res.forEach (r) -> console.log r[prop]
    res
