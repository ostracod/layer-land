
var Pos = require("./pos");

var fs = require("fs");
var pathUtils = require("path");

var clusterDirectory = "./clusters";
var chunkSize = 200;
var chunkLength = chunkSize * chunkSize;
var chunkDataLength = Math.ceil(chunkLength / 2);
var clusterChunkSize = 10;
var clusterChunkLength = clusterChunkSize * clusterChunkSize;
var clusterSize = clusterChunkSize * chunkSize;
var clusterHeaderLength = clusterChunkLength * 4;

// Format of cluster file:
// (chunk look-up header) (chunk data) (chunk data) (chunk data)...
// The look-up header is an array of int32 with size clusterChunkSize * clusterChunkSize.
// Each integer in the header specifies the file offset of the corresponding chunk.
// If the chunk is missing, the integer will be negative.
// Chunk data is an array of nybbles with size chunkSize * chunkSize.

if (!fs.existsSync(clusterDirectory)) {
    fs.mkdirSync(clusterDirectory);
}

function roundPosToChunk(pos) {
    return new Pos(
        Math.floor(pos.x / chunkSize) * chunkSize,
        Math.floor(pos.y / chunkSize) * chunkSize
    );
}

function roundPosToCluster(pos) {
    return new Pos(
        Math.floor(pos.x / clusterSize) * clusterSize,
        Math.floor(pos.y / clusterSize) * clusterSize
    );
}

function Chunk(pos) {
    this.pos = roundPosToChunk(pos);
    this.clusterPos = roundPosToCluster(this.pos);
    this.posInCluster = new Pos(
        Math.floor((this.pos.x - this.clusterPos.x) / chunkSize),
        Math.floor((this.pos.y - this.clusterPos.y) / chunkSize),
    );
    this.lookUpEntryOffset = (this.posInCluster.x + this.posInCluster.y * clusterChunkSize) * 4;
    this.clusterPath = pathUtils.join(
        clusterDirectory,
        "cluster_" + this.clusterPos.x + "_" + this.clusterPos.y + ".dat"
    );
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
    // TODO: Generate the correct tiles instead of random ones.
    this.tileList = [];
    while (this.tileList.length < chunkLength) {
        this.tileList.push(Math.floor(Math.random() * 5));
    }
}

Chunk.prototype.persist = function() {
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
}

// TEST CODE.
/*
var tempChunk1 = new Chunk(new Pos(10, 10));
console.log(tempChunk1.tileList.slice(0, 50).join(", "));
tempChunk1.persist();
var tempChunk2 = new Chunk(new Pos(310, 10));
console.log(tempChunk2.tileList.slice(0, 50).join(", "));
tempChunk2.persist();
*/

function TileUtils() {

}

var tileUtils = new TileUtils();

module.exports = tileUtils;

TileUtils.prototype.tileSet = {
    EMPTY: 0,
    BACK: 1,
    FRONT: 2,
    FRONT_AND_BACK: 3,
    DIAMOND: 4
};


