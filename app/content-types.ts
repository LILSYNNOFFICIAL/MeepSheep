export type Platform = "TikTok" | "Instagram" | "YouTube" | "Facebook";

export type Post = {
  id: number;
  title: string;
  platform: Platform;
  captions?: Partial<Record<Platform, string>>;
  dateISO?: string;
  time24?: string;
  status: "Scheduled" | "Draft" | "Published";
  date: string;
  time: string;
  color: string;
  kind: string;
};
