"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight, ArrowUpRight, AudioLines, Bell, CalendarDays, Check, CheckCircle2, Copy, Download,
  ChevronDown, ChevronRight, CircleHelp, Clock3, CloudUpload, Compass, Ellipsis,
  FileVideo, Filter, Hash, Home, Instagram, LayoutGrid, Link2, Menu, MoreHorizontal,
  Music2, Plus, Search, Settings2, Sparkles, TrendingUp, Video, WandSparkles, X,
  Youtube, type LucideIcon
} from "lucide-react";

import type { Platform, Post } from "./content-types";
import { loadPosts, parsePostsBackup, savePosts } from "../lib/content-storage";

function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(date: Date, days: number) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function formatPlannerDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateStart = date.getTime();
  const dayOffset = Math.round((dateStart - todayStart) / 86400000);
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  if (dayOffset === -1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: dayOffset > 0 && dayOffset < 7 ? "short" : undefined,
    month: "short",
    day: "numeric",
    ...(year !== today.getFullYear() ? { year: "numeric" } : {})
  });
}

function dateForExistingPost(post: Post) {
  if (post.dateISO && /^\d{4}-\d{2}-\d{2}$/.test(post.dateISO)) return post.dateISO;
  const today = new Date();
  if (post.date === "Today") return localDateISO(today);
  if (post.date === "Tomorrow") return localDateISO(shiftLocalDate(today, 1));
  if (post.date === "Yesterday") return localDateISO(shiftLocalDate(today, -1));
  const parsed = new Date(`${post.date}, ${today.getFullYear()}`);
  return Number.isNaN(parsed.getTime()) ? localDateISO(today) : localDateISO(parsed);
}

const initialPosts: Post[] = [
  { id: 1, title: "Somewhere Inbetween — official visual", platform: "TikTok", status: "Scheduled", date: "Today", time: "6:30 PM", color: "lavender", kind: "Music video" },
  { id: 2, title: "Studio moment: building the drop", platform: "Instagram", status: "Draft", date: "Tomorrow", time: "11:00 AM", color: "peach", kind: "Behind the scenes" },
  { id: 3, title: "Black Glass (acoustic) — chorus", platform: "YouTube", status: "Scheduled", date: "Fri, Oct 16", time: "4:00 PM", color: "blue", kind: "Short" },
  { id: 4, title: "New music, same strange little universe", platform: "Facebook", status: "Published", date: "Yesterday", time: "7:12 PM", color: "sage", kind: "Artist update" }
];

const navGroups: { label: string; items: { label: string; icon: LucideIcon; badge?: string }[] }[] = [
  { label: "WORKSPACE", items: [{ label: "Overview", icon: Home }, { label: "Content planner", icon: CalendarDays }, { label: "Content library", icon: LayoutGrid }, { label: "Studio", icon: WandSparkles, badge: "New" }] },
  { label: "GROW", items: [{ label: "Analytics", icon: TrendingUp }, { label: "Discover", icon: Compass }, { label: "Hashtag lab", icon: Hash }] },
  { label: "MANAGE", items: [{ label: "Connected accounts", icon: Link2 }, { label: "Settings guide", icon: Settings2 }] }
];

function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  if (platform === "Instagram") return <Instagram size={size} />;
  if (platform === "YouTube") return <Youtube size={size} />;
  if (platform === "Facebook") return <span className="facebook-mark" style={{ fontSize: size + 1 }}>f</span>;
  return <span className="tiktok-mark" style={{ fontSize: size - 1 }}>♪</span>;
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span className="brand-ear left" /><span className="brand-ear right" /><span className="brand-face"><span /><span /></span></div>;
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}

export default function HomePage() {
  const [active, setActive] = useState("Overview");
  const [profileMenu, setProfileMenu] = useState(false);
  const [createMenu, setCreateMenu] = useState(false);
  const [filterMenu, setFilterMenu] = useState(false);
  const [filter, setFilter] = useState("All content");
  const [platformFilter, setPlatformFilter] = useState("All platforms");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [toast, setToast] = useState("");
  const [posts, setPosts] = useState(initialPosts);
  const postsRef = useRef(posts);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [canPersistPosts, setCanPersistPosts] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [postTitle, setPostTitle] = useState("");
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [postPlatform, setPostPlatform] = useState<Platform>("TikTok");
  const [postKind, setPostKind] = useState("Short video");
  const [postStatus, setPostStatus] = useState<Post["status"]>("Draft");
  const [postCaptions, setPostCaptions] = useState<Record<Platform, string>>({ TikTok: "", Instagram: "", YouTube: "", Facebook: "" });
  const [postDate, setPostDate] = useState("2026-10-16");
  const [postTime, setPostTime] = useState("18:30");
  const [mobileNav, setMobileNav] = useState(false);
  const [todayLabel, setTodayLabel] = useState("");
  const [hashtagTopic, setHashtagTopic] = useState("");
  const [hashtagPlatform, setHashtagPlatform] = useState<Platform>("TikTok");
  const [hashtagTags, setHashtagTags] = useState<string[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect -- These effects synchronize browser-only clock and storage state after hydration. */
  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase());
  }, []);

  useEffect(() => {
    const result = loadPosts();
    if (result.posts) setPosts(result.posts);
    setCanPersistPosts(result.canWrite);
    setPostsLoaded(true);
  }, []);

  useEffect(() => {
    // Keep the latest value available to storage-event handlers before they compare incoming data.
    postsRef.current = posts;
    if (!postsLoaded || !canPersistPosts) return;
    const saved = savePosts(posts);
    if (!saved) setCanPersistPosts(false);
  }, [posts, postsLoaded, canPersistPosts]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== "meepsheep.posts.v2" && event.key !== "meepsheep.posts.v1") return;
      const result = loadPosts();
      if (result.posts && JSON.stringify(result.posts) !== JSON.stringify(postsRef.current)) {
        // Avoid re-saving identical content in response to another tab's storage event.
        postsRef.current = result.posts;
        setPosts(result.posts);
      }
      setCanPersistPosts(result.canWrite);
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  const filteredPosts = useMemo(() => posts.filter(post => {
    const matchesFilter = filter === "All content" || post.status === filter;
    const matchesPlatform = platformFilter === "All platforms" || post.platform === platformFilter;
    const matchesQuery = !query || (post.title + post.platform + post.kind + Object.values(post.captions ?? {}).join(" ")).toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesPlatform && matchesQuery;
  }), [posts, filter, platformFilter, query]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const savePost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!postTitle.trim()) return;
    const formattedDate = formatPlannerDate(postDate);
    const formattedTime = new Date("2020-01-01T" + postTime + ":00").toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const savedPost: Post = { id: editingPostId ?? Date.now(), title: postTitle.trim(), platform: postPlatform, captions: postCaptions, dateISO: postDate, time24: postTime, status: postStatus, date: formattedDate, time: formattedTime, color: "lavender", kind: postKind };
    setPosts(current => editingPostId === null ? [savedPost, ...current] : current.map(post => post.id === editingPostId ? { ...post, ...savedPost } : post));
    setEditingPostId(null);
    setPostTitle("");
    setPostCaptions({ TikTok: "", Instagram: "", YouTube: "", Facebook: "" });
    setShowComposer(false);
    setActive("Content planner");
    setFilter("All content");
    notify(editingPostId === null ? "Draft saved to your content planner" : "Draft changes saved");
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const importedPosts = parsePostsBackup(parsed);
      if (!importedPosts) {
        notify("That file is not a valid MeepSheep backup");
        return;
      }
      const confirmed = window.confirm(`Import ${importedPosts.length} items? This replaces the content currently shown in your library.`);
      if (!confirmed) return;
      setPosts(importedPosts);
      setCanPersistPosts(true);
      setPostsLoaded(true);
      notify("Backup imported into this browser");
    } catch {
      notify("Couldn't read that backup file");
    } finally {
      input.value = "";
    }
  };

  const exportPostsBackup = () => {
    const backup = {
      app: "MeepSheep",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      posts
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meepsheep-backup-${localDateISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Your content backup was exported");
  };

  const startNewPost = () => {
    setEditingPostId(null);
    setPostTitle("");
    setPostPlatform("TikTok");
    setPostKind("Short video");
    setPostStatus("Draft");
    setPostCaptions({ TikTok: "", Instagram: "", YouTube: "", Facebook: "" });
    setPostDate(localDateISO());
    setPostTime("18:30");
    setShowComposer(true);
  };

  const createDraftFromHashtags = () => {
    const captions: Record<Platform, string> = { TikTok: "", Instagram: "", YouTube: "", Facebook: "" };
    captions[hashtagPlatform] = hashtagTags.join(" ");
    setEditingPostId(null);
    setPostTitle(hashtagTopic.trim());
    setPostPlatform(hashtagPlatform);
    setPostKind("Short video");
    setPostStatus("Draft");
    setPostCaptions(captions);
    setPostDate(localDateISO());
    setPostTime("18:30");
    setActive("Content planner");
    setShowComposer(true);
    notify("Hashtags added to a new draft");
  };

  const navTo = (label: string) => {
    setActive(label);
    setMobileNav(false);
    if (label !== "Overview") notify(label + " workspace selected");
  };

  return (
    <main className="app-shell">
      <aside className={"sidebar " + (mobileNav ? "sidebar-open" : "")}>
        <div className="brand-row"><BrandMark /><span className="brand-name">meep<span>sheep</span></span><button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
        <button className="workspace-switch" onClick={() => setProfileMenu(!profileMenu)} aria-expanded={profileMenu}>
          <div className="workspace-avatar">M</div><div className="workspace-copy"><strong>My workspace</strong><span>Creator plan · Free</span></div><ChevronDown size={15} className={profileMenu ? "rotate" : ""}/>
        </button>
        {profileMenu && <div className="workspace-popover"><button onClick={() => { setProfileMenu(false); notify("Workspace settings are coming soon"); }}><Settings2 size={15}/> Workspace settings</button><button onClick={() => { setProfileMenu(false); notify("Plan management will be available soon"); }}><Sparkles size={15}/> Explore plans</button></div>}
        <div className="sidebar-scroll">{navGroups.map(group => <div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(item => <button key={item.label} className={"nav-item " + (active === item.label ? "active" : "")} onClick={() => navTo(item.label)}><item.icon size={17} strokeWidth={1.8}/><span>{item.label}</span>{item.badge && <span className="new-badge">{item.badge}</span>}</button>)}</div>)}</div>
        <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17}/></div><strong>A little more room?</strong><p>Make space for your next big idea.</p><button onClick={() => notify("Plans and pricing are coming soon")}>Explore plans <ArrowRight size={14}/></button><div className="upgrade-sparkle sparkle-one">✳</div><div className="upgrade-sparkle sparkle-two">✳</div></div><button className="help-link" onClick={() => notify("Help center is being prepared")}><CircleHelp size={16}/> Help & getting started <ArrowUpRight size={13}/></button><div className="profile-row"><div className="profile-photo">LS</div><div className="profile-info"><strong>LIL SYNN</strong><span>Artist workspace</span></div><button className="icon-button" aria-label="Account options" onClick={() => setProfileMenu(!profileMenu)}><Ellipsis size={19}/></button></div></div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}

      <section className="main-area">
        <header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><span>Workspace</span><ChevronRight size={14}/><strong>{active}</strong></div><div className="topbar-actions">{searchOpen && <input autoFocus className="search-input" placeholder="Search your content..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if(e.key === "Escape") { setSearchOpen(false); setQuery(""); }}}/>}<button className="icon-button" aria-label="Search content" onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setQuery(""); }}><Search size={18}/></button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify("You're all caught up")}><Bell size={18}/><i/></button><div className="top-avatar">LS</div></div></header>

        <div className="page-content">
          {postsLoaded && !canPersistPosts && <div className="storage-warning" role="status"><CircleHelp size={17}/><span><strong>Local saving is paused.</strong> Browser storage is unavailable or contains data this version cannot safely read. Existing saved data will not be overwritten.</span></div>}
          <div className="welcome-row"><div><div className="date-kicker"><span className="live-dot"/> {todayLabel || "YOUR CREATIVE DAY"}</div><h1>{active === "Overview" ? <>Good things are <span>in motion.</span></> : active}</h1><p className="welcome-subtitle">{active === "Overview" ? "Your creative world, a little more in sync." : active === "Content planner" ? "Everything you want to share, all in one place." : "A calmer way to keep your creative work moving."}</p></div><div className="welcome-actions"><button className="button button-secondary" onClick={() => notify("Choose a video from your library to get started")}><CloudUpload size={16}/> Upload content</button><div className="dropdown-anchor"><button className="button button-primary" onClick={() => setCreateMenu(!createMenu)} aria-expanded={createMenu}><Plus size={17}/> Create new <ChevronDown size={15}/></button>{createMenu && <div className="dropdown-menu create-dropdown"><button onClick={() => { setCreateMenu(false); startNewPost(); }}><FileVideo size={16}/><span><strong>Social post</strong><small>Prepare a post for your channels</small></span></button><button onClick={() => { setCreateMenu(false); navTo("Studio"); notify("Studio tools are being built"); }}><WandSparkles size={16}/><span><strong>Studio project</strong><small>Make something worth sharing</small></span></button><button onClick={() => { setCreateMenu(false); navTo("Content planner"); }}><CalendarDays size={16}/><span><strong>Plan content</strong><small>Organize your publishing calendar</small></span></button></div>}</div></div></div>

          {(active === "Overview" || active === "Content planner") ? <>
          <div className="integration-banner"><div className="integration-illustration"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit-center"><BrandMark/></div><div className="orbit-dot dot-tiktok">♪</div><div className="orbit-dot dot-insta"><Instagram size={13}/></div><div className="orbit-dot dot-youtube"><Youtube size={14}/></div></div><div className="integration-copy"><div className="banner-label"><span className="banner-label-dot"/> YOUR CREATOR HOME BASE</div><h2>One place for all your <em>good stuff.</em></h2><p>Bring your channels together, shape each post for its platform, and spend less time in settings menus.</p><div className="banner-actions"><button className="button button-dark" onClick={() => navTo("Connected accounts")}>Connect your channels <ArrowRight size={15}/></button><button className="text-button" onClick={() => navTo("Settings guide")}>See how it works <ArrowUpRight size={14}/></button></div></div><div className="banner-decoration">✳</div></div>

          <div className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Content in your library</span><span className="stat-icon icon-lavender"><LayoutGrid size={17}/></span></div><div className="stat-value">{String(posts.length).padStart(2,"0")}<span className="stat-unit"> pieces</span></div><div className="stat-foot"><span className="stat-neutral"><FileVideo size={13}/> Your creative queue</span></div></div><div className="stat-card"><div className="stat-top"><span>Coming up next</span><span className="stat-icon icon-peach"><Clock3 size={17}/></span></div><div className="stat-value">{posts.filter(p => p.status === "Scheduled").length}<span className="stat-unit"> scheduled</span></div><div className="stat-foot"><span className="stat-neutral"><CalendarDays size={13}/> Across your channels</span></div></div><div className="stat-card"><div className="stat-top"><span>Channels connected</span><span className="stat-icon icon-sage"><Link2 size={17}/></span></div><div className="stat-value">0<span className="stat-unit"> of 4</span></div><div className="stat-foot"><button className="inline-link" onClick={() => navTo("Connected accounts")}>Set up your first <ArrowRight size={13}/></button></div></div><div className="stat-card stat-card-note"><div className="stat-top"><span>A little nudge</span><span className="stat-icon icon-yellow"><Sparkles size={17}/></span></div><div className="note-copy">Your next post is a chance to <span>show up.</span></div><button className="inline-link" onClick={startNewPost}>Let&apos;s make one <ArrowRight size={13}/></button></div></div>

          <div className="content-grid"><section className="panel planner-panel"><SectionHeading eyebrow="KEEP THE GOOD STUFF MOVING" title="Your content planner" detail="A little plan goes a long way." action={<button className="icon-button" aria-label="More planner options" onClick={() => setFilterMenu(!filterMenu)}><MoreHorizontal size={20}/></button>}/><div className="planner-toolbar"><div className="filter-tabs">{["All content","Scheduled","Draft","Published"].map(option => <button key={option} className={filter === option ? "filter-tab selected" : "filter-tab"} onClick={() => setFilter(option)}>{option}</button>)}</div><div className="dropdown-anchor"><button className="filter-button" onClick={() => setFilterMenu(!filterMenu)}><Filter size={14}/><span>Filter</span><ChevronDown size={13}/></button>{filterMenu && <div className="dropdown-menu filter-dropdown"><div className="filter-group-label">STATUS</div>{["All content","Scheduled","Draft","Published"].map(option => <button key={option} onClick={() => setFilter(option)}><span>{option}</span>{filter === option && <Check size={15}/>}</button>)}<div className="filter-group-label filter-group-separated">PLATFORM</div>{["All platforms","TikTok","Instagram","YouTube","Facebook"].map(option => <button key={option} onClick={() => { setPlatformFilter(option); setFilterMenu(false); }}><span>{option}</span>{platformFilter === option && <Check size={15}/>}</button>)}</div>}</div></div><div className="post-list">{filteredPosts.length ? filteredPosts.map(post => <article className="post-row" key={post.id}><div className={"post-thumb thumb-" + post.color}>{post.kind === "Music video" ? <AudioLines size={22}/> : post.kind === "Short" ? <Video size={21}/> : post.kind === "Artist update" ? <Music2 size={21}/> : <Sparkles size={21}/>}<span className="thumb-platform"><PlatformIcon platform={post.platform} size={12}/></span></div><div className="post-details"><strong>{post.title}</strong><span>{post.kind} <i/> {post.platform}</span>{post.captions && Object.values(post.captions).some(caption => caption?.trim()) && <small className="caption-count">{Object.values(post.captions).filter(caption => caption?.trim()).length} platform caption{Object.values(post.captions).filter(caption => caption?.trim()).length === 1 ? "" : "s"} saved</small>}</div><div className="post-schedule"><span>{post.date}</span><small>{post.time}</small></div><span className={"status-pill status-" + post.status.toLowerCase()}><i/>{post.status}</span><button className="icon-button post-more" aria-label={"Options for " + post.title} onClick={() => { setEditingPostId(post.id); setPostTitle(post.title); setPostPlatform(post.platform); setPostKind(post.kind); setPostStatus(post.status); setPostCaptions({ TikTok: post.captions?.TikTok ?? "", Instagram: post.captions?.Instagram ?? "", YouTube: post.captions?.YouTube ?? "", Facebook: post.captions?.Facebook ?? "" }); setPostDate(dateForExistingPost(post)); setPostTime(post.time24 ?? "18:30"); setShowComposer(true); }}><Ellipsis size={18}/></button></article>) : <div className="empty-state"><div className="empty-icon"><Search size={20}/></div><strong>Nothing here just yet</strong><span>Try another filter or create a new post.</span><button className="button button-secondary" onClick={() => { setFilter("All content"); setPlatformFilter("All platforms"); setQuery(""); }}>Show all content</button></div>}</div><div className="panel-footer"><span>Showing {filteredPosts.length} of {posts.length} items</span><button className="text-button" onClick={() => navTo("Content planner")}>Open planner <ArrowRight size={14}/></button></div></section>

          <div className="right-column"><section className="panel channels-panel"><SectionHeading title="Your channels" detail="Your people are out there." action={<button className="icon-button" aria-label="Channel options" onClick={() => navTo("Connected accounts")}><ArrowUpRight size={17}/></button>}/><div className="channel-list">{([{ name: "TikTok", sub: "Short-form video", icon: PlatformIcon, className: "channel-tiktok" }, { name: "Instagram", sub: "Reels & posts", icon: PlatformIcon, className: "channel-instagram" }, { name: "YouTube", sub: "Shorts & videos", icon: PlatformIcon, className: "channel-youtube" }, { name: "Facebook", sub: "Pages & Reels", icon: PlatformIcon, className: "channel-facebook" }] as const).map(channel => <button className="channel-row" key={channel.name} onClick={() => { navTo("Connected accounts"); notify(channel.name + " connection setup selected"); }}><span className={"channel-icon " + channel.className}><PlatformIcon platform={channel.name} size={17}/></span><span className="channel-copy"><strong>{channel.name}</strong><small>{channel.sub}</small></span><span className="connect-label">Connect</span><ChevronRight size={15} className="channel-chevron"/></button>)}</div><button className="button button-secondary button-full" onClick={() => navTo("Connected accounts")}>Manage channels <ArrowRight size={15}/></button><p className="microcopy"><CheckCircle2 size={13}/> Your credentials stay private and secure.</p></section>
          <section className="tip-card"><div className="tip-icon"><Sparkles size={17}/></div><div className="tip-eyebrow">A SMALL CREATOR TIP</div><h3>Make it feel native.</h3><p>A caption that sounds right on TikTok might need a different rhythm on YouTube. We&apos;ll help you tailor it without losing your voice.</p><button onClick={() => navTo("Discover")}>Explore ideas <ArrowRight size={14}/></button><div className="tip-flower">✳</div></section></div></div>

          </> : <section className="workspace-view"><div className="feature-page">
            {active === "Connected accounts" && <><SectionHeading title="Connected accounts" detail="Connect your creator channels when official account authorization is ready."/><div className="feature-grid platform-grid">{(["TikTok","Instagram","YouTube","Facebook"] as Platform[]).map(platform => <article className="feature-card" key={platform}><span className={"channel-icon channel-"+platform.toLowerCase()}><PlatformIcon platform={platform}/></span><h3>{platform}</h3><p>Account connection is not configured yet.</p><button className="button button-secondary" onClick={()=>notify(platform+" connection setup is coming soon.")}>Connect <ArrowRight size={14}/></button></article>)}</div></>}
            {active === "Content library" && <><SectionHeading title="Content library" detail="Browse your saved ideas, revisit drafts, and keep your content organized." action={<div className="heading-actions"><input ref={importInputRef} className="backup-file-input" type="file" accept="application/json,.json" onChange={handleImportBackup} aria-label="Import MeepSheep backup"/><button className="button button-secondary" onClick={() => importInputRef.current?.click()}><CloudUpload size={15}/> Import backup</button><button className="button button-secondary" onClick={exportPostsBackup}><Download size={15}/> Export backup</button><button className="button button-primary" onClick={startNewPost}><Plus size={15}/> New draft</button></div>}/><div className="library-list">{filteredPosts.length ? filteredPosts.map(post => <article className="library-row" key={post.id}><div className={"post-thumb thumb-" + post.color}>{post.kind === "Music video" ? <AudioLines size={22}/> : post.kind === "Short" ? <Video size={21}/> : post.kind === "Artist update" ? <Music2 size={21}/> : <Sparkles size={21}/>}<span className="thumb-platform"><PlatformIcon platform={post.platform} size={12}/></span></div><div className="post-details"><strong>{post.title}</strong><span>{post.kind} <i/> {post.platform}</span><small>{post.date} · {post.time} · {post.status}</small></div><button className="button button-secondary" onClick={() => { setEditingPostId(post.id); setPostTitle(post.title); setPostPlatform(post.platform); setPostKind(post.kind); setPostStatus(post.status); setPostCaptions({ TikTok: post.captions?.TikTok ?? "", Instagram: post.captions?.Instagram ?? "", YouTube: post.captions?.YouTube ?? "", Facebook: post.captions?.Facebook ?? "" }); setPostDate(dateForExistingPost(post)); setPostTime(post.time24 ?? "18:30"); setShowComposer(true); }}>Edit</button><button className="button button-secondary" onClick={() => { const duplicate: Post = { ...post, id: Date.now(), title: post.title + " (copy)", captions: { ...(post.captions ?? {}) }, status: "Draft", dateISO: localDateISO(), date: formatPlannerDate(localDateISO()), time24: "18:30", time: "6:30 PM" }; setPosts(current => [duplicate, ...current]); setFilter("All content"); notify("A copy was added as a new draft"); }}>Duplicate</button><button className="button button-secondary" onClick={() => { if (window.confirm("Delete “" + post.title + "” from your local content library?")) { setPosts(current => current.filter(item => item.id !== post.id)); notify("Content removed from your library"); } }}>Delete</button></article>) : <div className="empty-state"><div className="empty-icon"><Search size={20}/></div><strong>Your library is clear</strong><span>Create a draft to start collecting your content here.</span><button className="button button-secondary" onClick={startNewPost}>Create a draft</button></div>}</div><p className="fine-print">Your library is stored in this browser on this device for now. It is not synced to an account or cloud database.</p></>}
            {active === "Hashtag lab" && <><SectionHeading title="Hashtag lab" detail="Build a relevant hashtag set around your next post."/><form className="hashtag-form" onSubmit={e => { e.preventDefault(); const words = hashtagTopic.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2); const unique = Array.from(new Set(words)).slice(0, 4); const core = unique.map(word => "#" + word); const general = hashtagPlatform === "TikTok" ? ["#CreatorTok", "#BehindTheScenes", "#NewContent"] : hashtagPlatform === "Instagram" ? ["#Reels", "#CreatorCommunity", "#BehindTheScenes"] : hashtagPlatform === "YouTube" ? ["#Shorts", "#YouTubeCreator", "#NewVideo"] : ["#CreatorCommunity", "#VideoContent", "#BehindTheScenes"]; setHashtagTags(Array.from(new Set([...core, ...general])).slice(0, 7)); }}><label className="field-label" htmlFor="hashtag-topic">What&apos;s your post about?</label><input id="hashtag-topic" value={hashtagTopic} onChange={e=>setHashtagTopic(e.target.value)} placeholder="e.g. new music, studio process, acoustic cover" required/><label className="field-label" htmlFor="hashtag-platform">Where are you posting?</label><select id="hashtag-platform" value={hashtagPlatform} onChange={e=>setHashtagPlatform(e.target.value as Platform)}>{(["TikTok","Instagram","YouTube","Facebook"] as Platform[]).map(p=><option key={p}>{p}</option>)}</select><button type="submit" className="button button-primary"><Hash size={15}/> Suggest hashtags</button></form>{hashtagTags.length > 0 && <section className="panel hashtag-results"><div className="section-heading"><div><h2>Your hashtag set</h2><p>Suggestions based on your topic and platform.</p></div><button className="button button-secondary" onClick={async()=>{try { await navigator.clipboard.writeText(hashtagTags.join(" ")); notify("Hashtags copied to clipboard"); } catch { notify("Clipboard access isn't available in this browser"); }}}><Copy size={14}/> Copy all</button><button type="button" className="button button-primary" onClick={createDraftFromHashtags}><Plus size={14}/> Use in a draft</button></div><div className="hashtag-chips">{hashtagTags.map(tag=><button type="button" className="hashtag-chip" key={tag} onClick={async()=>{try { await navigator.clipboard.writeText(tag); notify(tag+" copied"); } catch { notify("Clipboard access isn't available in this browser"); }}}>{tag}</button>)}</div><p className="fine-print">These are idea-based suggestions, not live trend data. Check each platform&apos;s current policies and search results before posting.</p></section>}</>}
            {active !== "Connected accounts" && active !== "Hashtag lab" && active !== "Content library" && <><SectionHeading title={active} detail="This part of your creator workspace is taking shape."/><div className="notice-card"><Sparkles size={20}/><div><strong>Built in stages, with real integrations.</strong><p>This workspace will connect to supported platform APIs rather than simulate live account data.</p></div></div><button className="button button-primary" onClick={()=>active==="Content library"?setShowComposer(true):notify(active+" tools are still being built.")}>{active==="Content library"?"Create a draft":"Explore "+active} <ArrowRight size={14}/></button></>}
          </div></section>}
          <footer className="page-footer"><span>Made for people who make things. <span className="footer-heart">♥</span></span><span><button onClick={() => notify("Privacy information will be published before launch")}>Privacy</button><button onClick={() => notify("Terms will be published before launch")}>Terms</button><button onClick={() => notify("MeepSheep is in early development")}>Early access <span className="footer-dot"/></button></span></footer>
        </div>
      </section>

      {showComposer && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if(e.target === e.currentTarget) { setShowComposer(false); setEditingPostId(null); } }}><section className="composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title"><div className="modal-header"><div><div className="eyebrow">MAKE SOMETHING GOOD</div><h2 id="composer-title">{editingPostId === null ? "Create a post" : "Edit draft"}</h2><p>Start with one idea. We&apos;ll help it find its people.</p></div><button className="icon-button" aria-label="Close composer" onClick={() => { setShowComposer(false); setEditingPostId(null); }}><X size={19}/></button></div><form onSubmit={savePost}><label className="field-label" htmlFor="post-title">What are we sharing?</label><textarea id="post-title" placeholder="Give this post a name or jot down the idea..." value={postTitle} onChange={e => setPostTitle(e.target.value)} required rows={3}/><div className="form-row"><div className="form-field"><label className="field-label" htmlFor="post-platform">First platform</label><div className="select-wrap"><select id="post-platform" value={postPlatform} onChange={e => setPostPlatform(e.target.value as Platform)}>{(["TikTok","Instagram","YouTube","Facebook"] as Platform[]).map(p => <option key={p}>{p}</option>)}</select><ChevronDown size={15}/></div></div><div className="form-field"><label className="field-label" htmlFor="post-kind">Content type</label><div className="select-wrap"><select id="post-kind" value={postKind} onChange={e => setPostKind(e.target.value)}>{["Short video","Music video","Behind the scenes","Artist update","Tutorial"].map(k => <option key={k}>{k}</option>)}</select><ChevronDown size={15}/></div></div></div><div className="caption-customizer"><div className="caption-customizer-heading"><strong>Platform-specific captions</strong><span>Optional · tailor the wording for each channel</span></div>{(["TikTok","Instagram","YouTube","Facebook"] as Platform[]).map(platform => <div className="caption-platform-field" key={platform}><label className="field-label" htmlFor={"caption-"+platform}><PlatformIcon platform={platform} size={14}/> {platform}</label><textarea id={"caption-"+platform} value={postCaptions[platform]} onChange={e=>setPostCaptions(current=>({...current,[platform]:e.target.value}))} placeholder={"Write a caption for "+platform+"..."} rows={2}/><div className="caption-character-count">{postCaptions[platform].length} characters</div></div>)}</div><div className="form-row"><div className="form-field"><label className="field-label" htmlFor="post-status">Planning status</label><div className="select-wrap"><select id="post-status" value={postStatus} onChange={e => setPostStatus(e.target.value as Post["status"])}><option value="Draft">Draft</option><option value="Scheduled">Scheduled</option><option value="Published">Published</option></select><ChevronDown size={15}/></div></div><div className="form-field"><label className="field-label" htmlFor="post-date">Planned date</label><input id="post-date" type="date" value={postDate} onChange={e => setPostDate(e.target.value)} required/></div><div className="form-field"><label className="field-label" htmlFor="post-time">Planned time</label><input id="post-time" type="time" value={postTime} onChange={e => setPostTime(e.target.value)} required/></div></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => { setShowComposer(false); setEditingPostId(null); }}>Cancel</button><button type="submit" className="button button-primary"><Check size={16}/> {editingPostId === null ? "Save " + postStatus.toLowerCase() : "Save changes"}</button></div><p className="modal-note"><Clock3 size={13}/> This saves your planning status locally only. It does not publish or schedule anything on a social platform.</p></form></section></div>}

      {toast && <div className="toast" role="status"><CheckCircle2 size={17}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={15}/></button></div>}
    </main>
  );
}