"use client";

import { useState } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, CircleHelp,
  Code2, Copy, FileClock, Fingerprint, Gauge, Laptop, LockKeyhole, Menu,
  Monitor, MoreHorizontal, Network, Plus, Power, RefreshCw, Shield,
  ShieldCheck, Sparkles, Terminal, Unplug, WalletCards, X
} from "lucide-react";

type Section = "Overview" | "Devices" | "Connect AI" | "Tasks" | "Plan & usage" | "Security";

const nav: { label: Section; icon: typeof Activity; note?: string }[] = [
  { label: "Overview", icon: Gauge },
  { label: "Devices", icon: Monitor },
  { label: "Connect AI", icon: Network },
  { label: "Tasks", icon: Activity },
  { label: "Plan & usage", icon: WalletCards },
  { label: "Security", icon: ShieldCheck }
];

function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 42 42" fill="none">
          <path d="M10 16 7 5.5c-.5-1.8 1.5-2.8 2.8-1.4L18 13M32 16l3-10.5c.5-1.8-1.5-2.8-2.8-1.4L24 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <path d="M8 21c0-7 5.4-11 13-11s13 4 13 11v8c0 5-5 8-13 8S8 34 8 29v-8Z" fill="currentColor"/>
          <circle cx="16" cy="23" r="2" fill="#11110F"/><circle cx="26" cy="23" r="2" fill="#11110F"/>
          <path d="M17 29q4 3 8 0" stroke="#11110F" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <span>meep<span className="brand-gold">sheep</span></span>
    </div>
  );
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "green" }) {
  return <span className={"tag tag-" + tone}><i />{children}</span>;
}

function SectionTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="section-title"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export default function HomePage() {
  const [active, setActive] = useState<Section>("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [showSecrets, setShowSecrets] = useState(false);
  const [emergencyStopped, setEmergencyStopped] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify(label + " copied");
    } catch {
      notify("Clipboard access unavailable in this browser");
    }
  };

  const go = (section: Section) => {
    setActive(section);
    setMobileNav(false);
  };

  const mcpExample = JSON.stringify({
    mcpServers: {
      meepsheep: {
        url: "https://YOUR-MEEPSHEEP-HOST/mcp",
        headers: { Authorization: "Bearer YOUR_ACCESS_TOKEN" }
      }
    }
  }, null, 2);

  return (
    <main className="app-shell">
      <aside className={"sidebar " + (mobileNav ? "sidebar-open" : "")}>
        <div className="sidebar-top">
          <Brand />
          <div className="workspace-chip"><span className="workspace-avatar">M</span><span><strong>My workspace</strong><small>Personal control room</small></span><ChevronDown size={15}/></div>
        </div>
        <div className="nav-caption">CONTROL CENTER</div>
        <nav aria-label="Main navigation">
          {nav.map(item => {
            const Icon = item.icon;
            return <button key={item.label} className={"nav-item " + (active === item.label ? "nav-active" : "")} onClick={() => go(item.label)}><Icon size={17}/><span>{item.label}</span>{item.label === "Devices" && <span className="nav-count">0</span>}</button>;
          })}
        </nav>
        <div className="sidebar-spacer"/>
        <div className="security-mini"><div className="security-mini-icon"><ShieldCheck size={17}/></div><div><strong>Safety first</strong><p>Local control. Explicit permission.</p></div></div>
        <button className="sidebar-help" onClick={() => notify("Documentation is being prepared for the first release")}><CircleHelp size={16}/> Help & documentation <ArrowUpRight size={13}/></button>
        <div className="sidebar-bottom"><div className="profile-dot">M</div><div className="profile-copy"><strong>MeepSheep account</strong><small>Prototype workspace</small></div><MoreHorizontal size={18}/></div>
      </aside>
      {mobileNav && <button className="scrim" aria-label="Close menu" onClick={() => setMobileNav(false)}/>}

      <section className="main-area">
        <header className="topbar">
          <div className="crumbs"><button className="mobile-menu icon-btn" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19}/></button><span>MeepSheep</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
          <div className="top-actions"><span className="prototype-status"><span/> Prototype mode</span><button className="icon-btn" aria-label="Notifications" onClick={() => notify("No notifications yet")}><Bell size={17}/></button><div className="user-avatar">M</div></div>
        </header>

        <div className="page-content">
          {active === "Overview" && <>
            <div className="welcome-row">
              <div><div className="eyebrow eyebrow-line"><span/> YOUR COMPUTER, YOUR RULES</div><h1>Your AI. Your machine.<br/><span>You're in control.</span></h1><p className="welcome-copy">Connect compatible AI tools to a computer you own. Approve sensitive actions, keep an eye on every task, and stay in the driver's seat.</p></div>
              <button className="button button-gold" onClick={() => setConnectOpen(true)}><Plus size={16}/> Connect a computer</button>
            </div>

            <div className="hero-panel">
              <div className="hero-copy"><Tag tone="gold">THE MEEPSHEEP APPROACH</Tag><h2>A bridge between AI<br/>and the real desktop.</h2><p>A local agent will let approved AI clients inspect your screen, interact with apps, and run permitted tasks without exposing your computer to the public internet.</p><button className="text-link" onClick={() => go("Security")}>Explore the safety model <ArrowRight size={15}/></button></div>
              <div className="hero-visual" aria-hidden="true"><div className="visual-ring ring-one"/><div className="visual-ring ring-two"/><div className="visual-core"><Brand/><span>LOCAL AGENT</span></div><div className="visual-node node-ai"><Sparkles size={17}/><small>AI CLIENT</small></div><div className="visual-node node-pc"><Monitor size={17}/><small>YOUR PC</small></div><div className="visual-link"/></div>
              <div className="hero-footer"><span><LockKeyhole size={14}/> Local-first by design</span><span><ShieldCheck size={14}/> Permission before action</span><span><FileClock size={14}/> Auditable activity</span></div>
            </div>

            <div className="metrics-grid">
              <article className="metric-card"><div className="metric-label">COMPUTERS CONNECTED <Monitor size={16}/></div><div className="metric-value">0 <span>/ 0 online</span></div><div className="metric-foot">No devices paired yet</div></article>
              <article className="metric-card"><div className="metric-label">ACTIVE TASKS <Activity size={16}/></div><div className="metric-value">0 <span>running</span></div><div className="metric-foot">Nothing is controlling your computer</div></article>
              <article className="metric-card"><div className="metric-label">APPROVALS WAITING <Shield size={16}/></div><div className="metric-value">0 <span>to review</span></div><div className="metric-foot">Sensitive actions require your say</div></article>
              <article className="metric-card"><div className="metric-label">USAGE THIS PERIOD <Gauge size={16}/></div><div className="metric-value">— <span>not tracked</span></div><div className="metric-foot">Usage metering is not connected yet</div></article>
            </div>

            <div className="overview-grid">
              <section className="panel getting-started">
                <SectionTitle eyebrow="START HERE" title="Bring your computer into the flock" description="The first connection will be established by a local agent that you install and control."/>
                <div className="step-list">
                  <div className="step-row"><span className="step-number">01</span><div><strong>Install the local agent</strong><p>A signed Windows app will run on your own computer. The installer is not available yet.</p></div><Tag>Planned</Tag></div>
                  <div className="step-row"><span className="step-number">02</span><div><strong>Pair this workspace</strong><p>Approve a one-time pairing request instead of opening inbound remote-access ports.</p></div><Tag>Planned</Tag></div>
                  <div className="step-row"><span className="step-number">03</span><div><strong>Connect an AI client</strong><p>Use an MCP-compatible client with a scoped token and the permissions you choose.</p></div><Tag>Planned</Tag></div>
                </div>
                <button className="button button-outline" onClick={() => setConnectOpen(true)}>View connection steps <ArrowRight size={15}/></button>
              </section>
              <section className="panel activity-panel">
                <div className="panel-heading"><div><div className="eyebrow">LIVE ACTIVITY</div><h3>Recent activity</h3></div><button className="icon-btn" aria-label="Refresh activity" onClick={() => notify("Activity refreshed. No events recorded.")}><RefreshCw size={15}/></button></div>
                <div className="empty-activity"><div className="empty-icon"><Activity size={20}/></div><strong>Quiet in here. Just how it should be.</strong><p>When a device is paired, task starts, approvals, and completed actions will appear here.</p></div>
                <div className="activity-footer"><span><span className="status-dot"/> Activity log is empty</span><button onClick={() => go("Tasks")}>View tasks <ArrowRight size={13}/></button></div>
              </section>
            </div>
          </>}

          {active === "Devices" && <div className="workspace-view">
            <SectionTitle eyebrow="YOUR MACHINES" title="Devices" description="Computers you have explicitly paired with this workspace." action={<button className="button button-gold" onClick={() => setConnectOpen(true)}><Plus size={15}/> Pair a device</button>}/>
            <div className="notice-strip"><LockKeyhole size={17}/><div><strong>No public remote desktop ports required.</strong><p>The planned local agent will initiate an encrypted outbound connection. No computer is connected in this prototype.</p></div></div>
            <div className="empty-large"><div className="empty-icon empty-icon-large"><Laptop size={26}/></div><h3>No computers connected</h3><p>Once the local agent is ready, pair your Windows computer here. You'll be able to review permissions, connection status, and revoke access.</p><button className="button button-gold" onClick={() => setConnectOpen(true)}><Plus size={15}/> Start pairing</button><span className="muted-note">Windows agent and secure pairing service are not implemented yet.</span></div>
          </div>}

          {active === "Connect AI" && <div className="workspace-view">
            <SectionTitle eyebrow="CLIENT INTEGRATION" title="Connect your AI" description="MeepSheep is designed around MCP, an open protocol for connecting AI clients to tools."/>
            <div className="notice-strip"><Network size={17}/><div><strong>MCP endpoint not live yet</strong><p>This is a setup preview. There is no hosted endpoint or working authentication token to connect today.</p></div></div>
            <div className="integration-grid">
              <article className="integration-card"><div className="integration-icon"><Code2 size={20}/></div><Tag tone="gold">PLANNED</Tag><h3>MCP connection</h3><p>A hosted MCP service will route approved requests to your paired local agent. It will require account authentication and scoped access.</p><button className="button button-outline" onClick={() => copyText(mcpExample, "Example configuration")}><Copy size={14}/> Copy example config</button></article>
              <article className="integration-card"><div className="integration-icon"><Terminal size={20}/></div><Tag>NOT AVAILABLE</Tag><h3>Local agent</h3><p>The Windows agent will handle screen capture, mouse and keyboard input, and explicitly allowed commands on your device.</p><button className="button button-outline" onClick={() => setConnectOpen(true)}>See setup status <ArrowRight size={14}/></button></article>
              <article className="integration-card"><div className="integration-icon"><Fingerprint size={20}/></div><Tag>PLANNED</Tag><h3>Scoped credentials</h3><p>Separate revocable tokens and per-device permissions will help keep one client from inheriting unnecessary access.</p><button className="button button-outline" onClick={() => go("Security")}>Review safeguards <ArrowRight size={14}/></button></article>
            </div>
            <div className="code-panel"><div className="code-panel-head"><span><Code2 size={15}/> Example MCP client config</span><button className="icon-btn" onClick={() => copyText(mcpExample, "Example configuration")} aria-label="Copy example configuration"><Copy size={15}/></button></div><pre>{mcpExample}</pre><p><ShieldCheck size={14}/> Placeholder host and token only. Do not paste this into a client expecting it to connect.</p></div>
          </div>}

          {active === "Tasks" && <div className="workspace-view">
            <SectionTitle eyebrow="TASK CONTROL" title="Tasks & activity" description="Review work requests, approval gates, and outcomes from connected computers." action={<button className="button button-outline" onClick={() => notify("There are no tasks to refresh")}><RefreshCw size={14}/> Refresh</button>}/>
            <div className="task-summary"><div><span>RUNNING</span><strong>0</strong></div><div><span>AWAITING APPROVAL</span><strong>0</strong></div><div><span>COMPLETED</span><strong>0</strong></div><div><span>FAILED</span><strong>0</strong></div></div>
            <div className="empty-large"><div className="empty-icon empty-icon-large"><Activity size={26}/></div><h3>No tasks have run</h3><p>Task history will appear after a computer is paired and an AI client submits an authorized request.</p><span className="muted-note">No actions are running in the background.</span></div>
          </div>}

          {active === "Plan & usage" && <div className="workspace-view">
            <SectionTitle eyebrow="PLANS & METERING" title="Plan & usage" description="A transparent allowance with upgrades when you need more computer time."/>
            <div className="plan-card"><div className="plan-top"><div><Tag tone="gold">PROTOTYPE</Tag><h3>Free workspace</h3><p>Designed to make it easy to try MeepSheep before paying.</p></div><div className="plan-price">$0 <small>/ month</small></div></div><div className="plan-divider"/><div className="plan-usage"><div><span>Usage tracked</span><strong>Not connected</strong></div><div><span>Allowance remaining</span><strong>Not available yet</strong></div><div><span>Billing status</span><strong>No billing configured</strong></div></div><button className="button button-outline" onClick={() => notify("Plans will be announced after real usage costs are measured")}>Plan details <ArrowRight size={14}/></button></div>
            <div className="notice-strip"><WalletCards size={17}/><div><strong>No fake counters or surprise charges.</strong><p>Quotas, billing, and abuse prevention will be built against actual service costs before any paid plan is offered.</p></div></div>
          </div>}

          {active === "Security" && <div className="workspace-view">
            <SectionTitle eyebrow="PERMISSIONS & SAFETY" title="Security center" description="The model can request actions. It must never be the authority that grants itself access."/>
            <div className="security-banner"><div className="security-banner-icon"><ShieldCheck size={24}/></div><div><h3>Security defaults</h3><p>These controls preview the intended policy. They do not enforce permissions on a real computer until the local agent and backend exist.</p></div><Tag tone="gold">Preview</Tag></div>
            <div className="settings-list">
              <div className="setting-row"><div className="setting-icon"><Shield size={18}/></div><div className="setting-copy"><strong>Require approval for sensitive actions</strong><p>File deletion, software installation, firewall changes, and other high-impact actions should require explicit confirmation.</p></div><button className={"toggle " + (approvalRequired ? "toggle-on" : "")} role="switch" aria-checked={approvalRequired} aria-label="Require approval for sensitive actions" onClick={() => { setApprovalRequired(!approvalRequired); notify("Preview preference changed. Enforcement is not active."); }}><span/></button></div>
              <div className="setting-row"><div className="setting-icon"><Terminal size={18}/></div><div className="setting-copy"><strong>Least-privilege command access</strong><p>Terminal execution should be limited by policy and never receive administrator rights by default.</p></div><Tag tone="green">Design rule</Tag></div>
              <div className="setting-row"><div className="setting-icon"><FileClock size={18}/></div><div className="setting-copy"><strong>Auditable task history</strong><p>Record who requested each action, which device ran it, approval decisions, and the outcome.</p></div><Tag>Planned</Tag></div>
              <div className="setting-row"><div className="setting-icon"><Unplug size={18}/></div><div className="setting-copy"><strong>Revoke a device or client</strong><p>Disconnect access from the server and local agent, with credentials that can be rotated.</p></div><Tag>Planned</Tag></div>
              <div className="setting-row"><div className="setting-icon"><Power size={18}/></div><div className="setting-copy"><strong>Emergency stop</strong><p>Stop new commands and interrupt active sessions once the agent supports safe cancellation.</p></div><button className={"button " + (emergencyStopped ? "button-danger" : "button-outline")} onClick={() => { setEmergencyStopped(!emergencyStopped); notify("Prototype switch only. No computer sessions exist to stop."); }}>{emergencyStopped ? "Stop requested (preview)" : "Preview stop control"}</button></div>
            </div>
            <p className="muted-note security-note"><LockKeyhole size={14}/> Settings shown here are prototype preferences, not active device protections.</p>
          </div>}
        </div>

        <footer className="page-footer"><span>© 2026 MeepSheep <span className="footer-separator">·</span> Built for humans, with AI in the loop.</span><span><ShieldCheck size={13}/> Security-first by design <span className="footer-separator">·</span> <button onClick={() => go("Security")}>Security model</button></span></footer>
      </section>

      {connectOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setConnectOpen(false); }}><section className="connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-title"><div className="modal-top"><div className="modal-icon"><Monitor size={20}/></div><button className="icon-btn" aria-label="Close dialog" onClick={() => setConnectOpen(false)}><X size={18}/></button></div><Tag tone="gold">EARLY BUILD</Tag><h2 id="connect-title">Your computer is next.</h2><p className="modal-intro">The connection flow is being designed around a local Windows agent and an approval-based pairing step.</p><div className="modal-checklist"><div><span>01</span><p><strong>Agent installer</strong><small>Not built yet</small></p><Tag>Pending</Tag></div><div><span>02</span><p><strong>Secure pairing service</strong><small>Not configured yet</small></p><Tag>Pending</Tag></div><div><span>03</span><p><strong>MCP endpoint and tokens</strong><small>Not hosted yet</small></p><Tag>Pending</Tag></div></div><div className="modal-warning"><LockKeyhole size={16}/><p>Nothing will be installed, executed, or connected from this screen. We'll only offer setup commands after the agent and pairing service are implemented and verified.</p></div><button className="button button-gold button-full" onClick={() => { setConnectOpen(false); go("Connect AI"); }}>Explore AI connection preview <ArrowRight size={15}/></button></section></div>}
      {toast && <div className="toast" role="status"><Check size={16}/><span>{toast}</span><button aria-label="Dismiss message" onClick={() => setToast("")}><X size={14}/></button></div>}
    </main>
  );
}
