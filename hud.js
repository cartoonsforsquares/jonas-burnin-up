
//Shared look and difficulty for every game (headline, scoreboard, retry screen, speed-ups)
//This exact file is copied into each game, so copy any change here to the other games too
//Each game's sketch.js provides: isMobile, score, scoreFont, LEVEL_EVERY, LEVEL_SPEEDUP, and MAX_CHAOS

//Colors taken from the Ms.Williams Shadow font's own palette
const CREAM       = '#FBF5E6';
const FONT_PINK   = '#F49AC1';
const FONT_SHADOW = '#2B2727';

//Ms.Williams Shadow is a color font, so it is loaded with CSS (see css/style.css) instead of
//loadFont(), which would flatten it to one color. p5 can still use it by its CSS name.
const HEADLINE_FONT = 'MsWilliamsShadow';
document.fonts.load(`40px ${HEADLINE_FONT}`);

//A game can give its headlines its own look by defining HEADLINE_STYLE in its sketch.js:
//  { font, fill, outline, caps, outlineWeight, depth, shadowSide, scoreFill, panel, unsupported,
//    headlineScale, edgeScale, panelImage, panelText }
//(headlineScale: makes the headline bigger, e.g. 1.15; edgeScale: shrinks the headline's side margins, e.g. 0.5;
// panelImage: a picture drawn behind prompts instead of the panel color; panelText: help-line color on it)
//(unsupported: characters the font cannot draw, which are left out, e.g. "!?")
//The font is drawn with a solid fill, an outline, and a stacked 3D shadow (see styledText).
//Without HEADLINE_STYLE, headlines use Ms.Williams Shadow, like the Hayley Williams games.
function headlineStyle() {
  return typeof HEADLINE_STYLE !== 'undefined' ? HEADLINE_STYLE : null;
}

//Sets up the headline font at a size and returns the text as it will be drawn (capitals if the style asks)
function useHeadlineFont(words, size) {
  const st = headlineStyle();
  textFont(st ? st.font : HEADLINE_FONT);
  textSize(size);
  let t = st && st.caps ? words.toUpperCase() : words;
  if (st && st.unsupported) for (const ch of st.unsupported) t = t.split(ch).join('');
  return t.trim();
}

//Width of headline-style text, including the room the outline and 3D shadow take up
function styledWidth(words, size) {
  const st = headlineStyle();
  const lines = useHeadlineFont(words, size).split('\n');
  const extra = st ? size * (st.depth + st.outlineWeight) : 0;
  return max(lines.map(line => textWidth(line))) + extra;
}

//Draws headline-style text at (x, y) using the current textAlign
function styledText(words, x, y, size) {
  const st = headlineStyle();
  const t = useHeadlineFont(words, size);
  if (!st) {
    //Ms.Williams Shadow already has its outline and shadow built into the font
    noStroke(); fill(FONT_PINK);
    text(t, x, y);
    return;
  }
  const depth = max(2, size * st.depth);
  strokeJoin(ROUND);
  stroke(st.outline); strokeWeight(max(2, size * st.outlineWeight));
  //3D shadow: copies stacked down and to one side, one pixel apart
  //(st.shadowSide: -1 = falls to the left, 1 = falls to the right)
  const side = st.shadowSide || 1;
  fill(st.outline);
  for (let i = depth; i >= 1; i--) text(t, x + i * side, y + i);
  //The front: filled color with an outline
  fill(st.fill);
  text(t, x, y);
  noStroke();
}

//The longest headline line across all the games. Every game sizes its headline to fit this line,
//so headlines are the same size (and line up) in every game. Update it if a new game has a longer line.
const LONGEST_HEADLINE_LINE = "the disappearing man!";

//Every LEVEL_EVERY points the game gets LEVEL_SPEEDUP faster, until it reaches MAX_CHAOS
//(each game sets these three in its own sketch.js, so some games can ramp up harder than others)
const LEVEL_BANNER_MS = 1200; //how long the "Faster!" banner stays on screen

let lastChaos = 1;
let levelBannerUntil = 0;

//Text size and positions, worked out from the screen size so every game lines up the same way
function hudLayout() {
  //Bigger on mobile since phones are viewed from closer up
  const ts = isMobile ? constrain(width * 0.075, 26, 46) : constrain(width * 0.045, 16, 35);
  //Space between the text and the edge of the screen (the scoreboard sits a little closer)
  const edge = ts * 1.5;
  const scoreEdge = ts * 1.0;
  //Scoreboard text is smaller than the headline
  const scoreSize = ts * 0.7;
  const st = headlineStyle();
  const headScale = st && st.headlineScale ? st.headlineScale : 1;
  return {
    ts,
    edge,
    scoreSize,
    headTop:     edge,
    headBottom:  edge + ts * headScale * 1.25 * 2,        //headline is two lines tall
    scoreBottom: height - scoreEdge,
    scoreTop:    height - scoreEdge - scoreSize * 1.25
  };
}

function drawHeadline(words) {
  const hud = hudLayout();
  push();
  textAlign(CENTER, TOP);
  //Shrink the headline so the longest line of any game never sits closer to the sides than
  //to the top. Every game measures the same longest line, so all headlines end up the same size.
  const st = headlineStyle();
  const base = hud.ts * (st && st.headlineScale ? st.headlineScale : 1);
  const widest = max(styledWidth(LONGEST_HEADLINE_LINE, base), styledWidth(words, base));
  const room = width - hud.edge * 2 * (st && st.edgeScale ? st.edgeScale : 1);
  const size = widest > room ? base * room / widest : base;
  styledText(words, width / 2, hud.headTop, size);
  pop();
}

function drawScoreboard(words) {
  const hud = hudLayout();
  push();
  textFont(scoreFont); textSize(hud.scoreSize); textAlign(CENTER, BOTTOM);
  //A game's HEADLINE_STYLE can give the scoreboard its own color, outlined so it reads on busy backgrounds
  const st = headlineStyle();
  if (st && st.scoreFill) {
    stroke(st.outline); strokeWeight(max(3, hud.scoreSize * 0.22)); strokeJoin(ROUND); fill(st.scoreFill);
  } else {
    noStroke(); fill('black');
  }
  text(words.toUpperCase(), width / 2, hud.scoreBottom);
  pop();
  drawSoundCheck();
}

//Each game waits on a "Tap to play" screen first. Browsers keep sound off until the player taps
//or clicks, so this first tap is what turns the sound on (moving the mouse does not count).
let started = false;

function drawStartScreen() {
  //A game can add a few short lines explaining how to play, as START_HINT in its sketch.js
  drawPrompt(isMobile ? "Tap to play" : "Click to play", 1.7, typeof START_HINT !== 'undefined' ? START_HINT : [], true);
}

//Where "Tap to play", "Retry?", and the speed-up banner go. A game can set PROMPT_Y() in its sketch.js.
function promptY() {
  return typeof PROMPT_Y === 'function' ? PROMPT_Y() : height / 2;
}

//A big headline-style prompt with optional small lines under it, centered on promptY().
//If the game's HEADLINE_STYLE has a panel color, a rounded panel sits behind it so it reads on busy backgrounds.
//fixed: use the same panel size every time (so "Tap to play" and "Retry" match), with room for two lines.
function drawPrompt(words, sizeInLines, lines, fixed) {
  const hud = hudLayout();
  const room = width - hud.edge * 2;
  const w = styledWidth(words, hud.ts * sizeInLines);
  const size = w > room ? hud.ts * sizeInLines * room / w : hud.ts * sizeInLines;
  //Help lines shrink if needed so the longest one fits inside the panel
  textFont(scoreFont); textSize(hud.scoreSize * 0.85);
  const longest = max(0, ...lines.map(l => textWidth(l.toUpperCase())));
  const small = longest > room - hud.ts * 1.6 ? hud.scoreSize * 0.85 * (room - hud.ts * 1.6) / longest : hud.scoreSize * 0.85;
  const lineGap = small * 1.45;
  const textH = size * 1.05 + lines.length * lineGap;
  const blockH = fixed ? size * 1.05 + 2 * lineGap : textH;
  const top = promptY() - blockH / 2;
  const textTop = top + (blockH - textH) / 2; //text sits in the middle of the panel
  push();
  const st = headlineStyle();
  if (st && (st.panel || st.panelImage)) {
    const pw = fixed ? min(width - hud.edge, hud.ts * 11.5)
                     : min(width - hud.edge, max(styledWidth(words, size), ...lines.map(l => { textFont(scoreFont); textSize(small); return textWidth(l.toUpperCase()); })) + hud.ts * 1.6);
    if (st.panelImage) {
      //A picture (like torn paper) stretched a little past the text on every side
      imageMode(CORNER);
      image(st.panelImage, width / 2 - pw / 2 - hud.ts * 0.4, top - hud.ts * 0.9, pw + hud.ts * 0.8, blockH + hud.ts * 1.8);
    } else {
      noStroke(); fill(st.panel);
      rect(width / 2 - pw / 2, top - hud.ts * 0.6, pw, blockH + hud.ts * 1.2, hud.ts * 0.6);
    }
  }
  textAlign(CENTER, TOP);
  styledText(words, width / 2, textTop, size);
  textFont(scoreFont); textSize(small); noStroke();
  fill(st && st.panelImage && st.panelText ? st.panelText : st && st.scoreFill ? st.scoreFill : FONT_SHADOW);
  lines.forEach((line, i) => text(line.toUpperCase(), width / 2, textTop + size * 1.05 + i * lineGap + small * 0.2));
  pop();
}

//Call at the top of each game's tap/click handler. On the very first tap it starts the game
//(running onStart to reset the timers) and returns true, so that tap does nothing else.
function handleStartTap(onStart) {
  if (started) return false;
  started = true;
  unlockSound();
  onStart();
  return true;
}

//Sound effects use the browser's Web Audio API directly, so no extra sound library is needed
const soundContext = new (window.AudioContext || window.webkitAudioContext)();

//On iPhones, web game sound is muted when the phone is on silent. "playback" lets these sounds
//play anyway (Safari 16.4 and newer), like a video would. It may pause music from other apps.
if (navigator.audioSession) navigator.audioSession.type = 'playback';

//Counts shown by the sound check (add ?soundcheck to the game's link to see them)
const soundCheck = { files: 0, loaded: 0, played: 0, error: '' };

function unlockSound() {
  if (soundContext.state !== 'running') soundContext.resume().catch(() => {});
  //Older iPhones also need a sound to be started during the tap itself, so play a silent one
  const silence = soundContext.createBufferSource();
  silence.buffer = soundContext.createBuffer(1, 1, 22050);
  silence.connect(soundContext.destination);
  silence.start(0);
}
//Any tap, click, or key press unlocks sound, even before the game's own handlers run.
//iPhone Safari only allows it when the finger lifts (touchend), so every kind of tap is covered.
for (const type of ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'click', 'keydown']) {
  window.addEventListener(type, unlockSound, { capture: true, passive: true });
}

//Starts loading a sound file and returns an object that holds it once it is ready
function loadSoundEffect(path) {
  const sound = { buffer: null };
  soundCheck.files++;
  fetch(path)
    .then(response => response.arrayBuffer())
    //Older Safari only supports the callback form of decodeAudioData, so it is wrapped here
    .then(data => new Promise((resolve, reject) => soundContext.decodeAudioData(data, resolve, reject)))
    .then(buffer => { sound.buffer = buffer; soundCheck.loaded++; })
    .catch(err => { soundCheck.error = String(err && err.message || err); }); //a missing sound should never stop the game
  return sound;
}

//Plays a sound once. rate changes the pitch slightly (1 = normal) so repeats do not sound robotic.
function playSoundEffect(sound, volume = 1, rate = 1) {
  if (!sound.buffer) return;
  if (soundContext.state !== 'running') {
    soundContext.resume().catch(() => {});
    return;
  }
  const source = soundContext.createBufferSource();
  source.buffer = sound.buffer;
  source.playbackRate.value = rate;
  const gain = soundContext.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(soundContext.destination);
  source.start(0);
  soundCheck.played++;
}

//Small status line for testing sound on a phone. Only shows when the link ends in ?soundcheck
function drawSoundCheck() {
  if (!location.search.includes('soundcheck')) return;
  const session = navigator.audioSession ? navigator.audioSession.type : 'n/a';
  push();
  textFont('monospace'); noStroke(); fill('black'); textSize(12); textAlign(LEFT, TOP);
  text(`sound: ${soundContext.state}  loaded: ${soundCheck.loaded}/${soundCheck.files}  played: ${soundCheck.played}\n` +
       `session: ${session}  ${soundCheck.error}`, 8, 8);
  pop();
}

//Shown once the player has missed too many. Click or tap anywhere to retry.
function drawRetryScreen() {
  //A game can add lines under "Retry?" (like the final score) with RETRY_HINT() in its sketch.js
  drawPrompt("Retry?", 1.7, typeof RETRY_HINT === 'function' ? RETRY_HINT() : [], true);
}

//Level 0 for the first LEVEL_EVERY points, level 1 for the next, and so on
function level() {
  return floor(score / LEVEL_EVERY);
}

//How much faster the game is than at the start: 1 = normal speed, MAX_CHAOS = fastest
function chaos() {
  return min(1 + level() * LEVEL_SPEEDUP, MAX_CHAOS);
}

//Call once per frame; starts the banner whenever the game gets faster
function checkLevelUp() {
  if (chaos() > lastChaos) levelBannerUntil = millis() + LEVEL_BANNER_MS;
  lastChaos = chaos();
}

function drawLevelBanner() {
  if (millis() > levelBannerUntil) return;
  drawPrompt(chaos() >= MAX_CHAOS ? "Max chaos!" : "Faster!", 1.6, []);
}

//Call from each game's retry so the next round starts at normal speed
function resetLevels() {
  lastChaos = 1;
  levelBannerUntil = 0;
}
