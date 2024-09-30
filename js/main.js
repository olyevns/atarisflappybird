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

// Sounds
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

// Loops
var loopGameloop;
var loopPipeloop;

$(document).ready(function() {
   if (window.location.search === "?debug") debugmode = true;
   if (window.location.search === "?easy") pipeheight = 200;

   // Get the high score
   var savedscore = getCookie("highscore");
   if (savedscore !== "") highscore = parseInt(savedscore);

   // Start with the splash screen
   showSplash();
});

function getCookie(cname) {
   var name = cname + "=";
   var ca = document.cookie.split(';');
   for (var i = 0; i < ca.length; i++) {
      var c = ca[i].trim();
      if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
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

   // Set the defaults (again)
   velocity = 0;
   position = 180;
   rotation = 0;
   score = 0;

   // Update the player in preparation for the next game
   $("#player").css({ y: 0, x: 0 });
   updatePlayer($("#player"));

   soundSwoosh.stop();
   soundSwoosh.play();

   // Clear out all the pipes if there are any
   $(".pipe").remove();
   pipes = [];

   // Make everything animated again
   $(".animated").css('animation-play-state', 'running');
   $(".animated").css('-webkit-animation-play-state', 'running');

   // Fade in the splash
   $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

function startGame() {
   currentstate = states.GameScreen;

   // Fade out the splash
   $("#splash").stop();
   $("#splash").transition({ opacity: 0 }, 500, 'ease');

   // Update the big score
   setBigScore();

   // Debug mode?
   if (debugmode) {
      // Show the bounding boxes
      $(".boundingbox").show();
   }

   // Start up our loops
   var updaterate = 1000.0 / 60.0; // 60 times a second
   loopGameloop = setInterval(gameloop, updaterate);
   loopPipeloop = setInterval(updatePipes, 1400);

   // Jump from the start!
   playerJump();
}

function updatePlayer(player) {
   // Rotation
   rotation = Math.min((velocity / 10) * 90, 90);

   // Apply rotation and position
   $(player).css({ rotate: rotation, top: position });
}

function gameloop() {
   var player = $("#player");

   // Update the player speed/position
   velocity += gravity;
   position += velocity;

   // Update the player
   updatePlayer(player);

   // Create the bounding box
   var box = document.getElementById('player').getBoundingClientRect();
   var origwidth = 34.0;
   var origheight = 24.0;

   var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
   var boxheight = (origheight + box.height) / 2;
   var boxleft = ((box.width - boxwidth) / 2) + box.left;
   var boxtop = ((box.height - boxheight) / 2) + box.top;
   var boxright = boxleft + boxwidth;
   var boxbottom = boxtop + boxheight;

   // If we're in debug mode, draw the bounding box
   if (debugmode) {
      var boundingbox = $("#playerbox");
      boundingbox.css('left', boxleft);
      boundingbox.css('top', boxtop);
      boundingbox.css('height', boxheight);
      boundingbox.css('width', boxwidth);
   }

   // Did we hit the ground?
   if (box.bottom >= $("#land").offset().top) {
      playerDead();
      return;
   }

   // Have they tried to escape through the ceiling?
   var ceiling = $("#ceiling");
   if (boxtop <= (ceiling.offset().top + ceiling.height())) position = 0;

   // We can't go any further without a pipe
   if (pipes[0] == null) return;

   // Determine the bounding box of the next pipe's inner area
   var nextpipe = pipes[0];
   var nextpipeupper = nextpipe.children(".pipe_upper");

   var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
   var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipe's offset, not the outer pipe's.
   var piperight = pipeleft + pipewidth;
   var pipebottom = pipetop + pipeheight;

   if (debugmode) {
      var boundingbox = $("#pipebox");
      boundingbox.css('left', pipeleft);
      boundingbox.css('top', pipetop);
      boundingbox.css('height', pipeheight);
      boundingbox.css('width', pipewidth);
   }

   // Have we gotten inside the pipe yet?
   if (boxright > pipeleft) {
      // We're within the pipe, have we passed between upper and lower pipes?
      if (boxtop > pipetop && boxbottom < pipebottom) {
         // Yeah! We're within bounds
      } else {
         // No! We touched the pipe
         playerDead();
         return;
      }
   }

   // Have we passed the imminent danger?
   if (boxleft > piperight) {
      // Yes, remove it
      pipes.splice(0, 1);

      // And score a point
      playerScore();
   }
}

// Handle space bar
$(document).keydown(function(e) {
   // Space bar!
   if (e.keyCode == 32) {
      // In ScoreScreen, hitting space should click the "replay" button. Else it's just a regular spacebar hit
      if (currentstate == states.ScoreScreen) $("#replay").click();
      else screenClick();
   }
});

// Handle mouse down OR touch start
if ("ontouchstart" in window) $(document).on("touchstart", screenClick);
else $(document).on("mousedown", screenClick);

function screenClick() {
   if (currentstate == states.GameScreen) {
      playerJump();
   } else if (currentstate == states.SplashScreen) {
      startGame();
   }
}

function playerJump() {
   velocity = jump;
   // Play jump sound
   soundJump.stop();
   soundJump.play();
}

function setBigScore(erase) {
   var elemscore = $("#bigscore");
   elemscore.empty();

   if (erase) return;

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

   if (score < 10) return false; // Signal that no medal has been won

   var medal;
      if (score < 20) medal = "bronze";
   else if (score < 30) medal = "silver";
   else medal = "gold";

   elemmedal.append("<img src='assets/medals/" + medal + ".png' alt='" + medal + "'>");
}

function playerScore() {
   score++;
   soundScore.stop();
   soundScore.play();
   setBigScore();
   setSmallScore();
}

function playerDead() {
   clearInterval(loopGameloop);
   clearInterval(loopPipeloop);
   soundHit.stop();
   soundHit.play();

   // Show the score screen
   currentstate = states.ScoreScreen;
   $(".animated").css('animation-play-state', 'paused');
   $(".animated").css('-webkit-animation-play-state', 'paused');
   $("#splash").transition({ opacity: 0 }, 500, 'ease');

   // Set the high score if needed
   if (score > highscore) {
      highscore = score;
      setCookie("highscore", highscore, 365);
   }

   // Update scores
   setBigScore(true);
   setSmallScore();
   setHighScore();
   setMedal();

   // Show the score screen
   $("#scoreScreen").transition({ opacity: 1 }, 500, 'ease');
   replayclickable = true;
}

$("#replay").click(function() {
   if (!replayclickable) return;

   replayclickable = false;
   $("#scoreScreen").transition({ opacity: 0 }, 500, 'ease', function() {
      startGame();
   });
});

function updatePipes() {
   var pipe = $("<div class='pipe' />");

   // Upper pipe
   var upperpipe = $("<div class='pipe_upper' />");
   var gap = 120; // space between pipes
   var randomHeight = Math.floor(Math.random() * (flyArea - gap - pipeheight - 40)) + 40; // random height for upper pipe
   upperpipe.height(randomHeight);
   pipe.append(upperpipe);
   
   // Lower pipe
   var lowerpipe = $("<div class='pipe_lower' />");
   lowerpipe.height(flyArea - randomHeight - gap);
   pipe.append(lowerpipe);

   // Append pipes
   $("#flyarea").append(pipe);
   pipes.push(pipe);

   // Position pipes
   pipe.css({
      left: $("#flyarea").width(),
      bottom: 0
   });

   // Animate pipes
   pipe.transition({ left: -pipewidth }, 5000, 'linear', function() {
      pipe.remove();
   });
}
