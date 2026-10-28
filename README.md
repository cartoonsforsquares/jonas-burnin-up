# Burnin' Up

Inspired by the Jonas Brothers song Burnin' Up, I made a silly goofy game. The stage is a lake of pizza lava, and Nick, Joe, and Kevin are dancing on stage gear floating in it. Everything slowly melts. Use the pinching hand to grab whoever is sinking and drop him on something that's still floating, before the band goes under.

**Play:** https://cartoonsforsquares.github.io/jonas-burnin-up/

## How to play

- Move your finger (or mouse) to steer the hand
- Tap to reach down and grab a brother
- Tap again to let go and drop him on a floating object
- It gets faster every 5 saves. Lose all three brothers and it's game over

## How it's made

- Built with [p5.js](https://p5js.org/) 1.11.13
- `sketch.js` is the game; every tuning number (melt speed, sink time, sizes) is at the top
- `hud.js` is the headline, prompts, and speed-ups, shared with my other p5.js games
- Collage art: photo heads on illustrated cut-out bodies, with each brother's dance made from 3 or 4 frames

Unofficial fan project, made for fun. Not affiliated with the Jonas Brothers.

## Running locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000
