import type { ReactNode } from "react";
import { AppSidebar, type AppNavKey } from "@/components/app-sidebar";

type AppShellProps = {
  active: AppNavKey;
  className?: string;
  children: ReactNode;
};

const criticalShellCss = `
.lp-shell{min-height:100vh;display:grid;grid-template-columns:224px minmax(0,1fr);background:#eef3f1;color:#101918;letter-spacing:0}
.lp-content{min-width:0}
.lp-sidebar{position:sticky;top:0;z-index:30;display:grid;grid-template-rows:auto auto auto auto 1fr;gap:12px;height:100dvh;overflow-y:auto;overscroll-behavior:contain;padding:16px 12px;border-right:1px solid #d8e1dd;background:rgba(255,255,255,.94);box-sizing:border-box}
.lp-brand{display:flex;align-items:center;gap:10px;min-width:0}
.lp-brand>span{display:grid;width:34px;height:34px;flex:0 0 34px;place-items:center;border-radius:8px;background:#102f3f;color:#fff;font-size:12px;font-weight:900}
.lp-brand strong,.lp-brand small,.lp-sidebar-note b,.lp-sidebar-note span{display:block}
.lp-brand small,.lp-sidebar-note span{color:#61726e;font-size:12px;line-height:1.45}
.lp-nav,.lp-utility-nav{display:grid;gap:6px}
.lp-nav a,.lp-utility-nav a{display:inline-flex;align-items:center;min-width:0;border-radius:8px;text-decoration:none;box-sizing:border-box}
.lp-nav a{gap:7px;min-height:34px;padding:7px 9px;color:#173c4c;font-size:13px;font-weight:850;white-space:nowrap}
.lp-nav a.active,.lp-nav a:hover{background:#0d5d4d;color:#fff}
.lp-utility-label{padding:0 4px;color:#667772;font-size:10.5px;font-weight:900;text-transform:uppercase}
.lp-utility-nav{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;border-top:1px solid #d8e1dd}
.lp-utility-nav a{justify-content:center;gap:5px;min-height:26px;padding:4px;color:#667772;font-size:10.5px;font-weight:850;white-space:nowrap}
.lp-utility-nav a.active,.lp-utility-nav a:hover{border:1px solid #d8e1dd;background:#f8fbfa;color:#0d5d4d}
.lp-sidebar-note{align-self:end;display:grid;gap:5px;padding:13px;border:1px solid #d8e1dd;border-radius:8px;background:#f7faf8}
.admin-main{display:grid;gap:10px;padding:12px 16px 80px}
.admin-section-nav{position:relative;z-index:12;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:3px;padding:4px 0;border-bottom:1px solid #dbe4e0;background:transparent;box-shadow:none}
.admin-section-nav a{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:28px;padding:4px 6px;border:1px solid transparent;border-radius:7px;color:#173c4c;font-size:11.5px;font-weight:900;text-decoration:none;white-space:nowrap}
.admin-section-nav a.active{border-color:#cfe0d8;background:#e4f4ed;color:#0c5a49}
.admin-hero,.admin-section-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;min-height:46px;padding:4px 0 6px;border-bottom:1px solid #dbe4e0}
.admin-hero p,.admin-section-hero p{margin:0 0 5px;color:#0c5a49;font-size:10.5px;font-weight:900;text-transform:uppercase}
.admin-hero h1,.admin-section-hero h1{max-width:760px;margin:0;font-size:14.5px;line-height:1.28;letter-spacing:0}
.admin-secondary-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:26px;max-width:280px;padding:0 7px;border:1px solid #d9e5df;border-radius:6px;background:#f8fbfa;color:#0c5a49;font-size:10.5px;font-weight:900;text-decoration:none;white-space:nowrap}
@media (max-width:980px){.lp-shell{grid-template-columns:1fr}.lp-sidebar{top:0;height:auto;grid-template-rows:auto auto auto auto;gap:10px;padding:10px 12px;border-right:0;border-bottom:1px solid #d8e1dd}.lp-sidebar-note{display:none}.lp-nav{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.lp-nav a{flex-direction:column;justify-content:center;gap:3px;min-height:42px;padding:5px 3px;font-size:10.5px;text-align:center;white-space:normal}.lp-utility-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.lp-utility-nav a{justify-content:center;min-height:28px;padding:5px 6px}.admin-section-nav{grid-template-columns:repeat(4,minmax(0,1fr));overflow-x:visible}.admin-hero,.admin-section-hero{grid-template-columns:minmax(0,1fr) auto}}
@media (max-width:720px){.admin-main{padding:12px}.admin-hero h1,.admin-section-hero h1{display:-webkit-box;overflow:hidden;font-size:13.5px;-webkit-box-orient:vertical;-webkit-line-clamp:2}.admin-hero .admin-secondary-action,.admin-section-hero .admin-secondary-action{justify-self:end;align-self:start;max-width:132px;overflow:hidden;text-overflow:ellipsis}}
`;

function CriticalShellStyles() {
  return <style data-shell-critical-style dangerouslySetInnerHTML={{ __html: criticalShellCss }} />;
}

export function AppShell({ active, className, children }: AppShellProps) {
  const shellClassName = ["lp-shell", className].filter(Boolean).join(" ");

  return (
    <main className={shellClassName} data-app-shell="persistent" data-shell-active={active}>
      <CriticalShellStyles />
      <AppSidebar active={active} />
      <div className="lp-content" data-shell-content="stable">
        {children}
      </div>
    </main>
  );
}
