"use strict";
/* I'm Just A Cube - the Steam build's preload: the three things the page is
   handed before any of its own scripts run.

   window.STEAM          true. steamBuild() (js/26-desk.js) reads this and
                         nothing else: every paid shape owned, no ads, no
                         shop, no age card.
   window.storage        the save, backed by the per-account file main.js
                         keeps (see THE SAVE there). js/00-storage.js only
                         defines its localStorage shim when window.storage is
                         missing, so it steps aside without a line changing.
   window.steamBridge    achievements out (js/27-steam.js) and a little
                         about where we are running.

   contextIsolation is on and this runs sandboxed: the page gets these three
   names and no Node at all. */
const {contextBridge,ipcRenderer}=require("electron");

const data=ipcRenderer.sendSync("save:load")||{};
const info=ipcRenderer.sendSync("steam:info")||{};
const has=(k)=>Object.prototype.hasOwnProperty.call(data,k);
const ok=(v)=>Promise.resolve(v);

contextBridge.exposeInMainWorld("STEAM",true);

/* The same promise API as js/00-storage.js: get / set / delete / list.
   Reads come from the copy loaded above; a write updates it and is sent to
   the main process SYNCHRONOUSLY - a fraction of a millisecond - so that the
   save pagehide makes as the window closes (js/19-bindings.js) has landed
   before the window is gone, as the localStorage shim's does. */
contextBridge.exposeInMainWorld("storage",{
  get(k){k=String(k);return ok(has(k)?{key:k,value:data[k]}:null);},
  set(k,v){
    k=String(k);v=String(v);data[k]=v;
    ipcRenderer.sendSync("save:set",k,v);
    return ok({key:k,value:v});
  },
  delete(k){
    k=String(k);delete data[k];
    ipcRenderer.sendSync("save:del",k);
    return ok({key:k,deleted:true});
  },
  list(prefix){
    prefix=prefix?String(prefix):"";
    return ok({keys:Object.keys(data).filter(k=>k.indexOf(prefix)===0),prefix});
  }
});

contextBridge.exposeInMainWorld("steamBridge",{
  online:!!info.steam,   // Steam answered; false in a development run without it
  why:info.why||"",      // and if it did not, what steamworks.js said
  deck:!!info.deck,
  achieve(ids){ipcRenderer.send("steam:achieve",[].concat(ids).map(String));}
});

/* THE DECK'S KEYBOARD. A Deck has no keys, so focusing a text field asks
   Steam for its floating keyboard, placed clear of the field. Screen pixels,
   so the page's CSS zoom (js/26-desk.js) and the device ratio both apply -
   getBoundingClientRect already includes the zoom. */
if(info.deck){
  window.addEventListener("focusin",(e)=>{
    const t=e.target;
    if(!t||!(t.tagName==="TEXTAREA"||(t.tagName==="INPUT"&&
       /^(text|search|number|email|)$/i.test(t.type||""))))return;
    const r=t.getBoundingClientRect(), d=window.devicePixelRatio||1;
    ipcRenderer.send("steam:keyboard",{x:r.left*d,y:r.top*d,w:r.width*d,h:r.height*d,
      multi:t.tagName==="TEXTAREA"});
  },true);
}
