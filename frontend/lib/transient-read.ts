import { ApiError } from "./api";

type TransientReadOptions = {
  deadlineMs?: number;
  attemptTimeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

// V78.0.18: heavy read-only operational aggregates can legitimately outlive the
// generic 3.5s attempt budget under sustained browser-suite load. Keep the
// generic defaults unchanged; only explicitly opted-in read surfaces use this
// bounded profile.
export const SUSTAINED_OPERATIONAL_READ_OPTIONS = {
  deadlineMs: 24_000,
  attemptTimeoutMs: 8_000,
  baseDelayMs: 350,
  maxDelayMs: 2_000,
} as const;

function isRetryableTransientReadError(error:unknown){
  if(error instanceof DOMException && error.name==="AbortError")return true;
  if(error instanceof Error && error.name==="AbortError")return true;
  const status=error instanceof ApiError?error.status:0;
  return status===0||status===408||status===425||status===429||status>=500;
}

export async function withTransientReadRetry<T>(
  read:(signal:AbortSignal)=>Promise<T>,
  options:TransientReadOptions={},
):Promise<T>{
  const deadlineMs=options.deadlineMs??12_000;
  const attemptTimeoutMs=options.attemptTimeoutMs??3_500;
  const baseDelayMs=options.baseDelayMs??250;
  const maxDelayMs=options.maxDelayMs??1_500;
  const deadline=Date.now()+deadlineMs;
  let attempt=0;

  for(;;){
    const remaining=Math.max(1,deadline-Date.now());
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Math.min(attemptTimeoutMs,remaining));
    try{
      return await read(controller.signal);
    }catch(error){
      if(!isRetryableTransientReadError(error)||Date.now()>=deadline)throw error;
      const delay=Math.min(baseDelayMs*(2**attempt),maxDelayMs,Math.max(0,deadline-Date.now()));
      attempt+=1;
      if(delay>0)await sleep(delay);
    }finally{
      clearTimeout(timeout);
    }
  }
}
