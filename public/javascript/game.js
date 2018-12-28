
var cameraPos = new Pos(0, 0);
var chunkSize;
// Map from pos string representation to chunk.
var chunkMap = {};
var tileSize = 16;
var canvasTileWidth;
var canvasTileHeight;
var imageData;
var imageDataList;
var tileCanvas = document.createElement("canvas");
var tileContext = tileCanvas.getContext("2d");
var tileSet = {
    EMPTY: 0,
    BACK: 1,
    FRONT: 2,
    FRONT_AND_BACK: 3,
    DIAMOND: 4
};
var colorSet = [
    new Color(133, 233, 251),
    new Color(73, 212, 114),
    new Color(233, 142, 228),
    new Color(132, 83, 214),
    new Color(232, 52, 108),
    new Color(255, 255, 255),
    new Color(64, 64, 64)
];
var colorStringSet;
var playerEntityList = [];
var playerQuarterOutline = [
    new Pos(1/2, 0),
    new Pos(3/4, 1/4),
    new Pos(1, 1/4),
    new Pos(1, 1),
    new Pos(1/4, 1),
    new Pos(1/4, 3/4),
    new Pos(0, 1/2)
];
var playerEntitySize = 2;
var localPlayerEntity = null;
var chunkRequestDistance = 80;
var chunkUnloadDistance = 160;
var chunkRequestOffsetList = [
    new Pos(-chunkRequestDistance, -chunkRequestDistance),
    new Pos(chunkRequestDistance, -chunkRequestDistance),
    new Pos(-chunkRequestDistance, chunkRequestDistance),
    new Pos(chunkRequestDistance, chunkRequestDistance),
];
var tileCursorOffset = new Pos(-1, 0);

colorStringSet = [];
var index = 0;
while (index < colorSet.length) {
    var tempColor = colorSet[index];
    colorStringSet.push(tempColor.toString());
    index += 1;
}

function addGetInitializationInfoCommand() {
    gameUpdateCommandList.push({
        commandName: "getInitializationInfo"
    });
}

function addGetChunkCommand(pos) {
    gameUpdateCommandList.push({
        commandName: "getChunk",
        pos: pos.toJson()
    });
}

function addPlaceTileCommand(pos, isInFront) {
    gameUpdateCommandList.push({
        commandName: "placeTile",
        pos: pos.toJson(),
        isInFront: isInFront
    });
}

function addRemoveTileCommand(pos, isInFront) {
    gameUpdateCommandList.push({
        commandName: "removeTile",
        pos: pos.toJson(),
        isInFront: isInFront
    });
}

addCommandListener("setInitializationInfo", function(command) {
    chunkSize = command.chunkSize;
    var tempPos = createPosFromJson(command.playerEntityPos);
    localPlayerEntity = new PlayerEntity(tempPos);
});

addCommandListener("setChunk", function(command) {
    var tempPos = createPosFromJson(command.pos);
    new Chunk(tempPos, command.tileData);
});

function roundPosToChunk(pos) {
    return new Pos(
        Math.floor(pos.x / chunkSize) * chunkSize,
        Math.floor(pos.y / chunkSize) * chunkSize
    );
}

function convertPosToChunkKey(pos) {
    return Math.floor(pos.x / chunkSize) + "," + Math.floor(pos.y / chunkSize);
}

function getChunk(pos) {
    var tempKey = convertPosToChunkKey(pos);
    if (!(tempKey in chunkMap)) {
        return null;
    }
    return chunkMap[tempKey];
}

function setTileSize(size) {
    tileSize = size;
    canvasTileWidth = canvasWidth / tileSize;
    canvasTileHeight = canvasHeight / tileSize;
    imageData = context.createImageData(canvasTileWidth, canvasTileHeight);
    imageDataList = imageData.data;
    tileCanvas.width = canvasTileWidth;
    tileCanvas.height = canvasTileHeight;
}

function getTile(pos) {
    var tempChunk = getChunk(pos);
    if (tempChunk === null) {
        return null;
    }
    return tempChunk.getTile(pos);
}

function setTile(pos, tile) {
    var tempChunk = getChunk(pos);
    if (tempChunk === null) {
        return;
    }
    tempChunk.setTile(pos, tile);
}

function addGetChunkCommands() {
    var chunkRequestPosList = [];
    var index = 0;
    while (index < chunkRequestOffsetList.length) {
        var tempOffset = chunkRequestOffsetList[index];
        index += 1;
        var tempPos = localPlayerEntity.pos.copy();
        tempPos.add(tempOffset);
        tempPos = roundPosToChunk(tempPos);
        var tempChunk = getChunk(tempPos);
        if (tempChunk !== null) {
            continue;
        }
        var tempHasFoundPos = false;
        var tempIndex = 0;
        while (tempIndex < chunkRequestPosList.length) {
            var tempPos2 = chunkRequestPosList[tempIndex];
            if (tempPos.equals(tempPos2)) {
                tempHasFoundPos = true;
                break;
            }
            tempIndex += 1;
        }
        if (tempHasFoundPos) {
            continue;
        }
        chunkRequestPosList.push(tempPos);
    }
    var index = 0;
    while (index < chunkRequestPosList.length) {
        var tempPos = chunkRequestPosList[index];
        addGetChunkCommand(tempPos);
        index += 1;
    }
}

function removeDistantChunks() {
    var tempKeyToUnloadList = [];
    var key;
    for (key in chunkMap) {
        var tempChunk = chunkMap[key];
        var tempDistance = tempChunk.getOrthogonalDistance(localPlayerEntity.pos);
        if (tempDistance >= chunkUnloadDistance) {
            tempKeyToUnloadList.push(key);
        }
    }
    var index = 0;
    while (index < tempKeyToUnloadList.length) {
        var tempKey = tempKeyToUnloadList[index];
        delete chunkMap[tempKey];
        index += 1;
    }
}

function getTileCursorPos() {
    var output = localPlayerEntity.pos.copy();
    output.add(tileCursorOffset);
    return output;
}

function drawTileCursor(isShapeLayer) {
    var tempBasePos = getTileCursorPos();
    tempBasePos.subtract(cameraPos);
    if (!isShapeLayer && tileSize <= 30) {
        drawPixel(tempBasePos.x, tempBasePos.y, colorSet[5]);
    }
    if (isShapeLayer && tileSize > 30) {
        tempBasePos.scale(tileSize);
        context.fillStyle = colorStringSet[5];
        context.fillRect(tempBasePos.x, tempBasePos.y, tileSize, tileSize / 8);
        context.fillRect(tempBasePos.x + tileSize * 7 / 8, tempBasePos.y, tileSize / 8, tileSize);
        context.fillRect(tempBasePos.x, tempBasePos.y + tileSize * 7 / 8, tileSize, tileSize / 8);
        context.fillRect(tempBasePos.x, tempBasePos.y, tileSize / 8, tileSize);
    }
}

function drawTileCursorPixelLayer() {
    drawTileCursor(false);
}

function drawTileCursorShapeLayer() {
    drawTileCursor(true);
}

function tileHasFrontAndBack(tile) {
    return (
        tile === tileSet.FRONT_AND_BACK
        || tile === tileSet.DIAMOND
        || tile === null
    );
}

function tileHasFront(tile) {
    return (
        tile === tileSet.FRONT
        || tileHasFrontAndBack(tile)
    );
}

function tileHasBack(tile) {
    return (
        tile === tileSet.BACK
        || tileHasFrontAndBack(tile)
    );
}

function tileHasComponent(tile, isInFront) {
    if (isInFront) {
        return tileHasFront(tile);
    } else {
        return tileHasBack(tile);
    }
}

function Chunk(pos, tileData) {
    this.pos = roundPosToChunk(pos);
    this.tileList = [];
    var index = 0;
    while (index < tileData.length) {
        var tempCharacter = tileData.charAt(index);
        this.tileList.push(parseInt(tempCharacter));
        index += 1;
    }
    var tempKey = convertPosToChunkKey(pos);
    chunkMap[tempKey] = this;
}

Chunk.prototype.getTileIndex = function(pos) {
    return (pos.x - this.pos.x) + (pos.y - this.pos.y) * chunkSize;
}

Chunk.prototype.getTile = function(pos) {
    var index = this.getTileIndex(pos);
    return this.tileList[index];
}

Chunk.prototype.setTile = function(pos, tile) {
    var index = this.getTileIndex(pos);
    this.tileList[index] = tile;
}

Chunk.prototype.getDrawBounds = function() {
    var tempStartPos = new Pos(
        Math.max(cameraPos.x, this.pos.x),
        Math.max(cameraPos.y, this.pos.y),
    );
    var tempEndPos = new Pos(
        Math.min(cameraPos.x + canvasTileWidth, this.pos.x + chunkSize),
        Math.min(cameraPos.y + canvasTileHeight, this.pos.y + chunkSize),
    );
    return [tempStartPos, tempEndPos];
}

function drawPixel(posX, posY, color) {
    var index = (posX + posY * canvasTileWidth) * 4;
    imageDataList[index] = color.r;
    imageDataList[index + 1] = color.g;
    imageDataList[index + 2] = color.b;
}

Chunk.prototype.drawPixelLayer = function() {
    var tempBounds = this.getDrawBounds();
    var tempStartPos = tempBounds[0];
    var tempEndPos = tempBounds[1];
    var tempPos = tempStartPos.copy();
    while (tempPos.y < tempEndPos.y) {
        tempPos.x = tempStartPos.x;
        while (tempPos.x < tempEndPos.x) {
            var tempTile = this.getTile(tempPos);
            if (tempTile == tileSet.DIAMOND && tileSize > 30) {
                tempTile = tileSet.EMPTY;
            }
            var tempColor = colorSet[tempTile];
            drawPixel(tempPos.x - cameraPos.x, tempPos.y - cameraPos.y, tempColor);
            tempPos.x += 1;
        }
        tempPos.y += 1;
    }
}

Chunk.prototype.drawShapeLayer = function() {
    var tempBounds = this.getDrawBounds();
    var tempStartPos = tempBounds[0];
    var tempEndPos = tempBounds[1];
    var tempPos = tempStartPos.copy();
    while (tempPos.y < tempEndPos.y) {
        tempPos.x = tempStartPos.x;
        while (tempPos.x < tempEndPos.x) {
            var tempTile = this.getTile(tempPos);
            if (tempTile == tileSet.DIAMOND && tileSize > 30) {
                context.fillStyle = colorStringSet[tempTile];
                var tempOffsetX = (tempPos.x - cameraPos.x) * tileSize;
                var tempOffsetY = (tempPos.y - cameraPos.y) * tileSize;
                context.beginPath();
                context.moveTo(tempOffsetX + tileSize / 2, tempOffsetY + tileSize / 8);
                context.lineTo(tempOffsetX + tileSize * 7 / 8, tempOffsetY + tileSize / 2);
                context.lineTo(tempOffsetX + tileSize / 2, tempOffsetY + tileSize * 7 / 8);
                context.lineTo(tempOffsetX + tileSize / 8, tempOffsetY + tileSize / 2);
                context.fill();
            }
            tempPos.x += 1;
        }
        tempPos.y += 1;
    }
}

Chunk.prototype.getOrthogonalDistance = function(pos) {
    var tempDistance1;
    var tempDistance2;
    if (pos.x < this.pos.x) {
        tempDistance1 = this.pos.x - pos.x;
    } else if (pos.x > this.pos.x + chunkSize - 1) {
        tempDistance1 = pos.x - (this.pos.x + chunkSize - 1);
    } else {
        tempDistance1 = 0;
    }
    if (pos.y < this.pos.y) {
        tempDistance2 = this.pos.y - pos.y;
    } else if (pos.y > this.pos.y + chunkSize - 1) {
        tempDistance2 = pos.y - (this.pos.y + chunkSize - 1);
    } else {
        tempDistance2 = 0;
    }
    return Math.max(tempDistance1, tempDistance2);
}

function PlayerEntity(pos) {
    this.pos = pos;
    this.isInFront = true;
    this.direction = 1;
    this.fallDelay = 0;
    playerEntityList.push(this);
}

PlayerEntity.prototype.hasCollision = function(pos, isInFront) {
    var tempPos = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < playerEntitySize) {
        tempPos.set(pos);
        tempPos.add(tempOffset);
        var tempTile = getTile(tempPos);
        if (tileHasComponent(tempTile, isInFront)) {
            return true;
        }
        tempOffset.x += 1;
        if (tempOffset.x >= playerEntitySize) {
            tempOffset.x = 0;
            tempOffset.y += 1;
        }
    }
    return false;
}

PlayerEntity.prototype.getIsOnGround = function() {
    var tempPos = this.pos.copy();
    tempPos.y += 1;
    return this.hasCollision(tempPos, this.isInFront);
}

PlayerEntity.prototype.fall = function() {
    var tempPos = this.pos.copy();
    tempPos.y += 1;
    if (!this.hasCollision(tempPos, this.isInFront)) {
        this.pos.set(tempPos);
        return true;
    }
    return false;
}

PlayerEntity.prototype.walk = function(offsetX) {
    this.direction = offsetX;
    if (!this.getIsOnGround()) {
        return false;
    }
    var tempPos = this.pos.copy();
    tempPos.x += offsetX;
    if (this.hasCollision(tempPos, this.isInFront)) {
        // Try to walk up a stair.
        tempPos.set(this.pos);
        tempPos.y -= 1;
        if (!this.hasCollision(tempPos, this.isInFront)) {
            tempPos.x += offsetX;
            if (!this.hasCollision(tempPos, this.isInFront)) {
                this.pos.set(tempPos);
                return true;
            }
        }
        return false;
    } else {
        this.pos.set(tempPos);
        return true;
    }
}

PlayerEntity.prototype.changeLayer = function() {
    if (!this.getIsOnGround()) {
        return false;
    }
    var tempNextIsInFront = !this.isInFront;
    if (!this.hasCollision(this.pos, tempNextIsInFront)) {
        this.isInFront = tempNextIsInFront;
        return true;
    }
    return false;
}

PlayerEntity.prototype.tick = function() {
    if (this.fallDelay > 0) {
        this.fallDelay -= 1;
    } else {
        var tempResult = this.fall();
        if (tempResult) {
            this.fallDelay = 1;
        }
    }
}

PlayerEntity.prototype.drawQuarter = function(isShapeLayer, offsetX, offsetY, flipX, flipY) {
    var tempTilePos = this.pos.copy();
    tempTilePos.x += offsetX;
    tempTilePos.y += offsetY;
    var tempBasePosX = tempTilePos.x - cameraPos.x;
    var tempBasePosY = tempTilePos.y - cameraPos.y;
    var tempTile = getTile(tempTilePos);
    var tempColorIndex;
    if (tempTile == tileSet.FRONT_AND_BACK) {
        tempColorIndex = 6;
    } else if (this.isInFront) {
        if (tempTile == tileSet.BACK) {
            tempColorIndex = tileSet.FRONT_AND_BACK;
        } else {
            tempColorIndex = tileSet.FRONT;
        }
    } else {
        if (tempTile == tileSet.FRONT) {
            tempColorIndex = tileSet.FRONT_AND_BACK;
        } else {
            tempColorIndex = tileSet.BACK;
        }
    }
    if (!isShapeLayer && tileSize <= 30) {
        var tempColor = colorSet[tempColorIndex];
        drawPixel(tempBasePosX, tempBasePosY, tempColor);
    }
    if (isShapeLayer && tileSize > 30) {
        var tempColorString = colorStringSet[tempColorIndex];
        context.fillStyle = tempColorString;
        context.beginPath();
        var index = 0;
        while (index < playerQuarterOutline.length) {
            var tempOutlinePos = playerQuarterOutline[index];
            var tempPosX = tempBasePosX;
            var tempPosY = tempBasePosY;
            if (flipX) {
                tempPosX += 1 - tempOutlinePos.x;
            } else {
                tempPosX += tempOutlinePos.x;
            }
            if (flipY) {
                tempPosY += 1 - tempOutlinePos.y;
            } else {
                tempPosY += tempOutlinePos.y;
            }
            tempPosX *= tileSize;
            tempPosY *= tileSize;
            if (index <= 0) {
                context.moveTo(tempPosX, tempPosY);
            } else {
                context.lineTo(tempPosX, tempPosY);
            }
            index += 1;
        }
        context.fill();
    }
}

PlayerEntity.prototype.drawAllQuarters = function(isShapeLayer) {
    this.drawQuarter(isShapeLayer, 0, 0, false, false);
    this.drawQuarter(isShapeLayer, 1, 0, true, false);
    this.drawQuarter(isShapeLayer, 0, 1, false, true);
    this.drawQuarter(isShapeLayer, 1, 1, true, true);
}

PlayerEntity.prototype.drawPixelLayer = function() {
    this.drawAllQuarters(false);
}

PlayerEntity.prototype.drawShapeLayer = function() {
    this.drawAllQuarters(true);
    if (tileSize > 30) {
        var tempPos = this.pos.copy();
        tempPos.subtract(cameraPos);
        tempPos.scale(tileSize);
        context.fillStyle = colorStringSet[5];
        var tempOffsetX;
        if (this.direction > 0) {
            tempOffsetX = tileSize * 3 / 8;
        } else {
            tempOffsetX = 0;
        }
        context.fillRect(
            tempPos.x + tileSize / 2 + tempOffsetX,
            tempPos.y + tileSize * 5 / 8,
            tileSize / 8,
            tileSize * 3 / 8
        );
        context.fillRect(
            tempPos.x + tileSize + tempOffsetX,
            tempPos.y + tileSize * 5 / 8,
            tileSize / 8,
            tileSize * 3 / 8
        );
    }
}

function ClientDelegate() {
    
}

ClientDelegate.prototype.initialize = function() {
    context.imageSmoothingEnabled = false;
    setTileSize(64);
    addGetInitializationInfoCommand();
}

ClientDelegate.prototype.setLocalPlayerInfo = function(command) {
    
}

ClientDelegate.prototype.addCommandsBeforeUpdateRequest = function() {
    if (localPlayerEntity === null) {
        return;
    }
    removeDistantChunks();
    addGetChunkCommands();
}

function drawPixelLayer() {
    var tempBackgroundColor = colorSet[6];
    var index = 0;
    while (index < imageDataList.length) {
        imageDataList[index] = tempBackgroundColor.r;
        imageDataList[index + 1] = tempBackgroundColor.g;
        imageDataList[index + 2] = tempBackgroundColor.b;
        imageDataList[index + 3] = 255;
        index += 4;
    }
    var key;
    for (key in chunkMap) {
        var tempChunk = chunkMap[key];
        tempChunk.drawPixelLayer();
    }
    var index = 0;
    while (index < playerEntityList.length) {
        var tempPlayerEntity = playerEntityList[index];
        tempPlayerEntity.drawPixelLayer();
        index += 1;
    }
    drawTileCursorPixelLayer();
    tileContext.putImageData(imageData, 0, 0);
    context.drawImage(tileCanvas, 0, 0, canvasWidth, canvasHeight);
}

function drawShapeLayer() {
    var key;
    for (key in chunkMap) {
        var tempChunk = chunkMap[key];
        tempChunk.drawShapeLayer();
    }
    var index = 0;
    while (index < playerEntityList.length) {
        var tempPlayerEntity = playerEntityList[index];
        tempPlayerEntity.drawShapeLayer();
        index += 1;
    }
    drawTileCursorShapeLayer();
}

ClientDelegate.prototype.timerEvent = function() {
    if (localPlayerEntity === null) {
        return;
    }
    var index = 0;
    while (index < playerEntityList.length) {
        var tempPlayerEntity = playerEntityList[index];
        tempPlayerEntity.tick();
        index += 1;
    }
    cameraPos.x = localPlayerEntity.pos.x - Math.floor(canvasTileWidth / 2) + 1;
    cameraPos.y = localPlayerEntity.pos.y - Math.floor(canvasTileHeight / 2) + 1;
    drawPixelLayer();
    drawShapeLayer();
}

function moveTileCursor(offset) {
    tileCursorOffset.add(offset);
    if (tileCursorOffset.x < -2) {
        tileCursorOffset.x = -2;
    }
    if (tileCursorOffset.x > 3) {
        tileCursorOffset.x = 3;
    }
    if (tileCursorOffset.y < -2) {
        tileCursorOffset.y = -2;
    }
    if (tileCursorOffset.y > 3) {
        tileCursorOffset.y = 3;
    }
}

function placeTile(isInFront) {
    var tempPos = getTileCursorPos();
    var tempOldTile = getTile(tempPos);
    if (tempOldTile === null || tempOldTile == tileSet.DIAMOND) {
        return;
    }
    if (tileHasComponent(tempOldTile, isInFront)) {
        return;
    }
    var tempNewTile = null;
    if (isInFront) {
        if (tempOldTile == tileSet.EMPTY) {
            tempNewTile = tileSet.FRONT;
        } else if (tempOldTile == tileSet.BACK) {
            tempNewTile = tileSet.FRONT_AND_BACK;
        }
    } else {
        if (tempOldTile == tileSet.EMPTY) {
            tempNewTile = tileSet.BACK;
        } else if (tempOldTile == tileSet.FRONT) {
            tempNewTile = tileSet.FRONT_AND_BACK;
        }
    }
    if (tempNewTile === null) {
        return;
    }
    setTile(tempPos, tempNewTile);
    addPlaceTileCommand(tempPos, isInFront);
}

function removeTile(isInFront) {
    var tempPos = getTileCursorPos();
    var tempOldTile = getTile(tempPos);
    if (tempOldTile === null) {
        return;
    }
    if (!tileHasComponent(tempOldTile, isInFront)) {
        return;
    }
    var tempNewTile = null;
    if (tempOldTile == tileSet.DIAMOND) {
        tempNewTile = tileSet.EMPTY;
    } else if (isInFront) {
        if (tempOldTile == tileSet.FRONT) {
            tempNewTile = tileSet.EMPTY;
        } else if (tempOldTile == tileSet.FRONT_AND_BACK) {
            tempNewTile = tileSet.BACK;
        }
    } else {
        if (tempOldTile == tileSet.BACK) {
            tempNewTile = tileSet.EMPTY;
        } else if (tempOldTile == tileSet.FRONT_AND_BACK) {
            tempNewTile = tileSet.FRONT;
        }
    }
    if (tempNewTile === null) {
        return;
    }
    setTile(tempPos, tempNewTile);
    addRemoveTileCommand(tempPos, isInFront);
}

ClientDelegate.prototype.keyDownEvent = function(keyCode) {
    if (focusedTextInput !== null) {
        return true;
    }
    if (keyCode == 49) {
        setTileSize(64);
    }
    if (keyCode == 50) {
        setTileSize(32);
    }
    if (keyCode == 51) {
        setTileSize(16);
    }
    if (keyCode == 52) {
        setTileSize(8);
    }
    if (keyCode == 65) {
        moveTileCursor(new Pos(-1, 0));
    }
    if (keyCode == 68) {
        moveTileCursor(new Pos(1, 0));
    }
    if (keyCode == 87) {
        moveTileCursor(new Pos(0, -1));
    }
    if (keyCode == 83) {
        moveTileCursor(new Pos(0, 1));
    }
    if (keyCode == 81) {
        if (shiftKeyIsHeld) {
            removeTile(false);
        } else {
            placeTile(false);
        }
    }
    if (keyCode == 69) {
        if (shiftKeyIsHeld) {
            removeTile(true);
        } else {
            placeTile(true);
        }
    }
    if (keyCode == 37) {
        localPlayerEntity.walk(-1);
    }
    if (keyCode == 39) {
        localPlayerEntity.walk(1);
    }
    if (keyCode == 32) {
        localPlayerEntity.changeLayer();
    }
    return true;
}

ClientDelegate.prototype.keyUpEvent = function(keyCode) {
    
    return true;
}

clientDelegate = new ClientDelegate();


