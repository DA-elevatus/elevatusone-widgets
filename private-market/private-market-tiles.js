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
  { title: "Understanding Private Markets", summary: "A breakdown of what private markets are, how they're structured, and what growing access to them means for individual investors and the advisors guiding them.",
    body: ["Private Markets Explained",
           "Why many of today's most sophisticated investors allocate to private assets — and why a growing number of clients are asking about them.",
           "Advisors are fielding more and more questions from everyday investors about private equity, private credit, private real estate, and private infrastructure. Client curiosity keeps building, and advisors need to stay ahead of it. This lesson gives a quick tour of these asset classes and the case for adding them to client portfolios.",
           "What are private markets? They let investors put money into companies and assets that don't trade on public exchanges such as the NYSE or Nasdaq. Because deals are negotiated directly between the parties, private transactions are shielded from the daily price swings and liquidity pressures of public markets — which can translate into more attractive risk-adjusted returns and stronger diversification.",
           "Private market opportunities generally fall into four asset classes:",
           "Private equity — funds that buy, invest in, and actively improve privately held companies, from small startups to large enterprises.",
           "Private credit — non-bank lenders and funds that make loans and issue credit directly to borrowers, sidestepping traditional banks and public debt markets.",
           "Private real estate — funds that invest directly in physical property such as logistics warehouses, apartment complexes, and data centers, outside publicly traded REITs.",
           "Private infrastructure — investments in the physical backbone of the economy: energy grids, transportation networks, digital infrastructure, and utilities.",
           { type: "image", src: "https://da-elevatus.github.io/elevatusone-widgets/Images/private-market/potentialB.jpeg", alt: "Skyline", caption: "Example image — replace with your own." },
           "Adding private markets to a portfolio can bring real potential benefits — as illustrated by private market allocations within a traditional 60/40 portfolio over 2016–2024, the earliest span of commonly available data.",
            { type: "image", src: "https://da-elevatus.github.io/elevatusone-widgets/Images/private-market/potentialA.jpeg", alt: "Skyline", caption: "Example image — replace with your own." }] },
  { title: "Private Equity 101", summary: "How private equity investing works, and why it's become a go-to strategy for investors focused on long-term capital growth.",
    body: ["Private assets often behave differently than public stocks and bonds, which can help dampen overall portfolio volatility.",
           "That said, they come with trade-offs — including reduced liquidity — that need to be weighed against the diversification benefit."] },
  { title: "Private Credit 101", summary: "The fundamentals of private credit and the potential opportunities it opens up for your clients.",
    body: ["Private investments typically lock up capital for years, which can be unfamiliar territory for clients used to daily liquidity.",
           "Clear, plain-language conversations about time horizon and access to capital are essential before any allocation is made."] },
  { title: "Private Real Estate 101", summary: "How private real estate investments are managed, and why more investors are treating it as a staple portfolio holding.",
    body: ["Unlike public index investing, the gap in performance between skilled and unskilled private markets managers can be substantial.",
           "Track record, sourcing capability, and operational expertise all become critical parts of due diligence."] },
  { title: "Private Infrastructure 101", summary: "What infrastructure investing looks like, and why its potential for steady, long-term cash flow appeals to long-horizon planning.",
    body: ["Advisors who successfully integrate private markets tend to start with education — for themselves and their clients — before moving to implementation.",
           "Vehicle structure, minimums, and reporting cadence all shape how smoothly this fits into an existing practice."] },
  { title: "Where Investor Expectations Are Headed", summary: "How client attitudes toward private markets are shifting, and what advisors can do to stay aligned with them.",
    body: ["Access to private markets has been expanding, with newer fund structures designed specifically for individual investors.",
           "Advisors who build fluency now are positioning themselves — and their clients — for a landscape where private markets play a larger role."] }
]);
