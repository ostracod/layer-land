
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


