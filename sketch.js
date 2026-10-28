
//Burnin' Up (version 3)
//The floor is a lake of pizza lava, and the whole pizza is the stage. Nick, Joe, and Kevin stand on
//objects floating at different depths. Objects fall from the sky and float; they slowly melt, and
//when one melts away, that brother starts sinking. Pinch him with the hand before his head goes
//under, and drop him onto something that is still floating.

// ---------- Settings ----------

const LEVEL_EVERY   = 5;     //game speeds up every 5 saves (saves come slower than catches, see hud.js)
const LEVEL_SPEEDUP = 0.25;  //each speed-up makes the game 25% faster
const MAX_CHAOS     = 3.5;   //fastest the game gets: 3.5x the starting speed
const MELT_TIME     = 19000; //ms for an object to melt away completely, at normal speed
const EMPTY_MELT    = 0.3;   //empty objects melt at 30% speed, so a fresh one is a safe place to land
const SINK_TIME     = 4500;  //ms from a brother starting to sink until his head goes under, at normal speed
const DANGER        = 0.55;  //once his object is this melted (0 to 1), his face shakes on the score bar
const SPAWN_EVERY   = 4000;  //ms between new objects falling from the sky, at normal speed
const MAX_FREE      = 2;     //most empty objects on stage at once
const LANES         = [0.08, 0.45, 0.85]; //depths new objects land at: back, middle, front
const EIGHTH_MS     = 260;   //one eighth note at about 115 BPM; every dance loop is one bar (8 eighths)

// ---------- The band ----------
//Each brother's frames are 3000x3000 (see ../Exports), shrunk to 800x800 in assets/band.
//All the numbers below are in the original 3000x3000 frame pixels.
//  dance:   the loop, one bar long. Each step is a frame number and how many eighth notes it lasts.
//  floor:   where his feet touch the ground
//  head:    the top of his head on each frame, where the hand pinches him
//  held / falling: the frame shown while he is held or falling
//  sinking: frames he flails between while sinking (arms up, reaching for help)

const BAND = [
  {
    name: 'Nick', count: 3,
    //Sings on the left, then the center, then the right
    dance: [{ frame: 1, eighths: 3 }, { frame: 2, eighths: 2 }, { frame: 3, eighths: 3 }],
    floor: 2865,
    head: [[1300, 280], [1470, 170], [1675, 280]],
    held: 2, falling: 2, sinking: [1, 3]
  },
  {
    name: 'Joe', count: 3,
    //Sings into the mic, then raises it for the audience
    dance: [{ frame: 1, eighths: 1 }, { frame: 2, eighths: 1 }, { frame: 1, eighths: 1 }, { frame: 2, eighths: 1 }, { frame: 3, eighths: 4 }],
    floor: 2810,
    head: [[1830, 160], [1830, 180], [1680, 110]],
    held: 3, falling: 3, sinking: [3, 1]
  },
  {
    name: 'Kevin', count: 4,
    //Cheers with the audience, then jams on his guitar
    dance: [{ frame: 1, eighths: 1 }, { frame: 2, eighths: 1 }, { frame: 1, eighths: 1 }, { frame: 2, eighths: 1 },
            { frame: 3, eighths: 1 }, { frame: 4, eighths: 1 }, { frame: 3, eighths: 1 }, { frame: 4, eighths: 1 }],
    floor: 2775,
    head: [[1570, 120], [1570, 120], [1710, 160], [1730, 180]],
    held: 1, falling: 2, sinking: [1, 2]
  }
];

//Objects that fall from the sky and float on the lava (your PNGs, in assets/objects).
//  w:       width, as a fraction of a brother's height, balanced so everything fits on a phone screen
//  float:   how much of the object sits under the lava when it floats (tall speakers float lower)
//  surface: where a brother stands, as a fraction of the object's height from its top
//           (measured from the art: tilted pieces like the truss are stood on at their middle)
const OBJECT_TYPES = [
  { name: 'speaker-1', w: 0.42, float: 0.45, surface: 0.01 },
  { name: 'speaker-2', w: 0.42, float: 0.45, surface: 0.00 },
  { name: 'speaker-3', w: 0.42, float: 0.45, surface: 0.00 },
  { name: 'stool',     w: 0.62, float: 0.25, surface: 0.01 },
  { name: 'table',     w: 0.78, float: 0.15, surface: 0.02 },
  { name: 'truss',     w: 0.85, float: 0.25, surface: 0.36 },
  { name: 'wood-1',    w: 0.82, float: 0.30, surface: 0.30 },
  { name: 'wood-2',    w: 0.80, float: 0.30, surface: 0.23 }
];
const FALL_GRAVITY = 0.6; //how fast new objects speed up as they fall

//Colors from the design reference
const STAGE_RED = '#C8152D';

//Headline look for this game (see hud.js): KC Bubble Shack, yellow, all caps, outlined, with a 3D shadow
const HEADLINE_STYLE = {
  font: 'KCBubbleShack',
  fill: '#F1D62E',
  outline: '#281F1C',
  caps: true,
  outlineWeight: 0.08, //outline thickness, as a fraction of the text size
  depth: 0.1,          //3D shadow depth, as a fraction of the text size
  shadowSide: -1,      //the 3D shadow falls down and to the left
  scoreFill: '#F1D62E', //score and help text color
  panel: 'rgba(40, 31, 28, 0.85)', //dark panel behind prompts and the score, so they read on the pizza
  unsupported: '!?-&', //this font has no shapes for these (it shows a "KERN CLUB" placeholder), so they are left out
  headlineScale: 1.15, //headline a bit bigger than the other games
  edgeScale: 0.55,     //with narrower side margins, so the bigger headline still fits on a phone
  panelText: '#281F1C' //dark help text on the torn paper (panelImage is loaded in preload)
};

//No instructions under "Tap to play": players figure it out
const START_HINT = [];
//Shown under "Retry?"
function RETRY_HINT() { return [`You saved them ${score} ${score === 1 ? 'time' : 'times'}`]; }
//"Tap to play" and "Retry" sit in the middle of the screen (the game is paused, so covering the band is fine).
//The speed-up banner sits up in the red during play, so it never covers the action.
function PROMPT_Y() {
  if (started && !gameOver) return (hudLayout().headBottom + groundY(0) - figureHeight() * 0.8) / 2;
  return height / 2;
}
document.fonts.load('40px KCBubbleShack');

// ---------- Game state ----------

let frames = {};    //each brother's frames, by name
let scoreFont, lavaImg, handImg;
let faces = {};     //each brother's scoreboard face: { normal, lost }
let brothers = [];  //{ ...BAND entry, x, feetY, depth, scale, state, on, vy, rescue }
let objects = [];   //{ type, x, depth, melt, state, y, vy, seed, landedAt }
let hand;           //{ x, y, state, holding, swing }
let scorePaper;     //torn paper behind the score
let score = 0;      //saves
let lostCount = 0;
let gameOver = false;
let isMobile = false; //true on touch devices (phones/tablets); detected once in setup()
let nextSpawnAt = 0;

function preload() {
  for (const b of BAND) {
    frames[b.name] = [];
    for (let i = 1; i <= b.count; i++) frames[b.name].push(loadImage(`assets/band/${b.name.toLowerCase()}-${i}.webp`));
    const n = b.name.toLowerCase();
    faces[b.name] = { normal: loadImage(`assets/faces/${n}.webp`), lost: loadImage(`assets/faces/${n}-lost.webp`) };
  }
  for (const t of OBJECT_TYPES) t.img = loadImage(`assets/objects/${t.name}.webp`);
  scorePaper = loadImage('assets/ui/score-paper-wide.webp');
  HEADLINE_STYLE.panelImage = loadImage('assets/ui/retry-paper.webp'); //torn paper behind prompts (see hud.js)
  scoreFont = loadFont('assets/GeistMono-Bold.ttf');
  lavaImg = loadImage('assets/lava.webp');
  handImg = loadImage('assets/hand.webp');
}

function setup() {
  isMobile = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity());
  noCursor(); //the hand replaces the system cursor

  //Stop the page from scrolling or zooming while the player drags a finger
  const c = document.querySelector('canvas');
  if (c) c.style.touchAction = 'none';

  resetGame(); //so the start screen already shows the band on stage
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------- Sizes and depth, worked out from the screen every frame ----------

//The game is played in a centered column, so on wide screens the hand never has far to travel.
//(The red background and the lava still fill the whole window.)
function playWidth()    { return min(width, height * 0.8); }
function playLeft()     { return (width - playWidth()) / 2; }

function lavaTop()      { return height * 0.54; }                     //the back edge of the pizza
function figureHeight() { return min(height * 0.19, playWidth() * 0.42); } //head top to feet (objects and the hand are sized from this)
function speedScale()   { return height / 844; }                       //so speeds feel the same on any screen
//The hand comes out from a line a little below the headline (never touching the text),
//and waits with its fingertips just below that line
function handEmergeY()  { return hudLayout().headBottom + hudLayout().ts * 0.5; }
function handRestY()    { return handEmergeY() + figureHeight() * 0.3; }

//Depth runs from 0 (the back edge of the pizza) to 1 (the front, just above the score bar).
//Further forward means lower on the screen. Objects also get a little bigger toward the front,
//like looking at a real stage floor; the brothers always stay the same size.
function groundY(depth) { return lerp(lavaTop() + 6, scoreBarTop() - figureHeight() * 0.1, depth); }
function depthScale(depth) { return lerp(0.78, 1.12, depth); }

function objWidth(o)    { return o.type.w * figureHeight() * depthScale(o.depth); }
function objHeight(o)   { return objWidth(o) * o.type.img.height / o.type.img.width; }
//How far the top of a floating object sits above the lava (lower as it melts)
function objAbove(o)    { return objHeight(o) * (1 - o.type.float) * (1 - o.melt); }
//Top of an object: falling from the sky, or floating with a gentle bob and sinking as it melts
function objTop(o) {
  if (o.state === 'falling') return o.y;
  const bob = sin(millis() / 520 + o.seed) * objHeight(o) * 0.015;
  return groundY(o.depth) - objAbove(o) + bob;
}
//Where a brother's feet go when he stands on an object
function objStand(o)    { return objTop(o) + objHeight(o) * o.type.surface; }

// ---------- Main loop ----------

function draw() {
  background(STAGE_RED);
  const dt = min(deltaTime, 50); //ms since the last frame, capped so a hiccup does not teleport things

  if (started && !gameOver) {
    checkLevelUp();
    updateObjects(dt);
    updateHand();
    spawnObjects();
  }
  updateBrothers(dt);

  drawLava();
  drawStage();
  for (const b of brothers) if (b.state === 'falling') drawBrother(b);
  drawHand();

  drawHUD();
  if (!started) drawStartScreen();
  else if (gameOver) drawRetryScreen();
  else drawLevelBanner();
}

function drawHUD() {
  drawHeadline("Help the Jonas Brothers\nbefore they sink in lava");
  drawScoreBar();
  drawSoundCheck(); //only shows with ?soundcheck (see hud.js)
}

//Everything on the pizza, drawn from the back to the front so nearer things overlap further ones.
//Each thing is cut off at its own lava line, so it looks like it is floating in (or sinking into) the lava.
function drawStage() {
  const things = [
    ...objects.map(o => ({ depth: o.depth, order: 0, draw: () => drawObject(o) })),
    ...brothers.filter(b => b.state === 'standing' || b.state === 'sinking')
               .map(b => ({ depth: b.depth, order: 1, draw: () => drawBrother(b) }))
  ];
  things.sort((a, b) => a.depth - b.depth || a.order - b.order);
  for (const t of things) t.draw();
}

// ---------- Score ----------
//A small torn card at the bottom: the three brothers' heads on the left, the saves count on the right.
//A head shakes while that brother is in trouble, and turns gray once he is lost.
//(score-paper-wide.webp is your Score_paper.png made wider and shorter, keeping the stars and torn edges.)

function scorePaperWidth()  { return min(playWidth() * 0.5, hudLayout().ts * 6.4); }
function scoreBarHeight()   { return scorePaperWidth() * scorePaper.height / scorePaper.width; }
function scoreBarTop()      { return height - hudLayout().ts * 0.4 - scoreBarHeight(); }

function drawScoreBar() {
  const w = scorePaperWidth(), h = scoreBarHeight(), top = scoreBarTop(), left = width / 2 - w / 2;
  imageMode(CORNER);
  image(scorePaper, left, top, w, h);

  //Heads in a row on the left of the card (clear of the star in its corner)
  const midY = top + h * 0.42;
  const faceH = h * 0.38, faceGap = faceH * 0.12;
  let x = left + w * 0.17;
  for (const b of brothers) {
    const f = faces[b.name];
    const lost = b.state === 'gone';
    const fw = faceH * f.normal.width / f.normal.height;
    push();
    translate(x + fw / 2, midY);
    if (inTrouble(b)) rotate(sin(millis() / 70) * 0.14); //shake: this one needs saving
    if (lost) tint(255, 140);
    image(lost ? f.lost : f.normal, -fw / 2, -faceH / 2, fw, faceH);
    pop();
    x += fw + faceGap;
  }

  //The saves count on the right, in small dark type
  noStroke(); fill(HEADLINE_STYLE.panelText);
  textFont(scoreFont); textSize(h * 0.13); textAlign(LEFT, CENTER);
  text(`SAVES ${score}`, x + faceGap, midY + 1);
}

// ---------- Floating objects ----------

function updateObjects(dt) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    //Fall from the sky until it splashes down into the lava, then float
    if (o.state === 'falling') {
      o.vy += FALL_GRAVITY * speedScale();
      o.y += o.vy;
      const floatTop = groundY(o.depth) - objAbove(o);
      if (o.y >= floatTop) { o.state = 'floating'; o.landedAt = millis(); }
      continue;
    }
    //The lava melts the objects the brothers stand on, faster as the game speeds up.
    //Empty objects melt slowly, so a fresh one is still a safe place to land.
    const occupied = brothers.some(b => b.on === o && b.state === 'standing');
    o.melt += dt / MELT_TIME * chaos() * (occupied ? 1 : EMPTY_MELT);
    if (o.melt >= 1) {
      //Melted away: whoever was standing on it starts to sink
      for (const b of brothers) if (b.on === o && b.state === 'standing') startSinking(b);
      objects.splice(i, 1);
    }
  }
}

//Good places to land: objects nobody is standing on that are not already half melted
function freeObjects() {
  return objects.filter(o => o.state === 'floating' && o.melt < DANGER && !brothers.some(b => b.on === o && b.state === 'standing'));
}

function spawnObjects() {
  //Make sure there is always somewhere to put a brother down (falling ones are on their way)
  if (freeObjects().length === 0 && !objects.some(o => o.state === 'falling')) nextSpawnAt = min(nextSpawnAt, millis() + 1200);
  if (millis() < nextSpawnAt) return;

  //Only float one up where there is room, unless there is nowhere at all to put a brother down
  const desperate = freeObjects().length === 0;
  if (freeObjects().length < MAX_FREE && spawnObject(desperate)) {
    //New objects come a little less often as the game speeds up
    nextSpawnAt = millis() + SPAWN_EVERY * (1 + 0.3 * (chaos() - 1));
  } else {
    nextSpawnAt = millis() + 500; //no room yet, look again in a moment
  }
}

//Drops a new object from the sky into the emptiest spot of whichever lane has the most room.
//Returns false if there was no room (unless desperate, when it drops one anyway).
function spawnObject(desperate) {
  const type = random(OBJECT_TYPES);
  let best = null;
  for (const depth of LANES) {
    const w = type.w * figureHeight() * depthScale(depth);
    //Stay where the hand can reach (it keeps away from the screen edges, see updateHand)
    const reach = max(w / 2 + 8, handEdge());
    for (let k = 0; k <= 24; k++) {
      const x = lerp(playLeft() + reach, playLeft() + playWidth() - reach, k / 24);
      //Only objects at a similar depth get in the way; further ones are behind or in front
      const nearby = objects.filter(o => abs(o.depth - depth) < 0.2);
      const gap = min(...nearby.map(o => abs(o.x - x) - (objWidth(o) + w) / 2), 9999);
      if (!best || gap > best.gap) best = { depth, x, gap };
    }
  }
  if (best.gap < 4 && !desperate) return false;
  const h = type.w * figureHeight() * depthScale(best.depth) * type.img.height / type.img.width;
  objects.push({ type, x: best.x, depth: best.depth, melt: 0, state: 'falling', y: -h - 20, vy: 0, seed: random(TWO_PI), landedAt: 0 });
  return true;
}

// ---------- Brothers ----------

function updateBrothers(dt) {
  const s = speedScale();
  for (const b of brothers) {
    //The brothers stay the same size at every depth (only the objects change with depth)
    b.scale = 1;

    if (b.state === 'standing') {
      //Stand on the object (sinking with it as it melts) and drift to its middle
      b.feetY = objStand(b.on);
      b.depth = b.on.depth;
      b.x += (b.on.x - b.x) * 0.15;
    } else if (b.state === 'held') {
      //Hang from the hand by the top of his head
      b.x = hand.x;
      b.feetY = hand.y + figureHeight() * b.scale;
    } else if (b.state === 'falling') {
      const before = b.feetY;
      b.vy += 0.7 * s;
      b.feetY += b.vy;
      //Land on the object you aimed for. He has to be over it (one brother per object), and he falls
      //past other objects on the way down if one further below is closer to where the hand let go,
      //or if this one is nearly melted and there is a safe one below.
      const under = o => o.state === 'floating' && abs(b.x - o.x) < objWidth(o) * 0.5 &&
                         !brothers.some(other => other.on === o && other.state === 'standing');
      const below = objects.filter(o => under(o) && objStand(o) > b.feetY);
      const landing = objects.find(o => under(o) && before <= objStand(o) + 2 && b.feetY >= objStand(o) &&
        !below.some(p => p !== o && abs(p.x - b.x) < abs(o.x - b.x)) &&                 //a better-aimed one below
        !(o.melt >= DANGER && below.some(p => p !== o && p.melt < DANGER)));              //a safer one below
      if (landing) {
        b.state = 'standing';
        b.on = landing;
        b.depth = landing.depth;
        b.feetY = objStand(landing);
        if (b.rescue) score++; //a save!
        b.rescue = false;
      } else if (b.feetY >= groundY(1)) {
        //Missed everything: he splashes into the front of the lava and starts sinking (still savable)
        b.depth = 1;
        b.feetY = groundY(1);
        startSinking(b);
      }
    } else if (b.state === 'sinking') {
      //Sink slowly, faster as the game speeds up. Once his head is under, he is lost.
      b.feetY += (figureHeight() * b.scale * 1.05) * dt / (SINK_TIME / sqrt(chaos()));
      if (b.feetY - figureHeight() * b.scale > groundY(b.depth)) goneUnder(b);
    }
  }
}

function startSinking(b) {
  b.state = 'sinking';
  b.on = null;
  b.vy = 0;
}

function goneUnder(b) {
  b.state = 'gone';
  lostCount++;
  if (lostCount >= BAND.length) gameOver = true;
}

//In trouble: sinking, or standing on an object that is more than half melted
function inTrouble(b) {
  return b.state === 'sinking' || (b.state === 'standing' && b.on && b.on.melt > DANGER);
}

//Which frame (1, 2, 3...) a brother shows right now
function currentFrame(b) {
  if (b.state === 'held') return b.held;
  if (b.state === 'falling') return b.falling;
  if (b.state === 'sinking') return b.sinking[floor(millis() / 180) % b.sinking.length]; //flailing
  //Step through his dance loop: one bar, sped up as the game gets faster
  const eighths = millis() / (EIGHTH_MS / (started ? chaos() : 1));
  let t = eighths % 8;
  for (const step of b.dance) {
    if (t < step.eighths) return step.frame;
    t -= step.eighths;
  }
  return b.dance[0].frame;
}

// ---------- The pinching hand ----------
//Press, drag, release: press anywhere and the hand jumps to your finger and reaches down to pinch,
//drag to carry him, and let go to drop him. Works the same with a finger or a mouse.

function updateHand() {
  const s = speedScale();
  const restY = handRestY();

  if (hand.state === 'top') {
    //The hand follows the finger or mouse directly, with no lag
    //(kept away from the edges so whoever it holds stays on screen)
    const before = hand.x;
    hand.x = constrain(mouseX, playLeft() + handEdge(), playLeft() + playWidth() - handEdge());
    hand.y = restY;
    //Whoever it holds swings a little when it moves
    hand.swing += ((before - hand.x) * 0.03 - hand.swing) * 0.1;
  } else if (hand.state === 'down') {
    hand.y += 14 * s;
    //Pinch the first brother whose head the hand reaches (sinking ones too, while the head is still out).
    //If someone in trouble is further down in the same spot, the hand reaches past anyone who is fine.
    const grabbable = b => (b.state === 'standing' || (b.state === 'sinking' && headY(b) < groundY(b.depth))) &&
                           abs(b.x - hand.x) < figureHeight() * b.scale * 0.4;
    const troubleBelow = brothers.some(b => grabbable(b) && inTrouble(b) && headY(b) > hand.y);
    const target = brothers.find(b => grabbable(b) && hand.y >= headY(b) - 4 && (inTrouble(b) || !troubleBelow));
    if (target) {
      //Only a real rescue counts as a save later: he has to be in trouble when picked up
      target.rescue = inTrouble(target);
      target.state = 'held';
      target.on = null;
      hand.holding = target;
      hand.state = 'up';
    } else if (hand.y >= groundY(1) - figureHeight() * 0.2) {
      hand.state = 'up'; //missed, nobody there
    }
  } else if (hand.state === 'up') {
    hand.y -= 10 * s;
    //It carries him sideways with the finger on the way up, too
    hand.x = constrain(mouseX, playLeft() + handEdge(), playLeft() + playWidth() - handEdge());
    if (hand.y <= restY) {
      hand.y = restY; hand.state = 'top';
      //Let go early (before the hand got back up)? Drop him as soon as it is up.
      if (hand.holding && !pointerDown) dropHeld();
    }
  }
}

function headY(b) { return b.feetY - figureHeight() * b.scale; }

let pointerDown = false; //is a finger (or the mouse button) currently down?

//Press: the hand jumps straight to the finger and reaches down to pinch whoever is below
function pressHand() {
  pointerDown = true;
  if (hand.state !== 'top' || hand.holding) return;
  hand.x = constrain(mouseX, playLeft() + handEdge(), playLeft() + playWidth() - handEdge());
  hand.state = 'down';
}

//Release: let go of whoever the hand is holding, right where the finger is
function releaseHand() {
  pointerDown = false;
  if (hand.holding && hand.state === 'top') dropHeld();
}

function dropHeld() {
  const b = hand.holding;
  hand.x = constrain(mouseX, playLeft() + handEdge(), playLeft() + playWidth() - handEdge());
  b.x = hand.x;
  b.state = 'falling';
  b.vy = 0;
  hand.holding = null;
  hand.swing = 0;
}

// ---------- Drawing the band ----------

function drawBrother(b) {
  const held = b.state === 'held';
  const frameNo = currentFrame(b);
  const img = frames[b.name][frameNo - 1];
  const h = figureHeight() * b.scale;
  //Frame size that makes him h tall from the top of his head to his feet
  const [headX, headTop] = b.head[frameNo - 1];
  const size = h / ((b.floor - headTop) / 3000);
  //Held: hang from the top of his head. Otherwise: stand with his feet at feetY.
  const anchorX = held ? headX : 1500;
  const anchorY = held ? headTop : b.floor;
  const px = held ? hand.x : b.x;
  const py = held ? hand.y : b.feetY;

  push();
  //Standing or sinking: cut him off at his lava line, so he looks like he is in the lava
  if (b.state === 'standing' || b.state === 'sinking') clipAboveLava(b.depth);
  translate(px, py);
  if (held) rotate(hand.swing);
  if (b.state === 'sinking') rotate(sin(millis() / 120) * 0.06); //struggling
  imageMode(CORNER);
  image(img, -anchorX / 3000 * size, -anchorY / 3000 * size, size, size);
  pop();
  if (b.state === 'sinking') drawBubbles(b.x, groundY(b.depth), h * 0.5);
}

//Only draws what is above the lava line at this depth. Call it between push() and pop():
//p5's push() saves the canvas state and pop() restores it, which also removes this clip.
function clipAboveLava(depth) {
  const ctx = drawingContext;
  ctx.beginPath();
  ctx.rect(0, 0, width, groundY(depth) + 2);
  ctx.clip();
}

//Bubbles popping in the lava around something sinking
function drawBubbles(x, y, spread) {
  noStroke();
  for (let k = 0; k < 5; k++) {
    const phase = (millis() / 700 + k * 0.23) % 1;
    fill(255, 200, 90, 200 * (1 - phase));
    circle(x + sin(k * 2.1) * spread * 0.6, y - phase * spread * 0.25, 4 + 8 * phase);
  }
}

// ---------- Drawing the objects ----------

function drawObject(o) {
  const w = objWidth(o), h = objHeight(o), top = objTop(o), ground = groundY(o.depth);
  if (o.state === 'floating') {
    //A dark ring in the lava where the object floats, and a splash of bubbles just after it lands
    noStroke();
    fill(70, 15, 0, 70);
    ellipse(o.x, ground, w * 1.1, h * 0.14);
    if (millis() - o.landedAt < 600) drawBubbles(o.x, ground, w * 0.7);
  }
  push();
  if (o.state === 'floating') clipAboveLava(o.depth); //the part under the lava is hidden
  imageMode(CORNER);
  image(o.type.img, o.x - w / 2, top, w, h);
  if (o.state === 'floating') {
    //Glowing where it is melting into the lava, stronger the more it has melted (one smooth gradient)
    const ctx = drawingContext;
    const glow = ctx.createLinearGradient(0, ground - h * 0.36, 0, ground);
    glow.addColorStop(0, 'rgba(242, 84, 27, 0)');
    glow.addColorStop(1, `rgba(242, 84, 27, ${0.65 * o.melt})`);
    ctx.fillStyle = glow;
    ctx.fillRect(o.x - w / 2, ground - h * 0.36, w, h * 0.36);
  }
  pop();
}

// ---------- Lava ----------

//The lava: the pepperoni image with a gently waving back edge, flowing slowly sideways.
//It is shaded darker toward the back, so the pizza reads as a floor going away from you.
//The image was blended at its edges (see assets/lava.webp) so it repeats sideways with no visible seam.
function drawLava() {
  const y0 = lavaTop();
  const t = millis() / 600;
  const ctx = drawingContext;
  ctx.save();
  //Cut out the wavy shape of the lava surface, then paint the image only inside it
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width + 10; x += 10) ctx.lineTo(x, y0 + sin(x * 0.04 + t * 2) * 4 + sin(x * 0.11 - t) * 2);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.clip();

  //Size the image so one copy is taller than the lava; repeat it sideways as it flows
  const tileH = max(height - y0 + 30, playWidth() * 0.9);
  const tileW = tileH * lavaImg.width / lavaImg.height;
  const flow = (millis() * 0.012) % tileW;
  imageMode(CORNER);
  for (let x = -flow; x < width; x += tileW) image(lavaImg, x, y0 - 15, tileW, tileH);

  //Darker toward the back edge, for depth: one smooth gradient (separate strips left faint lines)
  const shade = ctx.createLinearGradient(0, y0 - 10, 0, groundY(0.5));
  shade.addColorStop(0, 'rgba(60, 10, 0, 0.35)');
  shade.addColorStop(1, 'rgba(60, 10, 0, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, y0 - 10, width, groundY(0.5) - y0 + 10);
  ctx.restore();

  //A warm glow just above the back edge, where the lava meets the air (also one smooth gradient)
  const glow = ctx.createLinearGradient(0, y0 - 36, 0, y0);
  glow.addColorStop(0, 'rgba(255, 140, 40, 0)');
  glow.addColorStop(1, 'rgba(255, 140, 40, 0.07)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, y0 - 36, width, 36);
}

// ---------- Drawing the hand ----------
//The pinching hand (assets/hand.webp) hangs from the top of the screen with its fingertips at
//(hand.x, hand.y). The arm is stretched upward past the image so it always reaches the top.

const HAND_PINCH = [64, 727]; //where the fingertips meet, in hand.webp pixels

function handWidth() { return figureHeight() * 0.42; }
//How close to the screen edge the hand can go
function handEdge()  { return figureHeight() * 0.35; }

function drawHand() {
  if (!started) return; //the start screen stays clean; the hand appears once the game begins
  //Whoever the hand holds hangs underneath
  if (hand.holding) drawBrother(hand.holding);

  const s = handWidth() / handImg.width; //image pixels -> screen pixels
  const w = handImg.width * s, h = handImg.height * s;
  push();
  //The arm comes out from a line a little below the headline, so it never touches the text
  drawingContext.beginPath();
  drawingContext.rect(0, handEmergeY(), width, height);
  drawingContext.clip();
  translate(hand.x, hand.y);
  rotate(hand.holding ? hand.swing * 0.5 : 0);
  imageMode(CORNER);
  const left = -HAND_PINCH[0] * s, top = -HAND_PINCH[1] * s;
  //Soft shadow, like the paper pieces
  tint(40, 31, 28, 70);
  image(handImg, left + 5, top + 6, w, h);
  noTint();
  //Arm extension: the top slice of the arm, stretched up to the top of the screen
  if (top > -hand.y) image(handImg, left, -hand.y - 20, w, top + hand.y + 21, 0, 0, handImg.width, 1);
  image(handImg, left, top, w, h);
  pop();
}

// ---------- Input and restarting ----------

let ignoreThisPress = false; //the tap that starts or restarts the game should not also grab

function mousePressed() {
  if (handleStartTap(resetGame)) { ignoreThisPress = true; return; }
  if (gameOver) { resetGame(); ignoreThisPress = true; return; }
  pressHand();
}

function mouseReleased() {
  if (ignoreThisPress) { ignoreThisPress = false; pointerDown = false; return; }
  releaseHand();
}

function touchStarted() {
  //p5 does not run mousePressed once touchStarted exists, so taps are handled here too
  mousePressed();
  //Block the default touch behaviour so the page does not scroll or refresh
  return false;
}

function touchEnded() {
  //Same for lifting the finger
  mouseReleased();
  return false;
}

function touchMoved() {
  //Block the default touch behaviour so dragging does not scroll the page
  return false;
}

//Resets the game back to its starting state (used for the first tap and every retry)
function resetGame() {
  score = 0;
  lostCount = 0;
  gameOver = false;
  resetLevels();
  //Joe at the back in the middle, Nick and Kevin further forward on each side: a triangle, for depth.
  //Each object starts a little melted by a different amount, so they do not all need saving at once.
  const at = f => playLeft() + playWidth() * f;
  const start = (name, x, depth, melt) => ({ type: OBJECT_TYPES.find(t => t.name === name), x, depth, melt,
                                              state: 'floating', y: 0, vy: 0, seed: random(TWO_PI), landedAt: -9999 });
  objects = [start('stool', at(0.2), 0.45, 0.15), start('table', at(0.5), 0.08, 0), start('speaker-1', at(0.8), 0.45, 0.3)];
  brothers = BAND.map((b, i) => ({
    ...b, x: objects[i].x, on: objects[i], depth: objects[i].depth, scale: 1,
    state: 'standing', feetY: 0, vy: 0, rescue: false
  }));
  hand = { x: width / 2, y: handRestY(), state: 'top', holding: null, swing: 0 };
  nextSpawnAt = millis() + SPAWN_EVERY * 0.6;
}
