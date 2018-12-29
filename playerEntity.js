
var Pos = require("./pos").Pos;

var playerEntitySize = 2;
var playerEntityList = [];

function PlayerEntity(player) {
    this.player = player;
    this.pos = new Pos(
        this.player.extraFields.posX,
        this.player.extraFields.posY
    );
    this.isInFront = this.player.extraFields.isInFront;
    playerEntityList.push(this);
    while (true) {
        if (!this.hasCollision(this.pos, this.isInFront)) {
            break;
        }
        this.pos.y -= 1;
    }
}

module.exports = {
    PlayerEntity: PlayerEntity,
    playerEntityList: playerEntityList
};

var tileUtils = require("./tileUtils");

PlayerEntity.prototype.populatePlayerExtraFields = function() {
    this.player.extraFields.posX = this.pos.x;
    this.player.extraFields.posY = this.pos.y;
    this.player.extraFields.isInFront = this.isInFront;
}

PlayerEntity.prototype.hasCollision = function(pos, isInFront) {
    var tempPos = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < playerEntitySize) {
        tempPos.set(pos);
        tempPos.add(tempOffset);
        var tempTile = tileUtils.getTile(tempPos);
        if (tileUtils.tileHasComponent(tempTile, isInFront)) {
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
    if (this.hasCollision(tempPos, this.isInFront)) {
        return false;
    }
    this.pos.set(tempPos);
    return true;
}

PlayerEntity.prototype.walk = function(offsetX) {
    if (!this.getIsOnGround()) {
        return false;
    }
    var tempPos = this.pos.copy();
    tempPos.x += offsetX;
    if (this.hasCollision(tempPos, this.isInFront)) {
        // Try to walk up a stair.
        tempPos.set(this.pos);
        tempPos.y -= 1;
        if (this.hasCollision(tempPos, this.isInFront)) {
            return false;
        }
        tempPos.x += offsetX;
        if (this.hasCollision(tempPos, this.isInFront)) {
            return false;
        }
        this.pos.set(tempPos);
    } else {
        this.pos.set(tempPos);
    }
    return true;
}

PlayerEntity.prototype.setLayer = function(isInFront) {
    if (this.hasCollision(this.pos, isInFront)) {
        return false;
    }
    this.isInFront = isInFront;
    return true;
}


