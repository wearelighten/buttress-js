# rhizome
The API that feeds grass roots movements.
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

Then add to config.coffee.
## Building ##
`npm run build`
`npm start`; or
`npm run dev`
## Testing ##
Need someone to take ownership of unit tests.
## To Do ##
- -Convert to ES6-
- Make it run in a docker instance
- Dependency on local MongoDB. Need a better solution than that. Docker?
- Everything!
