
var gameDelegate = require("./gameDelegate");

var tempResource = require("ostracod-multiplayer");
var ostracodMultiplayer = tempResource.ostracodMultiplayer;
var gameUtils = tempResource.gameUtils;

console.log("Starting OstracodMultiplayer...");

var tempResult = ostracodMultiplayer.initializeServer(__dirname, gameDelegate, []);

if (!tempResult) {
    process.exit(1);
}


