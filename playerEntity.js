
var Pos = require("./pos").Pos;

var playerEntityList = [];

function PlayerEntity(player) {
    this.player = player;
    playerEntityList.push(this);
}

module.exports = {
    PlayerEntity: PlayerEntity,
    playerEntityList: playerEntityList
};

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


