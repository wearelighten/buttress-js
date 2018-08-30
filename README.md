# ButtressJS
Realtime datastore for business software.

# What's New

### Version: 1.6.5
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

## Prerequisites ##
You'll need gulp:
`npm install -g gulp && npm install gulp`

You'll need nodemon:
`npm install -g nodemon`

Then you'll need to grab the latest modules:
`npm install`
## Configuring ##
You need to setup an environment variable: `SERVER_ID`
Add `export SERVER_ID = 'name'` to your .profile or .bashrc

Then add to config.json.
## Building ##
`npm run build`
`npm start`; or
`npm run dev`
## Testing ##
Tests are implemented in the ButtressJS API.
