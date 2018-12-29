
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
        chunkSize: tileUtils.chunkSize
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
        pos: playerEntity.pos.toJson(),
        isInFront: playerEntity.isInFront
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
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        var tempPos = createPosFromJson(command.pos);
        var tempOffset = tileUtils.chunkSize / 2;
        var tempChunkCenterPos = tileUtils.roundPosToChunk(tempPos);
        tempChunkCenterPos.x += tempOffset;
        tempChunkCenterPos.y += tempOffset;
        var tempDistance = tempPlayerEntity.pos.getOrthogonalDistance(
            tempChunkCenterPos
        );
        if (tempDistance < tileUtils.chunkSize * 3) {
            var tempChunk = tileUtils.getChunk(tempPos);
            addSetChunkCommand(tempChunk, commandList);
        }
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
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        var tempPos = createPosFromJson(command.pos);
        tempPlayerEntity.placeTile(tempPos, command.isInFront);
    }
);

gameUtils.addCommandListener(
    "startMining",
    true,
    function(command, player, commandList) {
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        var tempPos = createPosFromJson(command.pos);
        tempPlayerEntity.startMining(tempPos, command.isInFront);
    }
);

gameUtils.addCommandListener(
    "finishMining",
    true,
    function(command, player, commandList) {
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        tempPlayerEntity.finishMining();
    }
);

gameUtils.addCommandListener(
    "verifyPos",
    true,
    function(command, player, commandList) {
        var tempPlayerEntity = getPlayerEntityByPlayer(player);
        tempPlayerEntity.direction = command.direction;
        var tempPos = createPosFromJson(command.pos);
        if (!tempPos.equals(tempPlayerEntity.pos)
                || command.isInFront != tempPlayerEntity.isInFront) {
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
    var index = 0;
    while (index < playerEntityList.length) {
        var tempPlayerEntity = playerEntityList[index];
        tempPlayerEntity.populatePlayerExtraFields();
        index += 1;
    }
    tileUtils.persistAllChunks();
    tileUtils.removeDistantChunks();
    done();
}


