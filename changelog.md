### 2.4.0
- ADDED: Skip, Limit, Sort params to serach and count APIs
- FIX: Ignore blank $and / $or properties
- FIX: Improve handling of buttress-db query operators
- TWEAK: Removed `BUTTRESS_MONGO_URL_*env*` config options in favour of `BUTTRESS_MONGO_URL`
- FIX: Create app will now correctly return app data with token
- FIX: regenerateAppRoutes selecting the wrong app after schema change
### 2.3.4
- ADDED: Count API to each schema
- FIX: Map usage of $rex -> $regex within queries
### 2.3.3
**NOTE**: Breaking changes this should of been a minor or major
- ADDED: Search API to each schema using the method SEARCH (This replaces queries being passed to getAll)
- FIX: Unable to cross query schema via authFilter.env
- TWEAK: Logging Improvements 

### 2.3.2
- FIX: Writing to property when counting super socket activity
- ADDED: Activity event for super tokens on each activity
- BUMP: Bump node dependencies (mongodb, socket.io-redis)
### 2.3.1
- REFACTOR: App routes will now be regenerated on schema update
- FIX: Bust the app routes token cache when a token is added
### 2.3.0
- FIX: Socket activity now emits to rooms based on defined app roles
- FIX: Calling bulk save will now return the objects like the save single api
- REFACTOR: Activity broadcast will now try to redact data based on app role
- REFACTOR: Silly logging messages to aid in performance
- REFACTOR: Admin tokens now have the choice to clear all data
### 2.2.2
- FIX: No longer update token.uses when a token is used
### 2.2.1
- ADDED: Ability to pass updatedAt flag when creating a object
### 2.2.0
*Interim build - See commit log*
### 2.1.2
- FIX: Promise rejection in route execution process gets caught by the next exeuction step instead of early-out
### 2.1.1
- FIX: Strip API version & App Prefix from activity path property
- ADDED: Deprecated warnings for some v1 urls
- REFACTOR: token.allocated has been removed
### 2.1.0
- ADDED: App namespacing to the API routes
- REFACTOR: prepareSchemaResult dataDisposition computation has been moved outside of the loop process
### 2.0.3
- ADDED: Script to aid mapping existing person objects over to a app usable format
- FIX: Don't filter data against user roles if request is using a app token
- FIX: User token mapping will mutiple tokens
- FIX: App ID not being passed to public ID generator
### 2.0.2
- FIX: Assign default role when creating a user.
- FIX: The returned user object should contain a array of tokens & the auth object.
### 2.0.1
- FIX: Unneeded files added after merge
### 2.0.0
- REFACTOR: There are no longer core models or API's for companies, contracts, etc.. (user, tokens cores models still exist). It's now up to the apps to specify the schema's it would like to use. 
- REFACTOR: It's now the apps responsibility to manage user profile data. Authentication is still managed via buttress.
- ADDED: User app roles for grouping and controling user permissions.
- ADDED: Endpoint access via user app roles.
- ADDED: Schema data read/write permission via user app roles.
- REFACTOR: Collection names are now prefixed with a app short code.
### 1.6.7
- ADDED: Reports schema & Routing
### 1.6.6
- FIX: Added instance namespacing to redis scope in config
- TWEAK: Bumped logging level of socket activity
### 1.6.5
- ADDED: node-env-obj to replace project config loader (config.js)
- ADDED: Schema & route api for "Location"
### 1.6.4
- ADDED: Ability to update tracking boolean  "hide"
### 1.6.3
- TWEAK: Added Boolean property teamPrimary to users
### 1.6.2
- TWEAK: Updated to use the latest 4.x build of mongoose
- TWEAK: Moved Mongo options to config
- TWEAK: Will no longer buffer Mongo commands, just return error if connection fails
### 1.6.1
- Activity will broadcast to super tokens regardless of broadcast setting
- Fixed Auth & Params not being passed to activity
- Activity is now added via Shared.add
- Activity findAll is now passed via Mongo native
### 1.6.0
- Added: Socket connections are now namespaced based on public app id
- Added: User token is required to be passed to the socket on handshake
### 1.5.4 - 1.5.12
- NOTE: Verison information required
### 1.5.3
- Fixed: error with objectid's in arrays with schemas
- Fixed: mongoose validation errors now return a 400
- Removed references to taskType in task collection
- Fixed: if there's no contact primaryContact is null not undefined
### 1.5.0
- Added App schema for flexible extension of existing models via JSON notation
- Added new service Model & API
- Added support for addition/update of arrays of objects
- Import optimisations and support for bulk operations add/delete
- Various model properties changes and fixes
- Added Sugar for date management
### 1.0.5
- API compatibility fixes
### 1.0.2
- Patch bug fix
### 1.0.0
- Production Ready.
- Scalable socket and rest processes