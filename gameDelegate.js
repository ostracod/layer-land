
var tempResource = require("./pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;
var tileUtils = require("./tileUtils");

var gameUtils = require("ostracod-multiplayer").gameUtils;

function addSetChunkCommand(chunk, commandList) {
    commandList.push({
        commandName: "setChunk",
        pos: chunk.pos.toJson(),
        tileData: chunk.tileList.join("")
    });
}

gameUtils.addCommandListener(
    "getChunk",
    true,
    function(command, player, commandList) {
        var tempPos = createPosFromJson(command.pos);
        var tempChunk = tileUtils.getChunk(tempPos);
        addSetChunkCommand(tempChunk, commandList);
    }
);

function GameDelegate() {
    
}

var gameDelegate = new GameDelegate();

module.exports = gameDelegate;

GameDelegate.prototype.playerEnterEvent = function(player) {
    
}

GameDelegate.prototype.playerLeaveEvent = function(player) {
    
}

GameDelegate.prototype.persistEvent = function(done) {
    done();
}


