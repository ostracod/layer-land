
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
    new Color(98, 212, 134),
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
]

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

addCommandListener("setInitializationInfo", function(command) {
    chunkSize = command.chunkSize;
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

Chunk.prototype.getTile = function(pos) {
    return this.tileList[(pos.x - this.pos.x) + (pos.y - this.pos.y) * chunkSize];
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

function PlayerEntity(pos) {
    this.pos = pos;
    this.isInFront = true;
    this.direction = 1;
    playerEntityList.push(this);
}

PlayerEntity.prototype.drawQuarter = function(offsetX, offsetY, flipX, flipY) {
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
    if (tileSize <= 30) {
        var tempColor = colorSet[tempColorIndex];
        drawPixel(tempBasePosX, tempBasePosY, tempColor);
        return;
    }
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

PlayerEntity.prototype.drawAllQuarters = function() {
    this.drawQuarter(0, 0, false, false);
    this.drawQuarter(1, 0, true, false);
    this.drawQuarter(0, 1, false, true);
    this.drawQuarter(1, 1, true, true);
}

PlayerEntity.prototype.drawPixelLayer = function() {
    this.drawAllQuarters();
}

PlayerEntity.prototype.drawShapeLayer = function() {
    this.drawAllQuarters();
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
    // TEST CODE.
    addGetChunkCommand(new Pos(0, 0));
    new PlayerEntity(new Pos(10, 10));
}

ClientDelegate.prototype.addCommandsBeforeUpdateRequest = function() {
    
}

ClientDelegate.prototype.timerEvent = function() {
    var tempBackgroundColor = colorSet[6];
    var index = 0;
    while (index < imageDataList.length) {
        imageDataList[index] = tempBackgroundColor.r;
        imageDataList[index + 1] = tempBackgroundColor.g;
        imageDataList[index + 2] = tempBackgroundColor.b;
        imageDataList[index + 3] = 255;
        index += 4;
    }
    var tempChunk = getChunk(new Pos(0, 0));
    if (tempChunk !== null) {
        tempChunk.drawPixelLayer();
    }
    var index = 0;
    while (index < playerEntityList.length) {
        var tempPlayerEntity = playerEntityList[index];
        tempPlayerEntity.drawPixelLayer();
        index += 1;
    }
    tileContext.putImageData(imageData, 0, 0);
    context.drawImage(tileCanvas, 0, 0, canvasWidth, canvasHeight);
    if (tempChunk !== null) {
        tempChunk.drawShapeLayer();
    }
    var index = 0;
    while (index < playerEntityList.length) {
        var tempPlayerEntity = playerEntityList[index];
        tempPlayerEntity.drawShapeLayer();
        index += 1;
    }
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
    return true;
}

ClientDelegate.prototype.keyUpEvent = function(keyCode) {
    
    return true;
}

clientDelegate = new ClientDelegate();


