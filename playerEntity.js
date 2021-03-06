
var Pos = require("./pos").Pos;

var playerEntitySize = 2;
var playerEntityList = [];

function TimeBudget(maximumTime) {
    this.maximumTime = maximumTime;
    this.time = this.maximumTime;
}

TimeBudget.prototype.addTime = function(amount) {
    this.time += amount;
    if (this.time > this.maximumTime) {
        this.time = this.maximumTime;
    }
}

TimeBudget.prototype.spendTime = function(amount) {
    if (this.time <= 0) {
        return false
    }
    this.time -= amount;
    return true;
}

function PlayerEntity(player) {
    this.player = player;
    this.pos = new Pos(
        this.player.extraFields.posX,
        this.player.extraFields.posY
    );
    this.isInFront = this.player.extraFields.isInFront;
    this.direction = 1;
    this.miningPos = null;
    this.miningIsInFront = null;
    this.lastTileChangeId = tileUtils.lastTileChangeId;
    this.walkTimeBudget = new TimeBudget(6);
    this.mineTimeBudget = new TimeBudget(6);
    this.lastTickTime = Date.now() / 1000;
    playerEntityList.push(this);
    while (true) {
        if (!this.hasCollision(this.pos, this.isInFront)) {
            break;
        }
        this.pos.y -= 1;
    }
}

// isInFront or playerToExclude may be undefined.
function playerEntityIncludesPos(pos, isInFront, playerToExclude) {
    var index = 0;
    while (index < playerEntityList.length) {
        var tempPlayerEntity = playerEntityList[index];
        if (typeof playerToExclude === "undefined"
                || tempPlayerEntity !== playerToExclude) {
            if (tempPlayerEntity.includesPos(pos, isInFront)) {
                return true;
            }
        }
        index += 1;
    }
    return false;
}

module.exports = {
    PlayerEntity: PlayerEntity,
    playerEntityList: playerEntityList,
    playerEntityIncludesPos: playerEntityIncludesPos
};

var tileUtils = require("./tileUtils");
var tileSet = tileUtils.tileSet;

PlayerEntity.prototype.populatePlayerExtraFields = function() {
    this.player.extraFields.posX = this.pos.x;
    this.player.extraFields.posY = this.pos.y;
    this.player.extraFields.isInFront = this.isInFront;
}

PlayerEntity.prototype.getUsername = function() {
    return this.player.username;
}

PlayerEntity.prototype.getScore = function() {
    return this.player.score;
}

PlayerEntity.prototype.setScore = function(score) {
    this.player.score = score;
}

PlayerEntity.prototype.getBackTileCount = function() {
    return this.player.extraFields.backTileCount;
}

PlayerEntity.prototype.setBackTileCount = function(count) {
    this.player.extraFields.backTileCount = count;
}

PlayerEntity.prototype.getFrontTileCount = function() {
    return this.player.extraFields.frontTileCount;
}

PlayerEntity.prototype.setFrontTileCount = function(count) {
    this.player.extraFields.frontTileCount = count;
}

PlayerEntity.prototype.getInventorySizeWithoutRounding = function() {
    return Math.pow(this.getScore(), 1 / 2.5) + 15;
}

PlayerEntity.prototype.getInventorySize = function() {
    return Math.floor(this.getInventorySizeWithoutRounding());
}

PlayerEntity.prototype.getMiningSpeed = function() {
    return 183 / (Math.pow(this.getInventorySizeWithoutRounding(), 1.3) + 100);
}

PlayerEntity.prototype.getInventoryOccupiedSize = function() {
    return this.getBackTileCount() + this.getFrontTileCount();
}

PlayerEntity.prototype.getInventoryHasSpace = function() {
    return this.getInventoryOccupiedSize() < this.getInventorySize();
}

PlayerEntity.prototype.addTileCount = function(isInFront, amount) {
    if (isInFront) {
        this.setFrontTileCount(this.getFrontTileCount() + amount);
    } else {
        this.setBackTileCount(this.getBackTileCount() + amount);
    }
}

PlayerEntity.prototype.includesPos = function(pos, isInFront) {
    if (isInFront !== "undefined" && this.isInFront != isInFront) {
        return false;
    }
    return (
        pos.x >= this.pos.x
        && pos.x < this.pos.x + playerEntitySize
        && pos.y >= this.pos.y
        && pos.y < this.pos.y + playerEntitySize
    );
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
        if (playerEntityIncludesPos(tempPos, isInFront, this)) {
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
    }
    var tempResult = this.walkTimeBudget.spendTime(0.09);
    if (!tempResult) {
        return false;
    }
    this.pos.set(tempPos);
    return true;
}

PlayerEntity.prototype.setLayer = function(isInFront) {
    if (this.hasCollision(this.pos, isInFront)) {
        return false;
    }
    this.isInFront = isInFront;
    return true;
}

PlayerEntity.prototype.posIsInCursorRange = function(pos) {
    return (
        pos.x >= this.pos.x - 2
        && pos.x <= this.pos.x + 3
        && pos.y >= this.pos.y - 2
        && pos.y <= this.pos.y + 3
    );
}

PlayerEntity.prototype.placeTile = function(pos, isInFront) {
    if (isInFront) {
        if (this.getFrontTileCount() <= 0) {
            return false;
        }
    } else {
        if (this.getBackTileCount() <= 0) {
            return false;
        }
    }
    if (!this.posIsInCursorRange(pos)) {
        return false;
    }
    var tempOldTile = tileUtils.getTile(pos);
    if (tempOldTile == tileSet.DIAMOND) {
        return false;
    }
    if (tileUtils.tileHasComponent(tempOldTile, isInFront)) {
        return false;
    }
    if (playerEntityIncludesPos(pos, isInFront)) {
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
    tileUtils.setTile(pos, tempNewTile);
    this.addTileCount(isInFront, -1);
    return true;
}

PlayerEntity.prototype.canMine = function(pos, isInFront) {
    var tempOldTile = tileUtils.getTile(pos);
    if (tempOldTile === null) {
        return false;
    }
    if (tempOldTile != tileSet.DIAMOND && !this.getInventoryHasSpace()) {
        return false;
    }
    return tileUtils.tileHasComponent(tempOldTile, isInFront);
}

PlayerEntity.prototype.startMining = function(pos, isInFront) {
    if (!this.posIsInCursorRange(pos)) {
        return false;
    }
    if (!this.canMine(pos, isInFront)) {
        return false;
    }
    this.miningPos = pos;
    this.miningIsInFront = isInFront;
    return true;
}

PlayerEntity.prototype.finishMining = function() {
    if (this.miningPos === null) {
        return false;
    }
    var tempPos = this.miningPos;
    this.miningPos = null;
    if (!this.canMine(tempPos, this.miningIsInFront)) {
        return false;
    }
    var tempOldTile = tileUtils.getTile(tempPos);
    var tempNewTile = null;
    if (tempOldTile == tileSet.DIAMOND) {
        tempNewTile = tileSet.EMPTY;
    } else if (this.miningIsInFront) {
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
    var tempTime = this.getMiningSpeed() * 0.9;
    var tempResult = this.mineTimeBudget.spendTime(tempTime);
    if (!tempResult) {
        return false;
    }
    tileUtils.setTile(tempPos, tempNewTile);
    if (tempOldTile == tileSet.DIAMOND) {
        this.setScore(this.getScore() + 1);
    } else {
        this.addTileCount(this.miningIsInFront, 1);
    }
    return true;
}

PlayerEntity.prototype.tick = function() {
    var tempTime = Date.now() / 1000;
    var tempTimeOffset = tempTime - this.lastTickTime;
    this.walkTimeBudget.addTime(tempTimeOffset);
    this.mineTimeBudget.addTime(tempTimeOffset);
    this.lastTickTime = tempTime;
}


