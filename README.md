# ButtressJS
Realtime datastore for software.

# What's New

### **Latest**: 2.4.2 :tada:
- ADDED: mongo project to filter returned results for the search endpoint (#13)
- FIX: Convert id -> _id when building query if id doesn't exist within the schema

*See changelog.md for version history*

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
```
npm run build
npm start
```
## Testing ##
Tests are implemented in the ButtressJS API.
You can find the API here: https://github.com/wearelighten/buttress-js-api
