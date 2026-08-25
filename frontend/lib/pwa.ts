"use client";

import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { PwaDevice, PwaPushConfig } from "@/lib/types";

const DEVICE_KEY="cinebooking_pwa_device_v52";

export function getPwaDeviceKey(){
  if(typeof window==="undefined")return "";
  let key=localStorage.getItem(DEVICE_KEY);
  if(!key){key=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,key);}
  return key;
}

export function isStandalonePwa(){
  if(typeof window==="undefined")return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
}

export function platformName(){
  if(typeof navigator==="undefined")return "WEB";
  const ua=navigator.userAgent||"";
  if(/iPhone|iPad|iPod/i.test(ua))return "IOS";
  if(/Android/i.test(ua))return "ANDROID";
  if(/Windows/i.test(ua))return "WINDOWS";
  if(/Macintosh|Mac OS X/i.test(ua))return "MACOS";
  if(/Linux/i.test(ua))return "LINUX";
  return "WEB";
}

export function deviceLabel(){
  const platform=platformName();
  const ua=typeof navigator!=="undefined"?navigator.userAgent:"";
  const browser=/Edg\//i.test(ua)?"Edge":/Firefox\//i.test(ua)?"Firefox":/Chrome\//i.test(ua)?"Chrome":/Safari\//i.test(ua)?"Safari":"Browser";
  return `${browser} · ${platform}`;
}

function appServerKey(value:string):ArrayBuffer{
  const normalized=value.replace(/-/g,"+").replace(/_/g,"/");
  const padded=normalized+"=".repeat((4-normalized.length%4)%4);
  const raw=atob(padded);const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
}

function subscriptionFields(subscription:PushSubscription|null){
  if(!subscription)return {endpoint:undefined,p256dh:undefined,authSecret:undefined};
  const json=subscription.toJSON();
  return {endpoint:subscription.endpoint,p256dh:json.keys?.p256dh,authSecret:json.keys?.auth};
}

export async function pushConfig(){return api<PwaPushConfig>("/pwa/config");}

export async function registerCurrentPwaDevice(options:{subscribe?:boolean}={}){
  const auth=getAuth();
  if(!auth||typeof navigator==="undefined"||!("serviceWorker" in navigator))return {device:null as PwaDevice|null,config:null as PwaPushConfig|null,subscription:null as PushSubscription|null};
  const config=await pushConfig();
  const registration=await navigator.serviceWorker.ready;
  const pushManager=registration.pushManager;
  let subscription=pushManager?await pushManager.getSubscription():null;
  if(options.subscribe&&config.enabled){
    if(!pushManager)throw new Error("Trình duyệt không hỗ trợ PushManager.");
    if(typeof Notification==="undefined")throw new Error("Trình duyệt không hỗ trợ Web Push.");
    let permission=Notification.permission;
    if(permission!=="granted")permission=await Notification.requestPermission();
    if(permission!=="granted")throw new Error("Bạn chưa cấp quyền thông báo cho trình duyệt.");
    if(!subscription)subscription=await pushManager.subscribe({userVisibleOnly:true,applicationServerKey:appServerKey(config.vapidPublicKey)});
  }
  const fields=subscriptionFields(subscription);
  const pushEnabled=Boolean(config.enabled&&subscription&&fields.p256dh&&fields.authSecret);
  const key=getPwaDeviceKey();
  const device=await api<PwaDevice>(`/pwa/devices/${encodeURIComponent(key)}`,{method:"PUT",body:JSON.stringify({
    deviceLabel:deviceLabel(),platform:platformName(),userAgent:navigator.userAgent||"",standalone:isStandalonePwa(),pushEnabled,
    endpoint:pushEnabled?fields.endpoint:null,p256dh:pushEnabled?fields.p256dh:null,authSecret:pushEnabled?fields.authSecret:null
  })});
  localStorage.setItem(`cinebooking_push_active_v52:${auth.userId}`,pushEnabled?"1":"0");
  return {device,config,subscription};
}

export async function disableCurrentDevicePush(){
  const auth=getAuth();if(!auth||typeof navigator==="undefined"||!("serviceWorker" in navigator))return;
  const registration=await navigator.serviceWorker.ready;
  const subscription=registration.pushManager?await registration.pushManager.getSubscription():null;
  if(subscription)await subscription.unsubscribe().catch(()=>false);
  const key=getPwaDeviceKey();
  await api<PwaDevice>(`/pwa/devices/${encodeURIComponent(key)}`,{method:"PUT",body:JSON.stringify({deviceLabel:deviceLabel(),platform:platformName(),userAgent:navigator.userAgent||"",standalone:isStandalonePwa(),pushEnabled:false,endpoint:null,p256dh:null,authSecret:null})});
  localStorage.setItem(`cinebooking_push_active_v52:${auth.userId}`,"0");
}

export async function listPwaDevices(){return api<PwaDevice[]>(`/pwa/devices?currentDeviceKey=${encodeURIComponent(getPwaDeviceKey())}`);}

export async function removePwaDevice(device:PwaDevice){
  if(device.current&&typeof navigator!=="undefined"&&"serviceWorker" in navigator){
    const registration=await navigator.serviceWorker.ready;const subscription=registration.pushManager?await registration.pushManager.getSubscription():null;if(subscription)await subscription.unsubscribe().catch(()=>false);
  }
  await api(`/pwa/devices/${encodeURIComponent(device.deviceKey)}`,{method:"DELETE"});
}

export function isBackgroundPushActive(userId?:string){
  if(typeof window==="undefined"||!userId)return false;
  return localStorage.getItem(`cinebooking_push_active_v52:${userId}`)==="1";
}
