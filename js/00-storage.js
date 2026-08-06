"use strict";
/* Orthogonal — 00-storage.js
   The game was born inside a Claude artifact, where the host page supplies
   window.storage. Nothing else does. This shim provides the same
   promise-based API on top of localStorage so the identical code runs from a
   file:// double-click, from itch.io, and inside a Capacitor WebView.

   It defines window.storage only if the host has not already, so running the
   game back inside an artifact still uses the real thing.

   API: get(k) -> {key,value} | null ; set(k,v) ; delete(k) ; list(prefix)
   Everything returns a Promise, and every caller already tolerates rejection. */
(function(){
  if(window.storage)return;                       // host provided one
  var PREFIX="";                                  // keys are namespaced already
  function ok(v){return Promise.resolve(v);}
  var mem=null;                                   // fallback if storage is denied
  function backing(){
    if(mem)return mem;
    try{
      var t="__orth_probe__";
      window.localStorage.setItem(t,"1");
      window.localStorage.removeItem(t);
      return window.localStorage;
    }catch(e){
      // Private browsing, or a WebView with storage disabled. An in-memory map
      // keeps the game playable; progress just will not survive a reload.
      mem={_d:{},
        getItem:function(k){return this._d.hasOwnProperty(k)?this._d[k]:null;},
        setItem:function(k,v){this._d[k]=String(v);},
        removeItem:function(k){delete this._d[k];},
        key:function(i){return Object.keys(this._d)[i];},
        get length(){return Object.keys(this._d).length;}};
      return mem;
    }
  }
  window.storage={
    get:function(k){
      var v=backing().getItem(PREFIX+k);
      return ok(v===null?null:{key:k,value:v});
    },
    set:function(k,v){
      try{backing().setItem(PREFIX+k,String(v));}catch(e){return Promise.reject(e);}
      return ok({key:k,value:String(v)});
    },
    "delete":function(k){
      backing().removeItem(PREFIX+k);
      return ok({key:k,deleted:true});
    },
    list:function(prefix){
      var b=backing(),out=[],i;
      for(i=0;i<b.length;i++){
        var k=b.key(i);
        if(k&&k.indexOf(PREFIX)===0){
          var bare=k.slice(PREFIX.length);
          if(!prefix||bare.indexOf(prefix)===0)out.push(bare);
        }
      }
      return ok({keys:out,prefix:prefix||""});
    }
  };
})();
