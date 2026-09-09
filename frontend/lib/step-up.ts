"use client";

const KEY="cinebooking_admin_step_up_v68";

export type StoredStepUpV68={token:string;expiresAt:string;strategyVersion:string};

export function getStepUp():StoredStepUpV68|null{
  if(typeof window==="undefined") return null;
  try{
    const raw=sessionStorage.getItem(KEY);
    if(!raw) return null;
    const value=JSON.parse(raw) as StoredStepUpV68;
    if(!value.token||!value.expiresAt||new Date(value.expiresAt).getTime()<=Date.now()){
      sessionStorage.removeItem(KEY);return null;
    }
    return value;
  }catch{sessionStorage.removeItem(KEY);return null;}
}

export function setStepUp(value:StoredStepUpV68){
  if(typeof window==="undefined") return;
  sessionStorage.setItem(KEY,JSON.stringify(value));
  window.dispatchEvent(new Event("step-up-changed"));
}

export function clearStepUp(){
  if(typeof window==="undefined") return;
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("step-up-changed"));
}

export function stepUpToken(){return getStepUp()?.token??null;}
