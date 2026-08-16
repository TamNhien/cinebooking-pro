"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { isStrongPassword } from "@/lib/password";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrength from "@/components/PasswordStrength";
import type { Cinema, StaffAccount, UserProfile } from "@/lib/types";

type StaffForm = {
  employeeCode:string;
  email:string;
  fullName:string;
  phone:string;
  role:"STAFF"|"MANAGER";
  cinemaId:string;
  jobTitle:string;
  employmentStatus:"ACTIVE"|"ON_LEAVE"|"INACTIVE";
  hireDate:string;
  accountEnabled:boolean;
  password:string;
  confirmPassword:string;
};

type EmailStatus = {
  exists:boolean;
  userId:string|null;
  role:string|null;
  fullName:string|null;
  phone:string|null;
  activeStaff:boolean;
  deletedStaff:boolean;
  canPromote:boolean;
  message:string;
};

const emptyForm: StaffForm = {
  employeeCode:"",
  email:"",
  fullName:"",
  phone:"",
  role:"STAFF",
  cinemaId:"",
  jobTitle:"Nhân viên rạp",
  employmentStatus:"ACTIVE",
  hireDate:new Date().toISOString().slice(0,10),
  accountEnabled:true,
  password:"",
  confirmPassword:"",
};

const statusLabel:Record<StaffAccount["employmentStatus"],string>={ACTIVE:"Đang làm việc",ON_LEAVE:"Đang nghỉ phép",INACTIVE:"Ngừng làm việc"};

export default function AdminStaffPage(){
  const [items,setItems]=useState<StaffAccount[]>([]);
  const [cinemas,setCinemas]=useState<Cinema[]>([]);
  const [form,setForm]=useState<StaffForm>({...emptyForm});
  const [editingId,setEditingId]=useState<string|null>(null);
  const [query,setQuery]=useState("");
  const [statusFilter,setStatusFilter]=useState("ALL");
  const [msg,setMsg]=useState("");
  const [saving,setSaving]=useState(false);
  const [emailStatus,setEmailStatus]=useState<EmailStatus|null>(null);
  const [checkingEmail,setCheckingEmail]=useState(false);

  async function load(){
    const me=await api<UserProfile>("/me");
    if(me.role!=="ADMIN"){
      clearAuth(); location.href="/login?returnTo=/admin/staff&reason=admin"; return;
    }
    const [staff,cs]=await Promise.all([api<StaffAccount[]>("/admin/staff"),api<Cinema[]>("/admin/cinemas")]);
    setItems(staff);setCinemas(cs);
  }

  useEffect(()=>{
    if(!getAuth()){location.href="/login?returnTo=/admin/staff&reason=required";return;}
    load().catch(e=>setMsg((e as Error).message));
  },[]);

  useEffect(()=>{
    if(editingId){setEmailStatus(null);return;}
    const email=form.email.trim();
    if(!email.includes("@")){setEmailStatus(null);return;}
    const timer=setTimeout(async()=>{
      setCheckingEmail(true);
      try{
        const status=await api<EmailStatus>(`/admin/staff/email-status?email=${encodeURIComponent(email)}`);
        setEmailStatus(status);
        if(status.exists&&status.canPromote){
          setForm(current=>({
            ...current,
            fullName:current.fullName.trim()?current.fullName:(status.fullName||""),
            phone:current.phone.trim()?current.phone:(status.phone||""),
            password:"",
            confirmPassword:""
          }));
        }
      }catch{setEmailStatus(null)}finally{setCheckingEmail(false)}
    },450);
    return()=>clearTimeout(timer);
  },[form.email,editingId]);

  const filtered=useMemo(()=>items.filter(s=>{
    const q=query.trim().toLowerCase();
    const hit=!q||[s.employeeCode,s.fullName,s.email,s.phone||"",s.cinemaName||"",s.jobTitle||""].some(v=>v.toLowerCase().includes(q));
    const status=statusFilter==="ALL"||s.employmentStatus===statusFilter;
    return hit&&status;
  }),[items,query,statusFilter]);

  function edit(s:StaffAccount){
    setEditingId(s.userId);
    setEmailStatus(null);
    setForm({employeeCode:s.employeeCode,email:s.email,fullName:s.fullName,phone:s.phone||"",role:s.role,cinemaId:s.cinemaId||"",jobTitle:s.jobTitle||"",employmentStatus:s.employmentStatus,hireDate:s.hireDate||"",accountEnabled:s.accountEnabled,password:"",confirmPassword:""});
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function reset(){setEditingId(null);setEmailStatus(null);setForm({...emptyForm,hireDate:new Date().toISOString().slice(0,10)});}

  async function deleteStaff(s:StaffAccount){
    const warning=`Xóa nhân viên ${s.employeeCode} - ${s.fullName}?\n\nTài khoản sẽ bị khóa, ca chưa thực hiện sẽ bị hủy. Lịch sử chấm công, quét vé và audit vẫn được giữ.`;
    if(!confirm(warning))return;
    setMsg("");
    try{
      const r=await api<{message:string;cancelledShifts:number;endedActiveShift:boolean}>(`/admin/staff/${s.userId}`,{method:"DELETE"});
      if(editingId===s.userId)reset();
      setMsg(`${r.message} Đã hủy ${r.cancelledShifts} ca${r.endedActiveShift?" và kết thúc ca đang làm":""}.`);
      await load();
    }catch(e){setMsg((e as Error).message)}
  }

  async function save(e:FormEvent){
    e.preventDefault();setMsg("");
    setSaving(true);
    try{
      const common={employeeCode:form.employeeCode,email:form.email,fullName:form.fullName,phone:form.phone||null,role:form.role,cinemaId:form.cinemaId||null,jobTitle:form.jobTitle||null,employmentStatus:form.employmentStatus,hireDate:form.hireDate||null,accountEnabled:form.accountEnabled};
      if(editingId){
        if(form.password && !isStrongPassword(form.password))throw new Error("Mật khẩu mới chưa đạt yêu cầu bảo mật.");
        if(form.password!==form.confirmPassword)throw new Error("Mật khẩu xác nhận chưa trùng khớp.");
        await api(`/admin/staff/${editingId}`,{method:"PUT",body:JSON.stringify({...common,newPassword:form.password||null})});
        setMsg("Đã cập nhật tài khoản nhân viên.");
      }else{
        const status=await api<EmailStatus>(`/admin/staff/email-status?email=${encodeURIComponent(form.email.trim())}`);
        setEmailStatus(status);
        if(status.activeStaff)throw new Error("Email này đã thuộc một nhân viên đang hoạt động. Hãy chỉnh sửa nhân viên hiện có thay vì tạo mới.");
        if(status.exists&&status.canPromote){
          const action=status.deletedStaff?"khôi phục nhân viên đã xóa":"chuyển tài khoản hiện có thành nhân viên";
          if(!confirm(`${status.message}\n\nBạn có chắc muốn ${action}?\nMật khẩu hiện tại của tài khoản sẽ được GIỮ NGUYÊN.`))return;
          await api("/admin/staff/promote",{method:"POST",body:JSON.stringify(common)});
          setMsg(status.deletedStaff?"Đã khôi phục tài khoản nhân viên.":"Đã chuyển tài khoản hiện có thành nhân viên. Mật khẩu cũ được giữ nguyên.");
        }else if(status.exists){
          throw new Error(status.message);
        }else{
          if(!isStrongPassword(form.password))throw new Error("Mật khẩu nhân viên chưa đạt yêu cầu bảo mật.");
          if(form.password!==form.confirmPassword)throw new Error("Mật khẩu xác nhận chưa trùng khớp.");
          await api("/admin/staff",{method:"POST",body:JSON.stringify({...common,password:form.password})});
          setMsg("Đã tạo tài khoản nhân viên mới.");
        }
      }
      reset();await load();
    }catch(e){setMsg((e as Error).message)}finally{setSaving(false)}
  }

  const promotable=!editingId&&!!emailStatus?.exists&&emailStatus.canPromote;

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Admin</Link> / Nhân viên</div><h1 className="text-3xl font-bold">Quản lý tài khoản nhân viên</h1><p className="mt-1 text-slate-400">Tạo, chuyển tài khoản có sẵn, chỉnh sửa hoặc xóa STAFF/MANAGER. Email trong hệ thống là duy nhất.</p></div>
      <Link href="/admin" className="btn btn-secondary">← Dashboard</Link>
    </div>

    {msg&&<div className="card border border-amber-500/30 p-4 text-sm">{msg}</div>}

    <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
      <form onSubmit={save} className="card h-fit space-y-4 p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editingId?"Chỉnh sửa nhân viên":promotable?(emailStatus?.deletedStaff?"Khôi phục nhân viên":"Chuyển thành nhân viên"):"Tạo nhân viên mới"}</h2>{editingId&&<button type="button" className="text-sm text-slate-400 hover:text-white" onClick={reset}>Huỷ sửa</button>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-sm text-slate-300">Mã nhân viên</label><input className="input" placeholder="NV0001" value={form.employeeCode} onChange={e=>setForm({...form,employeeCode:e.target.value.toUpperCase()})} required/></div>
          <div><label className="mb-1.5 block text-sm text-slate-300">Cấp tài khoản</label><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value as StaffForm["role"],jobTitle:e.target.value==="MANAGER"?"Quản lý rạp":form.jobTitle})}><option value="STAFF">STAFF - Nhân viên</option><option value="MANAGER">MANAGER - Quản lý</option></select></div>
        </div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Họ và tên</label><input className="input" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} required/></div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-300">Email đăng nhập</label>
          <input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
          {!editingId&&<div className="mt-2 text-xs">
            {checkingEmail?<span className="text-slate-400">Đang kiểm tra email...</span>:emailStatus?.exists?<span className={emailStatus.canPromote?"text-amber-300":"text-red-300"}>{emailStatus.message}</span>:emailStatus?<span className="text-emerald-300">✓ {emailStatus.message}</span>:<span className="text-slate-500">Email phải là duy nhất. Nếu đã là tài khoản khách hàng, Admin có thể chuyển tài khoản đó thành nhân viên.</span>}
          </div>}
        </div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Số điện thoại</label><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Ngày vào làm</label><input className="input" type="date" value={form.hireDate} onChange={e=>setForm({...form,hireDate:e.target.value})}/></div></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Rạp được phân công</label><select className="input" value={form.cinemaId} onChange={e=>setForm({...form,cinemaId:e.target.value})}><option value="">Chưa phân rạp</option>{cinemas.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Chức danh</label><input className="input" placeholder="Nhân viên soát vé" value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Trạng thái nhân sự</label><select className="input" value={form.employmentStatus} onChange={e=>{const employmentStatus=e.target.value as StaffForm["employmentStatus"];setForm({...form,employmentStatus,accountEnabled:employmentStatus==="INACTIVE"?false:form.accountEnabled})}}><option value="ACTIVE">Đang làm việc</option><option value="ON_LEAVE">Nghỉ phép</option><option value="INACTIVE">Ngừng làm việc</option></select></div><label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.accountEnabled} onChange={e=>setForm({...form,accountEnabled:e.target.checked})}/> Cho phép đăng nhập</label></div>

        {promotable?<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"><b>{emailStatus?.deletedStaff?"Khôi phục tài khoản":"Dùng tài khoản hiện có"}</b><div className="mt-1 text-amber-200/80">Không cần tạo mật khẩu mới. Hệ thống giữ nguyên password hash hiện tại, booking và lịch sử của tài khoản. Sau khi chuyển, Admin vẫn có thể vào “Chỉnh sửa” để đặt mật khẩu mới nếu cần.</div></div>:<>
          <PasswordInput label={editingId?"Mật khẩu mới (không bắt buộc)":"Mật khẩu đăng nhập"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required={!editingId} autoComplete="new-password"/>
          <PasswordInput label="Xác nhận mật khẩu" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} required={!editingId||!!form.password} autoComplete="new-password"/>
          {(form.password||!editingId)&&<PasswordStrength password={form.password} confirmPassword={form.confirmPassword} showMatch/>}
        </>}
        <button className="btn btn-primary w-full" disabled={saving||checkingEmail||(!editingId&&!!emailStatus?.exists&&!emailStatus.canPromote)}>{saving?"Đang lưu...":editingId?"Lưu thay đổi":promotable?(emailStatus?.deletedStaff?"Khôi phục tài khoản nhân viên":"Chuyển thành tài khoản nhân viên"):"Tạo tài khoản nhân viên"}</button>
      </form>

      <div className="space-y-4">
        <div className="card grid gap-3 p-4 md:grid-cols-[1fr_220px]"><input className="input" placeholder="Tìm mã NV, tên, email, rạp..." value={query} onChange={e=>setQuery(e.target.value)}/><select className="input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Đang làm việc</option><option value="ON_LEAVE">Nghỉ phép</option><option value="INACTIVE">Ngừng làm việc</option></select></div>
        <div className="grid gap-3">{filtered.map(s=><div key={s.userId} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-300">{s.employeeCode}</span><b className="text-lg">{s.fullName}</b><span className="rounded-lg border border-slate-700 px-2 py-1 text-xs">{s.role}</span></div><div className="mt-2 text-sm text-slate-400">{s.email} · {s.phone||"Chưa có SĐT"}</div><div className="mt-1 text-sm text-slate-400">🏢 {s.cinemaName||"Chưa phân rạp"} · {s.jobTitle||"Chưa đặt chức danh"}</div><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2 py-1 ${s.employmentStatus==="ACTIVE"?"bg-emerald-500/15 text-emerald-300":s.employmentStatus==="ON_LEAVE"?"bg-amber-500/15 text-amber-300":"bg-slate-700 text-slate-300"}`}>{statusLabel[s.employmentStatus]}</span><span className={`rounded-full px-2 py-1 ${s.accountEnabled?"bg-cyan-500/15 text-cyan-300":"bg-red-500/15 text-red-300"}`}>{s.accountEnabled?"Có thể đăng nhập":"Đã khoá đăng nhập"}</span>{s.hireDate&&<span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">Vào làm {new Date(s.hireDate+"T00:00:00").toLocaleDateString("vi-VN")}</span>}</div></div><div className="flex flex-wrap gap-2"><button className="btn btn-secondary" onClick={()=>edit(s)}>✏️ Chỉnh sửa</button><button className="btn btn-secondary !border-red-800/70 !text-red-300 hover:!bg-red-950/50" onClick={()=>deleteStaff(s)}>🗑 Xóa</button></div></div></div>)}{filtered.length===0&&<div className="card p-8 text-center text-slate-400">Không tìm thấy nhân viên phù hợp.</div>}</div>
      </div>
    </div>
  </div>;
}
