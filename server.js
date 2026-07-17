const cds = require('@sap/cds');

// ponytail: cds watch only knows about its own port. The UI5 dev server is a
// separate process (`npm start`) on a fixed port for this project — just
// print the reminder so it doesn't need to be looked up every time.
cds.on('listening', () => {
  console.log('[cds] - UI5 app (run `npm start` in another terminal) → http://localhost:8080/index.html');
});

module.exports = cds.server;
