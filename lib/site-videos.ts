/**
 * Santa explainer videos, served from Vercel Blob (CDN — fast playback).
 * Re-upload via the blob dashboard or a script and swap the URLs here if needed.
 */
export interface SiteVideo {
  title: string;
  src: string;
}

const BASE = "https://9z20zvaonadxgysn.public.blob.vercel-storage.com/site-videos";

export const SITE_VIDEOS = {
  intro: {
    title: "A message from Santa",
    src: `${BASE}/Santa_tapping_glass_tablet_202606200007-U5JEiiAa0rK0fygk2Ip5SC5mr954qz.mp4`,
  },
  meter: {
    title: "How the Naughty-Nice meter works",
    src: `${BASE}/Nicholas_explains_Naughty_Nice_m..._202606200022-z9lr66a4fL0YyRrMTPIZgykSkJK2Gf.mp4`,
  },
  deeds: {
    title: "Good deeds across the community",
    src: `${BASE}/Santa_looking_at_holographic_map_202606200007-FyutPL2fOHSV53ZJ5qXMZp8ynM59CP.mp4`,
  },
  workshop: {
    title: "Scanning a toy into the workshop",
    src: `${BASE}/Nicholas_scans_toy_barcode_on_202606200022-JyHCCFLhiCZofRLrkgxomKQMRZxT5J.mp4`,
  },
  parents: {
    title: "For parents: how it all works",
    src: `${BASE}/Man_speaking_to_parents_202606200015-YpsZr0pKrhUxHOuRfdbfwBMRTtlJGa.mp4`,
  },
  magic1: {
    title: "Inside Santa's high-tech workshop",
    src: `${BASE}/Holographic_interface_merging_gi..._202606200007-KEKIyPmoDKNeESf92v4jXAYYOND4HK.mp4`,
  },
  magic2: {
    title: "Spreading holiday magic",
    src: `${BASE}/Man_shooting_orbs_at_city_202606200007-uhVlVcxwe56AkIGoawbixmmbN0lZXw.mp4`,
  },
} satisfies Record<string, SiteVideo>;
