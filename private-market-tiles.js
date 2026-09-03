// Data only. Rendering / tabs / modal all live in tiles-controller.js
//
// Each tile: { title, summary, body: [ ...items... ] }
// The modal renders body items IN ORDER, so you can interleave text and media:
//   - "some text"                      -> a paragraph
//   - { text: "some text" }            -> a paragraph (same thing, explicit form)
//   - { type: "image", src, alt, caption }
//   - { type: "video", src, poster, caption, autoplay, loop }
//   - { type: "embed", src, caption }  -> YouTube / Vimeo link
// `type` is auto-detected from the URL if omitted (.mp4/.webm -> video,
// youtube/vimeo -> embed, otherwise image). `caption` shows a small line
// beneath the media. A bare URL string in body is treated as TEXT, not media —
// media items must be objects.
window.ELV_registerTileSet("private-market", "Private Markets", [
  { title: "Understanding the Opportunity", summary: "Why private markets have become a core building block in modern portfolios.",
    body: ["Private markets — private equity, private credit, real estate, and infrastructure — give investors exposure to companies and assets that never trade on public exchanges.",
           { type: "image", src: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80", alt: "Skyline", caption: "Example image — replace with your own." },
           "As more of the economy stays private for longer, advisors who understand this space can offer clients a broader, more diversified opportunity set.",
           { type: "embed", src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", caption: "Example video — replace with your own." },
           "As more of the economy stays private for longer, advisors who understand this space can offer clients a broader,",
           "As more of the economy stays private for longer, advisors who understand this space can offer clients a broader,"] },
  { title: "Diversification Beyond Stocks and Bonds", summary: "How private allocations can smooth returns and reduce correlation to public markets.",
    body: ["Private assets often behave differently than public stocks and bonds, which can help dampen overall portfolio volatility.",
           "That said, they come with trade-offs — including reduced liquidity — that need to be weighed against the diversification benefit."] },
  { title: "Talking to Clients About Illiquidity", summary: "Framing the liquidity trade-off in terms clients actually understand.",
    body: ["Private investments typically lock up capital for years, which can be unfamiliar territory for clients used to daily liquidity.",
           "Clear, plain-language conversations about time horizon and access to capital are essential before any allocation is made."] },
  { title: "Manager Selection Matters", summary: "Why the dispersion between top and bottom private markets managers is so wide.",
    body: ["Unlike public index investing, the gap in performance between skilled and unskilled private markets managers can be substantial.",
           "Track record, sourcing capability, and operational expertise all become critical parts of due diligence."] },
  { title: "Building a Practice Around Alternatives", summary: "Practical steps for introducing private markets into an existing practice.",
    body: ["Advisors who successfully integrate private markets tend to start with education — for themselves and their clients — before moving to implementation.",
           "Vehicle structure, minimums, and reporting cadence all shape how smoothly this fits into an existing practice."] },
  { title: "Looking Ahead", summary: "Where the private markets landscape is headed for individual investors.",
    body: ["Access to private markets has been expanding, with newer fund structures designed specifically for individual investors.",
           "Advisors who build fluency now are positioning themselves — and their clients — for a landscape where private markets play a larger role."] }
]);
