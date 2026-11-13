# MeepSheep Research and Evidence Methodology

**Status:** Product methodology proposal. Benchmark and user testing are still required.

## 1. Research lifecycle

1. Clarify the question and identify its component claims.
2. Identify scope: geography, time period, entities, definitions, and required source types.
3. Generate a bounded search plan.
4. Select providers based on capability, quality, cost, and availability.
5. Retrieve candidate results.
6. Normalize URLs, metadata, dates, and publisher identity.
7. Deduplicate exact and near-duplicate material.
8. Identify likely syndication, citations, and common source origins.
9. Fetch permitted source pages and extract relevant passages.
10. Evaluate evidence for each claim.
11. Search specifically for contradiction and missing context.
12. Build a conclusion proportional to the evidence.
13. Produce citations, methodology, limitations, and provider status.
14. Preserve enough metadata to make the research traceable and reproducible.

## 2. Evidence categories

Use explicit categories:
- **Supports:** the source provides evidence consistent with the claim.
- **Contradicts:** the source provides evidence inconsistent with the claim.
- **Context:** the source clarifies scope, definitions, chronology, or background without directly deciding the claim.
- **Insufficient:** the source does not provide enough relevant evidence.
- **Unclear:** source meaning, authenticity, date, or relevance cannot be established confidently.

A source can be relevant to one part of a claim and irrelevant to another. Evidence classification must be claim-specific.

## 3. Source quality dimensions

Assess, where information is available:
- Primary versus secondary source.
- Publisher identity and accountability.
- Author expertise and disclosed conflicts.
- Publication date and update history.
- Proximity to the event or underlying data.
- Methodology and supporting references.
- Direct access to underlying documents or datasets.
- Transparency about uncertainty and corrections.
- Independence from other sources.
- Relevance to the exact claim and time period.

Do not compress all dimensions into an unexplained single score.

## 4. Independence and duplication

- Canonicalize URLs without destroying meaningful query parameters.
- Detect exact duplicate content.
- Detect likely syndicated copies and shared press-release origins.
- Track citation relationships when practical.
- Group sources that derive from the same underlying document or witness.
- Do not count repeated copies as independent corroboration.
- Explain when independence cannot be determined.

## 5. Dates and temporal claims

Keep separate:
- Event date.
- Source publication date.
- Source update date.
- Retrieval date/time.
- Date of the underlying dataset or study.

Never substitute the current date for an unknown publication date. Mark missing or ambiguous dates explicitly. For evolving claims, state the research cutoff.

## 6. Citation requirements

Every material factual finding should link to the source that supports it. Citation records should preserve:
- Original URL.
- Publisher/site.
- Page title.
- Author when available.
- Publication/update date when available.
- Retrieval timestamp.
- Relevant excerpt or locator.
- Evidence classification.
- Retrieval/extraction status.

Do not fabricate page titles, authors, dates, quotations, or URLs. If extraction fails, identify that limitation rather than inventing a summary.

## 7. Contradiction handling

When sources conflict:
- Identify exactly which propositions conflict.
- Compare dates, definitions, populations, jurisdictions, and measurement methods.
- Check whether one source quotes another.
- Prefer primary evidence when appropriate, but do not assume primary sources are automatically correct.
- Present unresolved conflicts explicitly.
- Do not average incompatible claims into a false compromise.

## 8. Research report structure

A report should include:
1. Question and scope.
2. Short answer with calibrated confidence language.
3. Key findings.
4. Evidence supporting the findings.
5. Contradictory and qualifying evidence.
6. Source independence and provenance notes.
7. Methodology and search coverage.
8. Limitations and unanswered questions.
9. Sources with citations.
10. Research cutoff and provider status.

## 9. Confidence language

Use natural-language confidence grounded in evidence coverage:
- Strongly supported by the reviewed evidence.
- Supported, with important qualifications.
- Mixed or contested evidence.
- Not established by the reviewed sources.
- Evidence insufficient to assess.

Avoid implying that the absence of search results proves a claim false. State the scope and limits of the search.

## 10. Provider benchmark

Benchmark candidate providers against the same representative query set. Include:
- Factual questions with primary-source answers.
- Recent events and time-sensitive claims.
- Technical documentation queries.
- Local or jurisdiction-specific facts.
- Contradictory or disputed claims.
- Niche topics and low-result queries.
- Queries designed to expose duplicate syndication.

Measure:
- Relevant result rate.
- Primary-source discovery rate.
- Freshness and date accuracy.
- Source diversity and independence.
- Duplicate rate.
- Extraction success.
- Latency and failure rate.
- Cost per useful research result.
- Terms and permitted-use constraints.

Choose a provider based on measured results and operational constraints, not marketing claims alone.

## 11. Community sources

Community discussions can provide first-hand experiences, leads, and perspectives, but are not automatically authoritative. Use official APIs or permitted access paths. Respect platform terms, privacy expectations, attribution, rate limits, and retention rules. Do not build the product around unauthorized scraping.
