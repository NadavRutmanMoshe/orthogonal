"use strict";
/* Writes steampipe/app_build.vdf - the file SteamCMD reads to upload a build
   - from steam.json, after `npm run dist` has made dist/win-unpacked.

   Generated rather than checked in so the App ID lives in ONE place
   (steam.json) and an upload cannot go to a different app from the one the
   exe was built to start. Upload with (README, "Uploading a build"):

     steamcmd +login <steam account> +run_app_build "<full path>\desktop\steampipe\app_build.vdf" +quit
*/
const fs=require("fs"), path=require("path");
const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,"steam.json"),"utf8"));
const appId=Number(cfg.appId), depotId=Number(cfg.depotId)||appId+1;
const content=path.join(__dirname,"dist","win-unpacked");
if(!fs.existsSync(path.join(content,"ImJustACube.exe"))){
  console.error("no dist/win-unpacked/ImJustACube.exe - run npm run dist first");process.exit(1);
}
let commit="";
try{commit=/app build ([^ ]+)/.exec(fs.readFileSync(path.join(__dirname,"www","index.html"),"utf8"))[1];}catch(e){}
const dir=path.join(__dirname,"steampipe");
fs.mkdirSync(dir,{recursive:true});
/* Paths are relative to this .vdf. SetLive is empty on purpose: a build goes
   up to Steamworks, and making it the live one is a click there (Builds tab),
   after it has been played - the same rule as Play's tracks. */
const vdf=`"AppBuild"
{
\t"AppID" "${appId}"
\t"Desc" "I'm Just A Cube ${commit}"
\t"ContentRoot" "..\\dist\\win-unpacked\\"
\t"BuildOutput" ".\\output\\"
\t"SetLive" ""
\t"Depots"
\t{
\t\t"${depotId}"
\t\t{
\t\t\t"FileMapping"
\t\t\t{
\t\t\t\t"LocalPath" "*"
\t\t\t\t"DepotPath" "."
\t\t\t\t"recursive" "1"
\t\t\t}
\t\t\t"FileExclusion" "steam_appid.txt"
\t\t}
\t}
}
`;
fs.writeFileSync(path.join(dir,"app_build.vdf"),vdf);
console.log("steampipe/app_build.vdf: app "+appId+", depot "+depotId+(commit?", "+commit:""));
