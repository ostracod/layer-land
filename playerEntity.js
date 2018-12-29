
var Pos = require("./pos").Pos;

var playerEntitySize = 2;
var playerEntityList = [];

function PlayerEntity(player) {
    this.player = player;
    this.isInFront = true;
    playerEntityList.push(this);
    var tempPos = this.getPos();
    while (true) {
        if (!this.hasCollision(tempPos, this.isInFront)) {
            break;
        }
        tempPos.y -= 1;
    }
    this.setPos(tempPos);
}

module.exports = {
    PlayerEntity: PlayerEntity,
    playerEntityList: playerEntityList
};

var tileUtils = require("./tileUtils");

PlayerEntity.prototype.getPos = function() {
    return new Pos(
        this.player.extraFields.posX,
        this.player.extraFields.posY,
    );
}

PlayerEntity.prototype.setPos = function(pos) {
    this.player.extraFields.posX = pos.x;
    this.player.extraFields.posY = pos.y;
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
    var tempPos = this.getPos();
    tempPos.y += 1;
    return this.hasCollision(tempPos, this.isInFront);
}

PlayerEntity.prototype.fall = function() {
    var tempPos = this.getPos();
    tempPos.y += 1;
    if (this.hasCollision(tempPos, this.isInFront)) {
        return false;
    }
    this.setPos(tempPos);
    return true;
}

PlayerEntity.prototype.walk = function(offsetX) {
    if (!this.getIsOnGround()) {
        return false;
    }
    var tempPos = this.getPos();
    tempPos.x += offsetX;
    if (this.hasCollision(tempPos, this.isInFront)) {
        // Try to walk up a stair.
        var tempPos = this.getPos();
        tempPos.y -= 1;
        if (this.hasCollision(tempPos, this.isInFront)) {
            return false;
        }
        tempPos.x += offsetX;
        if (this.hasCollision(tempPos, this.isInFront)) {
            return false;
        }
        this.setPos(tempPos);
    } else {
        this.setPos(tempPos);
    }
    return true;
}

PlayerEntity.prototype.setLayer = function(isInFront) {
    if (this.hasCollision(this.getPos(), isInFront)) {
        return false;
    }
    this.isInFront = isInFront;
    return true;
}


