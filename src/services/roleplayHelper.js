/**
 * @file roleplayHelper.js
 * @developer cashholy (carti)
 */

// hope — roleplay engine. GIFs come from https://github.com/itsfizys/gifcdn
// (70 categories). Every action is one row in `roleplayActions`; the hybrid
// command, the prefix aliases and the "Back" buttons all read from it.

/* global AbortSignal */
const {
  ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

const CDN = 'https://raw.githubusercontent.com/itsfizys/gifcdn/main';

// count = number of GIFs in the repo folder (refreshed from index.json at runtime).
// target / solo use {a} = author, {t} = target. back = label of the reply button.
const roleplayActions = {
  airkiss: { count: 6, target: "{a} blows an air kiss to {t}", solo: "{a} blows an air kiss", back: "Blow One Back" },
  angrystare: { count: 32, target: "{a} stares angrily at {t}", solo: "{a} is staring angrily", back: "Stare Back" },
  bite: { count: 20, target: "{a} bites {t}", solo: "{a} bites the air", back: "Bite Back" },
  bleh: { count: 7, target: "{a} sticks their tongue out at {t}", solo: "{a} sticks their tongue out", back: "Bleh Back" },
  blush: { count: 41, target: "{a} blushes around {t}", solo: "{a} is blushing" },
  brofist: { count: 9, target: "{a} gives {t} a brofist", solo: "{a} throws a brofist", back: "Brofist Back" },
  celebrate: { count: 7, target: "{a} celebrates with {t}", solo: "{a} is celebrating", back: "Celebrate Too" },
  cheers: { count: 6, target: "{a} clinks glasses with {t}", solo: "{a} raises a glass", back: "Cheers Back" },
  clap: { count: 8, target: "{a} claps for {t}", solo: "{a} is clapping" },
  confused: { count: 8, target: "{a} is confused by {t}", solo: "{a} is confused" },
  cool: { count: 4, target: "{a} looks cool in front of {t}", solo: "{a} is feeling cool" },
  cry: { count: 46, target: "{a} cries on {t}'s shoulder", solo: "{a} is crying" },
  cuddle: { count: 29, target: "{a} cuddles {t}", solo: "{a} wants a cuddle", back: "Cuddle Back" },
  dance: { count: 33, target: "{a} dances with {t}", solo: "{a} is dancing", back: "Dance Too" },
  drool: { count: 12, target: "{a} drools over {t}", solo: "{a} is drooling" },
  evillaugh: { count: 10, target: "{a} laughs evilly at {t}", solo: "{a} laughs evilly" },
  facepalm: { count: 5, target: "{a} facepalms at {t}", solo: "{a} facepalms" },
  handhold: { count: 10, target: "{a} holds {t}'s hand", solo: "{a} wants to hold hands", back: "Hold Back" },
  happy: { count: 15, target: "{a} is happy with {t}", solo: "{a} is happy" },
  headbang: { count: 8, target: "{a} headbangs with {t}", solo: "{a} is headbanging", back: "Headbang Too" },
  hug: { count: 40, target: "{a} hugs {t}", solo: "{a} wants a hug", back: "Hug Back" },
  huh: { count: 6, target: "{a} is puzzled by {t}", solo: "{a} says huh?" },
  kiss: { count: 36, target: "{a} kisses {t}", solo: "{a} blows a kiss", back: "Kiss Back" },
  laugh: { count: 17, target: "{a} laughs at {t}", solo: "{a} is laughing" },
  lick: { count: 14, target: "{a} licks {t}", solo: "{a} licks the air", back: "Lick Back" },
  love: { count: 9, target: "{a} shows love to {t}", solo: "{a} is feeling the love", back: "Love Back" },
  mad: { count: 25, target: "{a} is mad at {t}", solo: "{a} is mad" },
  nervous: { count: 18, target: "{a} is nervous around {t}", solo: "{a} is nervous" },
  no: { count: 8, target: "{a} says no to {t}", solo: "{a} says no" },
  nom: { count: 46, target: "{a} nibbles on {t}", solo: "{a} goes nom nom", back: "Nom Back" },
  nosebleed: { count: 5, target: "{a} gets a nosebleed because of {t}", solo: "{a} has a nosebleed" },
  nuzzle: { count: 10, target: "{a} nuzzles {t}", solo: "{a} wants to nuzzle", back: "Nuzzle Back" },
  nyah: { count: 8, target: "{a} goes nyah at {t}", solo: "{a} goes nyah" },
  pat: { count: 27, target: "{a} pats {t}", solo: "{a} wants a pat", back: "Pat Back" },
  peek: { count: 6, target: "{a} peeks at {t}", solo: "{a} is peeking" },
  pinch: { count: 11, target: "{a} pinches {t}", solo: "{a} pinches the air", back: "Pinch Back" },
  poke: { count: 17, target: "{a} pokes {t}", solo: "{a} pokes the air", back: "Poke Back" },
  pout: { count: 29, target: "{a} pouts at {t}", solo: "{a} is pouting" },
  punch: { count: 15, target: "{a} punches {t}", solo: "{a} throws a punch", back: "Punch Back" },
  roll: { count: 7, target: "{a} rolls around near {t}", solo: "{a} is rolling around" },
  run: { count: 26, target: "{a} runs away from {t}", solo: "{a} is running" },
  sad: { count: 5, target: "{a} is sad because of {t}", solo: "{a} is sad" },
  scared: { count: 43, target: "{a} is scared of {t}", solo: "{a} is scared" },
  shout: { count: 9, target: "{a} shouts at {t}", solo: "{a} is shouting" },
  shrug: { count: 3, target: "{a} shrugs at {t}", solo: "{a} shrugs" },
  shy: { count: 17, target: "{a} is shy around {t}", solo: "{a} is feeling shy" },
  sigh: { count: 8, target: "{a} sighs at {t}", solo: "{a} sighs" },
  sing: { count: 19, target: "{a} sings to {t}", solo: "{a} is singing" },
  sip: { count: 12, target: "{a} sips tea with {t}", solo: "{a} sips their drink" },
  slap: { count: 25, target: "{a} slaps {t}", solo: "{a} slaps the air", back: "Slap Back" },
  sleep: { count: 34, target: "{a} sleeps next to {t}", solo: "{a} is sleeping" },
  slowclap: { count: 3, target: "{a} slow claps for {t}", solo: "{a} slow claps" },
  smack: { count: 18, target: "{a} smacks {t}", solo: "{a} smacks the air", back: "Smack Back" },
  smile: { count: 20, target: "{a} smiles at {t}", solo: "{a} is smiling" },
  smug: { count: 21, target: "{a} gives {t} a smug look", solo: "{a} looks smug" },
  sneeze: { count: 4, target: "{a} sneezes on {t}", solo: "{a} sneezes" },
  sorry: { count: 4, target: "{a} apologizes to {t}", solo: "{a} is sorry" },
  stare: { count: 20, target: "{a} stares at {t}", solo: "{a} is staring", back: "Stare Back" },
  stop: { count: 9, target: "{a} tells {t} to stop", solo: "{a} says stop" },
  surprised: { count: 19, target: "{a} is surprised by {t}", solo: "{a} is surprised" },
  sweat: { count: 4, target: "{a} sweats nervously near {t}", solo: "{a} is sweating" },
  thumbsup: { count: 6, target: "{a} gives {t} a thumbs up", solo: "{a} gives a thumbs up" },
  tickle: { count: 9, target: "{a} tickles {t}", solo: "{a} wants to be tickled", back: "Tickle Back" },
  tired: { count: 15, target: "{a} is tired of {t}", solo: "{a} is tired" },
  wave: { count: 22, target: "{a} waves at {t}", solo: "{a} waves", back: "Wave Back" },
  wink: { count: 32, target: "{a} winks at {t}", solo: "{a} winks", back: "Wink Back" },
  woah: { count: 8, target: "{a} is amazed by {t}", solo: "{a} says woah" },
  yawn: { count: 10, target: "{a} yawns at {t}", solo: "{a} yawns" },
  yay: { count: 10, target: "{a} cheers for {t}", solo: "{a} says yay" },
  yes: { count: 9, target: "{a} says yes to {t}", solo: "{a} says yes" },
};

const actionNames = Object.keys(roleplayActions);

/* Keep counts fresh without a redeploy: index.json is read once an hour. */
let lastSync = 0;
async function syncCounts() {
  if (Date.now() - lastSync < 36e5) return;
  lastSync = Date.now();
  try {
    const res = await fetch(`${CDN}/index.json`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return;
    const data = await res.json();
    for (const [k, n] of Object.entries(data.categories || {})) {
      if (roleplayActions[k] && Number.isInteger(n) && n > 0) roleplayActions[k].count = n;
    }
  } catch (_) { /* keep the bundled counts */ }
}

function gifFor(action) {
  const a = roleplayActions[action];
  if (!a) return null;
  return `${CDN}/${action}/${Math.floor(Math.random() * a.count) + 1}.gif`;
}

const fill = (tpl, actor, target) =>
  tpl.replace(/\{a\}/g, `**${actor.displayName ?? actor.username}**`)
    .replace(/\{t\}/g, target ? `**${target.displayName ?? target.username}**` : '');

/**
 * Build the reply: GIF + one line (+ a "Back" button for two-person actions).
 * `target` may be null or the actor themself → solo wording.
 */
async function buildRoleplayResponse(action, actor, target, includeButton = true) {
  const a = roleplayActions[action];
  if (!a) return null;
  syncCounts();

  const two = !!target && target.id !== actor.id;
  const box = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(gifFor(action))))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(fill(two ? a.target : a.solo, actor, target)));

  if (includeButton && two && a.back && !target.bot) {
    box.addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${action}_back_${actor.id}_${target.id}`).setLabel(a.back).setStyle(ButtonStyle.Secondary),
    ));
  }
  return box;
}

module.exports = { buildRoleplayResponse, roleplayActions, actionNames, gifFor, CDN };
