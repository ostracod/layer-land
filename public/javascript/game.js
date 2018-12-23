
function addGetChunkCommand(pos) {
    gameUpdateCommandList.push({
        commandName: "getChunk",
        pos: pos.toJson()
    });
}

addCommandListener("setChunk", function(command) {
    // TODO: Process the command.
    console.log(command);
    console.log(command.tileData.length);
});

function ClientDelegate() {
    
}

ClientDelegate.prototype.initialize = function() {
    
}

ClientDelegate.prototype.setLocalPlayerInfo = function(command) {
    // TEST CODE.
    addGetChunkCommand(new Pos(0, 0));
}

ClientDelegate.prototype.addCommandsBeforeUpdateRequest = function() {
    
}

ClientDelegate.prototype.timerEvent = function() {
    clearCanvas();
    
}

ClientDelegate.prototype.keyDownEvent = function(keyCode) {
    
    return true;
}

ClientDelegate.prototype.keyUpEvent = function(keyCode) {
    
    return true;
}

clientDelegate = new ClientDelegate();


