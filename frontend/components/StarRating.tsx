"use client";

export default function StarRating({value,onChange,readonly=false,size="md"}:{value:number;onChange?:(v:number)=>void;readonly?:boolean;size?:"sm"|"md"|"lg"}){
  const cls=size==="lg"?"text-3xl":size==="sm"?"text-base":"text-xl";
  return <div className={`inline-flex items-center gap-1 ${cls}`} aria-label={`${value} trên 5 sao`}>
    {[1,2,3,4,5].map(n=><button key={n} type="button" disabled={readonly} onClick={()=>onChange?.(n)} className={`${readonly?"cursor-default":"cursor-pointer hover:scale-110"} transition ${n<=Math.round(value)?"text-amber-400":"text-slate-600"}`} aria-label={`${n} sao`}>★</button>)}
  </div>;
}
