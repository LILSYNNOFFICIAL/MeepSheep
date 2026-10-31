# MeepSheep Project Brief

**Product:** MeepSheep  
**Canonical domain:** https://meepsheep.com  
**Repository:** https://github.com/LILSYNNOFFICIAL/MeepSheep  
**Default branch:** `main`  
**Document status:** Initial project brief; requirements are subject to validation.

## 1. Product vision

MeepSheep is a source-grounded research and evidence platform. It helps people investigate questions, verify claims, compare sources, inspect original material, and produce transparent research reports.

MeepSheep is intended to work in two complementary ways:

1. **Standalone product:** a responsive website/PWA that people can use directly in a desktop or mobile browser.
2. **AI-tool interface:** a remote Model Context Protocol (MCP) service that compatible AI assistants can call as a research capability.

The website and MCP interface must use the same underlying research capabilities. Neither is a disposable wrapper around the other.

## 2. Product promise

Help users understand not only what a source says, but why a conclusion is or is not supported.

MeepSheep should make it easy to inspect:
- The exact claim or question being investigated.
- Search strategy and research scope.
- Original source URLs and publisher identity.
- Publication dates and retrieval dates when available.
- Relevant excerpts and the surrounding context.
- Evidence that supports, contradicts, or qualifies a claim.
- Whether apparently separate sources are actually repeating one origin.
- Missing information, uncertainty, and limitations.
- The reasoning that connects evidence to a cautious conclusion.

MeepSheep is an evidence organizer and research assistant, not an oracle or an automatic truth detector.

## 3. Intended users and environments

- People doing general web research and fact checking.
- Writers, researchers, developers, students, and analysts.
- Users of compatible AI assistants who want research tools beyond a model's native browsing.
- Desktop users on Windows and macOS.
- Mobile users on Android and iOS through responsive web/PWA experiences.
- AI clients that support remote MCP or a separately implemented compatible integration.

A native mobile application is not a launch prerequisite. Responsive web and installable PWA behavior should be evaluated first.

## 4. Core product capabilities

### Initial capability set
- Research a question using one or more approved search/retrieval providers.
- Fetch and extract a supplied public source URL safely.
- Verify a specific claim against retrieved evidence.
- Deduplicate results and identify likely source relationships.
- Classify evidence as supporting, contradicting, contextual, or insufficient.
- Present citations that resolve to the original sources.
- Produce a structured research report with explicit limitations.
- Save and revisit research when a user account and persistence layer are available.
- Expose the same core operations through MCP.

### Explicit non-goals for the first release
- Training or hosting a foundation model.
- Replacing the user's AI assistant.
- Claiming certainty or assigning unsupported universal truth scores.
- Circumventing paywalls, logins, robots restrictions, provider terms, or rate limits.
- Scraping private communities or authenticated content without authorization.
- Running arbitrary user-supplied code or executing retrieved page instructions.
- Requiring a local GPU or high-performance client hardware.

## 5. Product principles

1. **Evidence before confidence.** Conclusions must be traceable to inspectable sources.
2. **Source transparency.** Do not conceal where evidence came from.
3. **Separation of fact and inference.** Label direct source statements, extracted facts, analysis, and uncertainty distinctly.
4. **Independent corroboration.** Ten copies of one press release are not ten independent confirmations.
5. **Provider independence.** Search providers are adapters, not the product's identity.
6. **User control.** Be clear about what is stored, for how long, and why.
7. **Secure by default.** Treat URLs, documents, and retrieved content as untrusted input.
8. **Progressive complexity.** Start with a small, testable system and add providers and features only when evidence supports the need.
9. **Cross-client consistency.** Website and MCP results should share schemas, semantics, and quality rules.
10. **Honest capability claims.** Clearly label unavailable, partial, blocked, stale, and unverified information.

## 6. Success criteria

A release is not successful merely because it returns search results. It should demonstrate:
- Reproducible research runs with traceable inputs.
- Working citations and source inspection.
- Useful handling of contradictory and inconclusive evidence.
- Clear distinction between source publication time and retrieval time.
- Resilience when a provider times out, rate-limits, or returns poor results.
- Secure URL fetching and safe handling of hostile page content.
- Consistent outputs between the web app and MCP tools.
- Accessibility and usable layouts on desktop and mobile.
- Automated tests for critical behavior and documented manual acceptance tests.

Numeric performance, quality, and cost targets must be established through benchmark runs, not invented in advance.

## 7. Product maturity labels

Documentation and UI must distinguish:
- **Implemented:** present in code.
- **Tested:** automated or documented manual checks passed.
- **Verified:** the actual end-to-end behavior was independently checked.
- **Proposed:** a candidate design not yet implemented.
- **Blocked:** cannot proceed because of a known dependency or decision.
- **Deferred:** intentionally outside current scope.

Do not describe proposed capabilities as live product features.
