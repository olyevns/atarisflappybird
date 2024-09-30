var debugmode = false;

var states = Object.freeze({
    SplashScreen: 0,
    GameScreen: 1,
    ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = $("#flyarea").height();

var score = 0;
var highscore = 0;

var pipeheight = 90;
var pipewidth = 52;
var pipes = [];

var replayclickable = false;

// sounds
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

// loops
var loopGameloop;
var loopPipeloop;

$(document).ready(function() {
    if (window.location.search == "?debug")
        debugmode = true;
    if (window.location.search == "?easy")
        pipeheight = 200;

    // get the highscore
    var savedscore = getCookie("highscore");
    if (savedscore != "")
        highscore = parseInt(savedscore);

    // start with the splash screen
    showSplash();
});

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function showSplash() {
    currentstate = states.SplashScreen;

    // set the defaults (again)
    velocity = 0;
    position = 180;
    rotation = 0;
    score = 0;

    // update the player in preparation for the next game
    $("#player").css({ y: 0, x: 0 });
    updatePlayer($("#player"));

    soundSwoosh.stop();
    soundSwoosh.play();

    // clear out all the pipes if there are any
    $(".pipe").remove();
    pipes = [];

    // make everything animated again
    $(".animated").css('animation-play-state', 'running');
    $(".animated").css('-webkit-animation-play-state', 'running');

    // fade in the splash
    $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

function startGame() {
    currentstate = states.GameScreen;

    // fade out the splash
    $("#splash").stop();
    $("#splash").transition({ opacity: 0 }, 500, 'ease');

    // update the big score
    setBigScore();

    // debug mode?
    if (debugmode) {
        // show the bounding boxes
        $(".boundingbox").show();
    }

    // start up our loops
    var updaterate = 1000.0 / 60.0; // 60 times a second
    loopGameloop = setInterval(gameloop, updaterate);
    loopPipeloop = setInterval(updatePipes, 1400);

    // jump from the start!
    playerJump();
}

function updatePlayer(player) {
    // rotation
    rotation = Math.min((velocity / 10) * 90, 90);

    // apply rotation and position
    $(player).css({ rotate: rotation, top: position });
}

function gameloop() {
    var player = $("#player");

    // update the player speed/position
    velocity += gravity;
    position += velocity;

    // update the player
    updatePlayer(player);

    // create the bounding box
    var box = document.getElementById('player').getBoundingClientRect();
    var origwidth = 34.0;
    var origheight = 24.0;

    var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
    var boxheight = (origheight + box.height) / 2;
    var boxleft = ((box.width - boxwidth) / 2) + box.left;
    var boxtop = ((box.height - boxheight) / 2) + box.top;
    var boxright = boxleft + boxwidth;
    var boxbottom = boxtop + boxheight;

    // if we're in debug mode, draw the bounding box
    if (debugmode) {
        var boundingbox = $("#playerbox");
        boundingbox.css('left', boxleft);
        boundingbox.css('top', boxtop);
        boundingbox.css('height', boxheight);
        boundingbox.css('width', boxwidth);
    }

    // did we hit the ground?
    if (box.bottom >= $("#land").offset().top) {
        playerDead();
        return;
    }

    // have they tried to escape through the ceiling? :o
    var ceiling = $("#ceiling");
    if (boxtop <= (ceiling.offset().top + ceiling.height()))
        position = 0;

    // we can't go any further without a pipe
    if (pipes[0] == null)
        return;

    // determine the bounding box of the next pipes inner area
    var nextpipe = pipes[0];
    var nextpipeupper = nextpipe.children(".pipe_upper");

    var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
    var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
    var piperight = pipeleft + pipewidth;
    var pipebottom = pipetop + pipeheight;

    if (debugmode) {
        var boundingbox = $("#pipebox");
        boundingbox.css('left', pipeleft);
        boundingbox.css('top', pipetop);
        boundingbox.css('height', pipeheight);
        boundingbox.css('width', pipewidth);
    }

    // have we gotten inside the pipe yet?
    if (boxright > pipeleft) {
        // we're within the pipe, have we passed between upper and lower pipes?
        if (boxtop > pipetop && boxbottom < pipebottom) {
            // yeah! we're within bounds
        } else {
            // no! we touched the pipe
            playerDead();
            return;
        }
    }

    // have we passed the imminent danger?
    if (boxleft > piperight) {
        // yes, remove it
        pipes.splice(0, 1);

        // and score a point
        playerScore();
    }
}

// Handle space bar
$(document).keydown(function(e) {
    // space bar!
    if (e.keyCode == 32) {
        // in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
        if (currentstate == states.ScoreScreen)
            $("#replay").click();
        else
            screenClick();
    }
});

// Handle mouse down OR touch start
if ("ontouchstart" in window)
    $(document).on("touchstart", screenClick);
else
    $(document).on("mousedown", screenClick);

function screenClick() {
    if (currentstate == states.GameScreen) {
        playerJump();
    } else if (currentstate == states.SplashScreen) {
        startGame();
    }
}

function playerJump() {
    velocity = jump;
    // play jump sound
    soundJump.stop();
    soundJump.play();
}

function setBigScore(erase) {
    var elemscore = $("#bigscore");
    elemscore.empty();

    if (erase)
        return;

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setSmallScore() {
    var elemscore = $("#currentscore");
    elemscore.empty();

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore() {
    var elemscore = $("#highscore");
    elemscore.empty();

    var digits = highscore.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal() {
    var elemmedal = $("#medal");
    elemmedal.empty();

    if (score < 10)
        // signal that no medal has been awarded
        return;

    // Determine which medal to display based on score
    var medalType = '';
    if (score < 20) {
        medalType = 'bronze';
    } else if (score < 30) {
        medalType = 'silver';
    } else {
        medalType = 'gold';
    }

    // Append the corresponding medal image
    elemmedal.append("<img src='assets/medal_" + medalType + ".png' alt='" + medalType + " medal'>");
}

function playerDead() {
    soundHit.stop();
    soundHit.play();

    // Stop the game loop and the pipe loop
    clearInterval(loopGameloop);
    clearInterval(loopPipeloop);

    // Change the state to ScoreScreen
    currentstate = states.ScoreScreen;

    // Fade out the player and show score
    $("#player").stop();
    $("#player").transition({ opacity: 0 }, 500, 'ease');

    // Display final score
    setSmallScore();
    setHighScore();

    // Check if we need to update the high score
    if (score > highscore) {
        highscore = score;
        setCookie("highscore", highscore, 30); // Save new high score
    }

    // Set the big score to the final score
    setBigScore();
    setMedal();

    // Show the score screen
    $("#score").transition({ opacity: 1 }, 1000, 'ease');
}

function playerScore() {
    score++;
    soundScore.stop();
    soundScore.play();
    setSmallScore();
}

function updatePipes() {
    // Create a new pipe
    var newPipe = $("<div class='pipe'></div>");
    var upperPipe = $("<div class='pipe_upper'></div>");
    var lowerPipe = $("<div class='pipe_lower'></div>");

    // Randomize the height of the upper pipe and set the height of the lower pipe
    var upperPipeHeight = Math.floor(Math.random() * (flyArea - pipeheight - 100)) + 20; // ensure there is always some space
    upperPipe.css({ height: upperPipeHeight });
    lowerPipe.css({ height: flyArea - upperPipeHeight - pipeheight });

    // Append pipes to the new pipe
    newPipe.append(upperPipe).append(lowerPipe);
    newPipe.css({ left: $(window).width() });

    // Add the new pipe to the game
    $("#flyarea").append(newPipe);
    pipes.push(newPipe);

    // Animate the pipe moving left across the screen
    newPipe.transition({ left: -pipewidth }, 5000, 'linear', function() {
        $(this).remove(); // Remove pipe once it goes off-screen
    });
}

$(document).on("click", "#replay", function() {
    if (replayclickable) {
        replayclickable = false;

        // Fade out the score screen
        $("#score").stop();
        $("#score").transition({ opacity: 0 }, 500, 'ease', function() {
            $(this).hide();
            showSplash();
        });
    }
});

// Make sure to disable replay click when the score is not shown
$("#score").on("transitionend", function() {
    replayclickable = true;
});
