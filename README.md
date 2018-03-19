# ButtressJS
Realtime datastore for business software.

# What's New
### version: 1.6.0
- Added: Socket connections are now namespaced based on public app id
- Added: User token is required to be passed to the socket on handshake

### version: 1.5.4 - 1.5.12
- NOTE: Verison information required

### version: 1.5.3
- Fixed: error with objectid's in arrays with schemas
- Fixed: mongoose validation errors now return a 400
- Removed references to taskType in task collection
- Fixed: if there's no contact primaryContact is null not undefined

### version: 1.5.0
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
