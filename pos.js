
function createPosFromJson(data) {
    return new Pos(data.x, data.y);
}

function Pos(x, y) {
    this.x = x;
    this.y = y;
}

module.exports = {
    Pos: Pos,
    createPosFromJson: createPosFromJson
};

Pos.prototype.set = function(pos) {
    this.x = pos.x;
    this.y = pos.y;
}

Pos.prototype.add = function(pos) {
    this.x += pos.x;
    this.y += pos.y;
}

Pos.prototype.subtract = function(pos) {
    this.x -= pos.x;
    this.y -= pos.y;
}

Pos.prototype.copy = function() {
    return new Pos(this.x, this.y);
}

Pos.prototype.equals = function(pos) {
    return (this.x == pos.x && this.y == pos.y);
}

Pos.prototype.getOrthogonalDistance = function(pos) {
    var tempDistanceX = Math.abs(this.x - pos.x);
    var tempDistanceY = Math.abs(this.y - pos.y);
    if (tempDistanceX > tempDistanceY) {
        return tempDistanceX;
    } else {
        return tempDistanceY;
    }
}

Pos.prototype.toString = function() {
    return "(" + this.x + ", " + this.y + ")";
}

Pos.prototype.toJson = function() {
    return {
        x: this.x,
        y: this.y
    };
}


