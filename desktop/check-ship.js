"use strict";
/* Run by `npm run dist` before electron-builder: the things that must be
   true of a build that goes to Steam, refused rather than warned about.
   `npm run dist:test` skips this, for a packaged build to try by hand. */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const bad=[];

const appId=Number(JSON.parse(fs.readFileSync(path.join(__dirname,"steam.json"),"utf8")).appId);
if(!appId||appId===480)
  bad.push("steam.json still has the test app id (480). Put the real App ID from Steamworks in it.");
if(/var TEST_CARD=true/.test(fs.readFileSync(path.join(ROOT,"js","16-panels.js"),"utf8")))
  bad.push("TEST_CARD is true in js/16-panels.js - the Testing card is on the settings sheet.");
if(/var UNLIMITED_SHARDS=true/.test(fs.readFileSync(path.join(ROOT,"js","09-wardrobe.js"),"utf8")))
  bad.push("UNLIMITED_SHARDS is true in js/09-wardrobe.js.");
const html=fs.readFileSync(path.join(__dirname,"www","index.html"),"utf8");
if(/UNCOMMITTED CHANGES/.test(html))
  bad.push("www/ was built from a dirty tree. Commit first, so this build can be re-derived.");
if(fs.existsSync(path.join(__dirname,"steam_appid.txt")))
  bad.push("steam_appid.txt is in desktop/ - it must never ship (it switches off the relaunch through Steam).");

if(bad.length){
  console.error("\nNot a Steam build yet:\n  - "+bad.join("\n  - ")+"\n");
  process.exit(1);
}
console.log("ship checks: ok (app "+appId+")");
