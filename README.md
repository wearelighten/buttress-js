# ButtressJS
Realtime datastore for software.

# What's New
### Version: 2.0.0 :tada:
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
