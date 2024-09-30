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
   if (window.location.search == "?debug")
      debugmode = true;
   if (window.location.search == "?easy")
      pipeheight = 200;

   // Get the high score
   var savedscore = getCookie("highscore");
   if (savedscore != "")
      highscore = parseInt(savedscore);

   // Start with the splash screen
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

   // Set the defaults (again)
   velocity = 0;
   position = 180;
   rotation = 0;
   score = 0;

   // Update the player in preparation for the next game
   $("#player").css({ top: 180, left: 50 });
   updatePlayer($("#player"));

   soundSwoosh.stop();
   soundSwoosh.play();

   // Clear out all the pipes if there are any
   $(".pipe").remove();
   pipes = [];

   // Make everything animated again
   $(".animated").css('animation-play-state', 'running');

   // Fade in the splash
   $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

function startGame() {
   currentstate = states.GameScreen;

   // Fade out the splash
   $("#splash").stop();
   $("#splash").transition({ opacity: 0 }, 500, 'ease');

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
   $(player).css({ transform: `rotate(${rotation}deg)`, top: position });
}

function gameloop() {
   var player = $("#player");

   // Update the player speed/position
   velocity += gravity;
   position += velocity;

   // Update the player
   updatePlayer(player);

   // Check for collisions (implement collision detection here)
   if (checkCollisions(player)) {
      playerDead();
      return;
   }

   // Score and update the pipes
   updateScoreAndPipes();
}

function checkCollisions(player) {
   // Placeholder for collision detection logic
   return false; // Change this logic based on actual collision checks
}

function playerJump() {
   velocity = jump;
   soundJump.stop();
   soundJump.play();
}

// Add other game functions below...
// (Similar to the existing JS code you provided earlier)
