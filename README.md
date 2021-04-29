# ButtressJS
Realtime datastore for software.

# What's New

### **Version**: 2.4.1
- FIX: Don't create activity logs for search requests
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
### 2.0.0 :tada:
- REFACTOR: There are no longer core models or API's for companies, contracts, etc.. (user, tokens cores models still exist). It's now up to the apps to specify the schema's it would like to use. 
- REFACTOR: It's now the apps responsibility to manage user profile data. Authentication is still managed via buttress.
- ADDED: User app roles for grouping and controling user permissions.
- ADDED: Endpoint access via user app roles.
- ADDED: Schema data read/write permission via user app roles.
- REFACTOR: Collection names are now prefixed with a app short code.

## Prerequisites ##
You'll need gulp:
`npm install -g gulp && npm install gulp`

Then you'll need to grab the latest modules:
`npm install`
## Configuring ##
You need to setup an environment variable: `SERVER_ID`
Add `export SERVER_ID = 'name'` to your .profile or .bashrc

Then add to config.json.

Create a `.production.env` or `.development.env` in the route folder with your environmental settings.

## Building ##
`npm run build`
`npm start`; or
`npm run dev`
## Testing ##
Tests are implemented in the ButtressJS API.
You can find the API here: https://github.com/wearelighten/buttress-js-api
