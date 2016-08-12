crypto = require 'crypto'

class OTP
  mode: 'numeric'
  epoch: 1.418221717366e12
  windowSize: 30
  length: 6
  tolerance: 50
  salt: ''

  constructor: (options) ->
    options = options || {}

    @mode = options.mode if options.mode?
    @epoch = options.epoch if options.epoch?
    @windowSize = options.windowSize if options.windowSize?
    @length = options.length if options.length?
    @salt = options.salt if options.salt?
    @tolerance = options.tolerance if options.tolerance?

    if options?.logCode
      console.log @getCode()
      setInterval(=>
        console.log @getCode()
      , @windowSize*1000)


  ##################################################
  ##################################################
  getCode: (salt)->
    salt = salt || @salt
    window = @getWindow()
#    console.log window
    Helpers.getRandomString( "" + salt + window, @length, @mode is Constants.Mode.NUMERIC)

  ##################################################
  ##################################################
  getWindow: ->
    interval = (Date.now() - @epoch)/1000
    Math.floor interval / @windowSize, 0

  ##################################################
  ##################################################
  test: (code,salt,tolerance) ->
    tolerance = tolerance || @tolerance;
    salt = salt || @salt;

    return false if not code

    matches = false;
    window = @getWindow()+tolerance;
    for x in [tolerance*2 .. 0]
      if (Helpers.getRandomString(""+salt+window,@length,@mode is Constants.Mode.NUMERIC) is code)
        matches = true;
        break
      window--

    matches

##################################################
##################################################
exports.Constants = Constants =
  Mode:
    NUMERIC: 'numeric'
    ALPHANUMERIC: 'alphanumeric'
    ALPHA: 'alpha'

##################################################
##################################################
exports.Helpers = Helpers =
  getRandomString: (salt,length,numeric) ->
    salt = salt || Date.now();
    length = length || 12;
#    console.log salt

    hash = crypto.createHash 'sha512'
    hash.update ""+salt
    bytes = hash.digest()

    chars = if numeric is false then 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' else '0123456789012345'
    mask = if numeric is false then 0x3d else 0x0f
    string = ''

    for byte in [0..length-1]
      string += chars[bytes[byte]&mask]

    string

##################################################
##################################################
exports.create = (options) ->
  new OTP options
