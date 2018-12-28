
var Pos = require("./pos").Pos;

var fs = require("fs");
var pathUtils = require("path");

var clusterDirectory = "./clusters";
var chunkSize = 200;
var chunkLength = chunkSize * chunkSize;
var chunkDataLength = Math.ceil(chunkLength / 2);
var chunkUnloadDistance = 160;
var clusterChunkSize = 10;
var clusterChunkLength = clusterChunkSize * clusterChunkSize;
var clusterSize = clusterChunkSize * chunkSize;
var clusterHeaderLength = clusterChunkLength * 4;
var tileSet = {
    EMPTY: 0,
    BACK: 1,
    FRONT: 2,
    FRONT_AND_BACK: 3,
    DIAMOND: 4
};

// Format of cluster file:
// (chunk look-up header) (chunk data) (chunk data) (chunk data)...
// The look-up header is an array of int32 with size clusterChunkSize * clusterChunkSize.
// Each integer in the header specifies the file offset of the corresponding chunk.
// If the chunk is missing, the integer will be negative.
// Chunk data is an array of nybbles with size chunkSize * chunkSize.

if (!fs.existsSync(clusterDirectory)) {
    fs.mkdirSync(clusterDirectory);
}

function Chunk(pos) {
    this.pos = tileUtils.roundPosToChunk(pos);
    this.clusterPos = tileUtils.roundPosToCluster(this.pos);
    this.posInCluster = new Pos(
        Math.floor((this.pos.x - this.clusterPos.x) / chunkSize),
        Math.floor((this.pos.y - this.clusterPos.y) / chunkSize),
    );
    this.lookUpEntryOffset = (this.posInCluster.x + this.posInCluster.y * clusterChunkSize) * 4;
    this.clusterPath = pathUtils.join(
        clusterDirectory,
        "cluster_" + this.clusterPos.x + "_" + this.clusterPos.y + ".dat"
    );
    this.isDirty = false;
    this.tileList = null;
    this.clusterFileOffset = null;
    if (fs.existsSync(this.clusterPath)) {
        this.clusterFile = fs.openSync(this.clusterPath, "r");
        var tempBuffer = Buffer.alloc(4);
        fs.readSync(this.clusterFile, tempBuffer, 0, 4, this.lookUpEntryOffset);
        var tempValue = tempBuffer.readInt32LE(0);
        if (tempValue >= 0) {
            this.clusterFileOffset = tempValue;
            this.readTiles();
        }
        fs.closeSync(this.clusterFile);
        this.clusterFile = null;
    }
    if (this.tileList === null) {
        this.generateTiles();
    }
}

Chunk.prototype.readTiles = function() {
    if (this.clusterFile === null) {
        throw new Error("Cluster file is not open");
    }
    var tempBuffer = Buffer.alloc(chunkDataLength);
    fs.readSync(this.clusterFile, tempBuffer, 0, chunkDataLength, this.clusterFileOffset);
    this.tileList = [];
    var index = 0;
    while (index < chunkLength) {
        var tempValue = tempBuffer[Math.floor(index / 2)];
        var tempTile;
        if (index % 2 == 0) {
            tempTile = (tempValue & 0xF0) >> 4;
        } else {
            tempTile = tempValue & 0x0F;
        }
        this.tileList.push(tempTile);
        index += 1;
    }
}

Chunk.prototype.generateTiles = function() {
    var tempTile;
    if (this.pos.y >= 0) {
        tempTile = tileSet.FRONT_AND_BACK;
    } else {
        tempTile = tileSet.EMPTY;
    }
    this.tileList = [];
    while (this.tileList.length < chunkLength) {
        this.tileList.push(tempTile);
    }
    this.isDirty = true;
}

Chunk.prototype.persist = function() {
    if (!this.isDirty) {
        return;
    }
    console.log("Persisting chunk at " + this.pos.toString() + "...");
    if (fs.existsSync(this.clusterPath)) {
        this.clusterFile = fs.openSync(this.clusterPath, "r+");
    } else {
        this.clusterFile = fs.openSync(this.clusterPath, "w");
        var tempBuffer = Buffer.alloc(clusterHeaderLength);
        var index = 0;
        while (index < clusterChunkLength) {
            tempBuffer.writeInt32LE(-1, index * 4);
            index += 1;
        }
        fs.writeSync(this.clusterFile, tempBuffer, 0, clusterHeaderLength, 0);
    }
    if (this.clusterFileOffset === null) {
        this.clusterFileOffset = fs.statSync(this.clusterPath).size;
        var tempBuffer = Buffer.alloc(4);
        tempBuffer.writeInt32LE(this.clusterFileOffset, 0);
        fs.writeSync(this.clusterFile, tempBuffer, 0, 4, this.lookUpEntryOffset);
    }
    var tempBuffer = Buffer.alloc(chunkDataLength);
    var index = 0;
    while (index < chunkLength) {
        var tempTile = this.tileList[index];
        var tempIndex = Math.floor(index / 2);
        var tempValue = tempBuffer[tempIndex];
        if (index % 2 == 0) {
            tempValue = (tempValue & 0x0F) | (tempTile << 4);
        } else {
            tempValue = (tempValue & 0xF0) | tempTile;
        }
        tempBuffer[tempIndex] = tempValue;
        index += 1;
    }
    fs.writeSync(this.clusterFile, tempBuffer, 0, chunkDataLength, this.clusterFileOffset);
    fs.closeSync(this.clusterFile);
    this.clusterFile = null;
    this.isDirty = false;
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
    var tempOldTile = this.tileList[index];
    if (tile != tempOldTile) {
        this.tileList[index] = tile;
        this.isDirty = true;
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

function TileUtils() {
    this.chunkSize = chunkSize;
    // Map from pos string representation to chunk.
    this.chunkMap = {};
}

var tileUtils = new TileUtils();

module.exports = tileUtils;

var playerEntityList = require("./playerEntity").playerEntityList;

TileUtils.prototype.roundPosToChunk = function(pos) {
    return new Pos(
        Math.floor(pos.x / chunkSize) * chunkSize,
        Math.floor(pos.y / chunkSize) * chunkSize
    );
}

TileUtils.prototype.roundPosToCluster = function(pos) {
    return new Pos(
        Math.floor(pos.x / clusterSize) * clusterSize,
        Math.floor(pos.y / clusterSize) * clusterSize
    );
}

TileUtils.prototype.convertPosToChunkKey = function(pos) {
    return Math.floor(pos.x / chunkSize) + "," + Math.floor(pos.y / chunkSize);
}

TileUtils.prototype.getChunk = function(pos) {
    var tempKey = this.convertPosToChunkKey(pos);
    if (!(tempKey in this.chunkMap)) {
        this.chunkMap[tempKey] = new Chunk(pos);
    }
    return this.chunkMap[tempKey];
}

TileUtils.prototype.tileHasFrontAndBack = function(tile) {
    return (
        tile === tileSet.FRONT_AND_BACK
        || tile === tileSet.DIAMOND
        || tile === null
    );
}

TileUtils.prototype.tileHasFront = function(tile) {
    return (
        tile === tileSet.FRONT
        || tileUtils.tileHasFrontAndBack(tile)
    );
}

TileUtils.prototype.tileHasBack = function(tile) {
    return (
        tile === tileSet.BACK
        || tileUtils.tileHasFrontAndBack(tile)
    );
}

TileUtils.prototype.tileHasComponent = function(tile, isInFront) {
    if (isInFront) {
        return this.tileHasFront(tile);
    } else {
        return this.tileHasBack(tile);
    }
}

TileUtils.prototype.persistAllChunks = function() {
    var key;
    for (key in this.chunkMap) {
        var tempChunk = this.chunkMap[key];
        tempChunk.persist();
    }
}

TileUtils.prototype.removeDistantChunks = function() {
    var tempKeyToUnloadList = [];
    var key;
    for (key in this.chunkMap) {
        var tempChunk = this.chunkMap[key];
        var tempShouldUnloadChunk = true;
        var index = 0;
        while (index < playerEntityList.length) {
            var tempPlayerEntity = playerEntityList[index];
            var tempPos = tempPlayerEntity.getPos();
            var tempDistance = tempChunk.getOrthogonalDistance(tempPos);
            if (tempDistance < chunkUnloadDistance) {
                tempShouldUnloadChunk = false;
                break;
            }
            index += 1;
        }
        if (tempShouldUnloadChunk) {
            tempKeyToUnloadList.push(key);
        }
    }
    var index = 0;
    while (index < tempKeyToUnloadList.length) {
        var tempKey = tempKeyToUnloadList[index];
        delete this.chunkMap[tempKey];
        index += 1;
    }
}

TileUtils.prototype.getTile = function(pos) {
    var tempChunk = this.getChunk(pos);
    if (tempChunk === null) {
        return null;
    }
    return tempChunk.getTile(pos);
}

TileUtils.prototype.setTile = function(pos, tile) {
    var tempChunk = this.getChunk(pos);
    if (tempChunk === null) {
        return;
    }
    tempChunk.setTile(pos, tile);
}

TileUtils.prototype.placeTile = function(pos, isInFront) {
    var tempOldTile = this.getTile(pos);
    if (tempOldTile == tileSet.DIAMOND) {
        return false;
    }
    if (tileUtils.tileHasComponent(tempOldTile, isInFront)) {
        return false;
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
        return false;
    }
    this.setTile(pos, tempNewTile);
    return true;
}

TileUtils.prototype.removeTile = function(pos, isInFront) {
    var tempOldTile = this.getTile(pos);
    if (!tileUtils.tileHasComponent(tempOldTile, isInFront)) {
        return false;
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
        return false;
    }
    this.setTile(pos, tempNewTile);
    return true;
}

TileUtils.prototype.tileSet = tileSet;


