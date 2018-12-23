
var gameDelegate = require("./gameDelegate");

var ostracodMultiplayer = require("ostracod-multiplayer").ostracodMultiplayer;

console.log("Starting OstracodMultiplayer...");

var tempResult = ostracodMultiplayer.initializeServer(__dirname, gameDelegate, []);

if (!tempResult) {
    process.exit(1);
}


