"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getAuth } from "@/lib/auth";

const ACTIONS = [
  ["Checkout", "actions/checkout@v7", "Node 24"],
  ["Java", "actions/setup-java@v6", "Node 24"],
  ["Node", "actions/setup-node@v7", "Node 24"],
  ["Artifact", "actions/upload-artifact@v7", "Node 24"],
  ["Buildx", "docker/setup-buildx-action@v4", "Node 24 baseline"],
  ["Build/Push", "docker/build-push-action@v7", "Node 24 baseline"],
] as const;

export default function ActionsRuntimeV73Page(){
  useEffect(()=>{
    const auth=getAuth();
    if(!auth || auth.role!=="ADMIN") window.location.assign("/login?returnTo=/admin/actions-runtime&reason=admin");
  },[]);

  return <div className="space-y-7" data-testid="actions-runtime-v73">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Quản trị viên</Link> / Môi trường chạy GitHub Actions</div>
        <div className="text-xs font-black tracking-[0.22em] text-cyan-300">V73 · HIỆN ĐẠI HÓA MÔI TRƯỜNG CHẠY GITHUB ACTIONS 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">Chuẩn nền CI/CD Node 24</h1>
        <p className="mt-1 max-w-4xl text-slate-400">Bề mặt quản trị chỉ hiển thị bộ công cụ nền đã khóa trong mã nguồn. Không đọc mã truy cập GitHub, không hiển thị bí mật và không gọi GitHub API từ trình duyệt.</p>
      </div>
      <Link href="/admin" className="btn btn-secondary">← Bảng điều khiển</Link>
    </div>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="actions-runtime-summary-v73">
      <Metric label="Chiến lược" value="V73-GITHUB-ACTIONS-NODE24-5"/>
      <Metric label="Trạng thái môi trường chạy" value="NODE24 READY" tone="text-emerald-300"/>
      <Metric label="Flyway" value="V72"/>
      <Metric label="Bảng công khai" value="67"/>
    </section>

    <section className="card overflow-hidden" data-testid="actions-runtime-baseline-v73">
      <div className="border-b border-slate-800 p-5">
        <h2 className="text-xl font-bold">Chuẩn nền GitHub Actions</h2>
        <p className="mt-1 text-sm text-slate-500">Các phiên bản chính dưới đây là chuẩn nền V73. Bộ xác minh hồi quy sẽ thất bại nếu tác vụ thời Node 20 quay trở lại.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase text-slate-500"><tr><th className="p-3">Mục đích</th><th className="p-3">Thao tác</th><th className="p-3">Môi trường chạy</th></tr></thead>
          <tbody>{ACTIONS.map(([purpose,action,runtime])=><tr key={action} className="border-t border-slate-800"><td className="p-3 font-semibold">{purpose}</td><td className="p-3"><code className="text-cyan-300">{action}</code></td><td className="p-3 text-slate-300">{runtime}</td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="card p-5" data-testid="actions-runtime-policy-v73">
        <h2 className="text-xl font-bold">Chính sách môi trường chạy</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p>✅ <code>actions/upload-artifact@v4</code> không còn được phép.</p>
          <p>✅ Không dùng <code>ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION</code>.</p>
          <p>✅ Không dùng <code>FORCE_JAVASCRIPT_ACTIONS_TO_NODE24</code> để che thao tác cũ.</p>
          <p>✅ Chuẩn nền runner tự lưu trữ: <code>2.327.1+</code>.</p>
        </div>
      </div>
      <div className="card p-5" data-testid="actions-runtime-verify-v73">
        <h2 className="text-xl font-bold">Xác minh</h2>
        <p className="mt-2 text-sm text-slate-400">Nguồn sự thật vẫn là bộ xác minh mã nguồn và GitHub CI của đúng xác nhận, không phải trạng thái giả lập trên giao diện.</p>
        <div className="mt-4 rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300">python -X utf8 .\tools\verify_v73_github_actions_node24.py</div>
        <div className="mt-3 text-xs text-slate-500">V73 chỉ thay đổi công cụ: không migration, không thay đổi dữ liệu backend, không lưu bí mật trong trình duyệt.</div>
      </div>
    </section>
  </div>;
}

function Metric({label,value,tone="text-white"}:{label:string;value:string;tone?:string}){
  return <div className="card p-4"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-2 break-words text-lg font-black ${tone}`}>{value}</div></div>;
}
