
var tempResource = require("./pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;
var tempResource = require("./playerEntity");
var PlayerEntity = tempResource.PlayerEntity;
var playerEntityList = tempResource.playerEntityList;
var tileUtils = require("./tileUtils");

var gameUtils = require("ostracod-multiplayer").gameUtils;

function findPlayerEntityByPlayer(player) {
    var index = 0;
    while (index < playerEntityList.length) {
        var tempPlayerEntity = playerEntityList[index];
        if (tempPlayerEntity.player.username == player.username) {
            return index;
        }
        index += 1;
    }
    return -1;
}

function getPlayerEntityByPlayer(player) {
    var index = findPlayerEntityByPlayer(player);
    return playerEntityList[index];
}

function addSetInitializationInfoCommand(player, commandList) {
    var tempPlayerEntity = getPlayerEntityByPlayer(player);
    commandList.push({
        commandName: "setInitializationInfo",
        chunkSize: tileUtils.chunkSize,
        playerEntityPos: tempPlayerEntity.getPos().toJson(),
        playerEntityIsInFront: tempPlayerEntity.getIsInFront()
    });
}

function addSetChunkCommand(chunk, commandList) {
    commandList.push({
        commandName: "setChunk",
        pos: chunk.pos.toJson(),
        tileData: chunk.tileList.join("")
    });
}

function addSetPosCommand(playerEntity, commandList) {
    commandList.push({
        commandName: "setPos",
        pos: playerEntity.getPos().toJson(),
        isInFront: playerEntity.getIsInFront()
    });
}

gameUtils.addCommandListener(
    "getInitializationInfo",
    true,
    function(command, player, commandList) {
        addSetInitializationInfoCommand(player, commandList);
    }
);

gameUtils.addCommandListener(
    "getChunk",
    true,
    function(command, player, commandList) {
        // TODO: Verify that this pos is within range.
        var tempPos = createPosFromJson(command.pos);
        var tempChunk = tileUtils.getChunk(tempPos);
        addSetChunkCommand(tempChunk, commandList);
    }
);

gameUtils.addCommandListener(
    "fall",
    true,
    function(command, player, commandList) {
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        tempPlayerEntity.fall();
    }
);

gameUtils.addCommandListener(
    "walk",
    true,
    function(command, player, commandList) {
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        var tempOffsetX = command.offsetX;
        if (tempOffsetX == -1 || tempOffsetX == 1) {
            tempPlayerEntity.walk(tempOffsetX);
        }
    }
);

gameUtils.addCommandListener(
    "setLayer",
    true,
    function(command, player, commandList) {
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        tempPlayerEntity.setLayer(command.isInFront);
    }
);

gameUtils.addCommandListener(
    "placeTile",
    true,
    function(command, player, commandList) {
        // TODO: Implement.
        
    }
);

gameUtils.addCommandListener(
    "startMining",
    true,
    function(command, player, commandList) {
        // TODO: Implement.
        
    }
);

gameUtils.addCommandListener(
    "finishMining",
    true,
    function(command, player, commandList) {
        // TODO: Implement.
        
    }
);

gameUtils.addCommandListener(
    "verifyPos",
    true,
    function(command, player, commandList) {
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        tempPlayerEntity.direction = command.direction;
        var tempPos1 = createPosFromJson(command.pos);
        var tempPos2 = tempPlayerEntity.getPos();
        if (!tempPos1.equals(tempPos2)
                || command.isInFront != tempPlayerEntity.getIsInFront()) {
            addSetPosCommand(tempPlayerEntity, commandList);
        }
    }
);

function GameDelegate() {
    
}

var gameDelegate = new GameDelegate();

module.exports = gameDelegate;

GameDelegate.prototype.playerEnterEvent = function(player) {
    var name;
    for (name in player.extraFields) {
        if (player.extraFields[name] === null) {
            player.extraFields[name] = 0;
        }
    }
    new PlayerEntity(player);
}

GameDelegate.prototype.playerLeaveEvent = function(player) {
    var index = findPlayerEntityByPlayer(player);
    playerEntityList.splice(index, 1);
}

GameDelegate.prototype.persistEvent = function(done) {
    tileUtils.persistAllChunks();
    tileUtils.removeDistantChunks();
    done();
}


