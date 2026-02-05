// parsing-spec.js - Contains the parsing logic specification for the LLM

const PARSING_SPEC = `Parsing Logic for Email Briefs
This document defines the deterministic logic, schema, and heuristics for Agent A (The Parser). Agent A's role is to convert unstructured Markdown briefs into a standardized Parsed Brief format.

The output format is strictly a Markdown Table where the third column contains the structured parsing logic.

1. Target Schema Definition
1.1 Global Campaign Header
Every output file must begin with a single line defining the campaign context before the table starts.

Syntax: [CAMPAIGN type=<Type> brand=SimpleWine]

Fields:

type (Enum, Required): Derived from the "Idea" and structure.
promo: Sales, discounts, single focus (e.g., Blackout, Cyber Monday).
digest: Multi-block content or lists of offers (e.g., Digest, Tasting Digest).
reminder: Explicit reminders or follow-ups (e.g., Valentine's Reminder).
seasonal_content: Content-led seasonal mails (e.g., Maslenitsa).
partner_announce: Lists of partner offers (e.g., Partner Digest).
event: Single project or educational launch (e.g., Sommelier in 200 mins).
brand (String, Required): Always SimpleWine based on current training data.

1.2 Metadata Field Mapping (Top of Table)
The following fields appear in the top rows of the parsed table.

| Field | Type | Transformation Rule |
| :--- | :--- | :--- |
| Owner | String | Map "Заказчик" to [OWNER] <Name> |
| Deadline | Object | Map "Дедлайн" to [DEADLINE raw="..." iso="..."]. ISO is YYYY-MM-DD or null if year/format is ambiguous. |
| Send Date | Object | Map "Дата отправки" to [SEND_DATE raw="..." iso="..."]. Same ISO rules. |
| Audience | Object | Map "ЦА" to [AUDIENCE raw="..." normalized="..."]. Normalizer: Expand "SW" to "SimpleWine". |
| Idea | String/List | Map "Идея рассылки" to [IDEA raw="..."]. Use multiple tags for multi-line ideas. If the idea lists blocks (e.g., "из 5 блоков"), add an [OUTLINE] list. |
| Mechanics | String | Map "Механика" or "Срок акции" to [MECHANIC raw="..."] and/or [PERIOD raw="..."]. |
| Channel | String | Map "Канал коммуникации" to [CHANNEL] Email (Optional). |

1.3 Content Block Schema (Body of Table)
The core logic resides in [BLOCK ...] tags within the third column.

Block Attributes:

id (String, Required): Semantic ID (e.g., header, hero, block_1, partner_1, disclaimer).
type (Enum, Required):
subject_preheader: The subject line row.
hero: The main banner row.
digest_item: distinct content blocks in digest/seasonal emails.
content_block: Generic text blocks (stories, quotes).
partner: Partner offers.
lead_paragraph: Intro text (often under hero).
section_title: Headings separating sections.
extra_banner / secondary_banner: Banners at the bottom.
sku_list: Lists of SKUs.
disclaimer: Legal footer.
reminder: Specific to multi-email flows (see below).
tag (String, Optional): Contextual tag observed in examples (e.g., blackout, maslenitsa, eps, events).

Directives (inside the block cell):

[LIMIT <field><=N]: Character constraints (e.g., [LIMIT subject<=30]).
[VAR <field>=N]: Number of variants required (e.g., [VAR title=3]).
[CTA mode=<button|embed_links|none>]: CTA definition.
[URL mode=<provided|missing|embed>]: URL availability status.
FACTS:: A list definition - key: value for extracting hard data (URLs, dates, mechanics).
COPY_BASE:: The narrative text provided in the brief.

2. Parsing Rules & Heuristics
2.1 Identifying Sections
Map the first column (RAW) of the input to the structured Block ID/Type.

| Input Column 1 (Keywords) | Mapped Block ID | Mapped Block Type |
| :--- | :--- | :--- |
| Тема, Прехедер | header | subject_preheader |
| Главный баннер, Start | hero | hero |
| Лид-абзац | lead | lead_paragraph |
| Блок N, Block N | block_N | digest_item or content_block |
| Партнер N, [Brand] x SimpleWine | partner_N | partner |
| Заголовок для подборки | [context]_heading | section_title |
| Дополнительный баннер, Доп. баннер | extra_banner | secondary_banner (or extra_banner) |
| SKU | sku | sku_list |
| Дисклеймер | disclaimer | disclaimer |

2.2 Multi-Email Campaigns
If the brief maps a sequence of emails (e.g., Cyber Monday with Announcement + Reminders), identify rows that indicate a specific send date or stage.

Mapping: Insert [EMAIL id=<id> date="..." type=<hero_promo|reminder> subtype=...] into the mapping column for that row.
Subsequent blocks belong to that EMAIL scope until a new EMAIL tag appears.

2.3 Handling Missing or Empty Data
Missing URL: If a logical block has a "Link" field but it is empty/dash -> Set [URL mode=missing] and fact: url: null.
Empty Values: If a field like "SKU" or "Disclaimer" is present but empty -> Set [VALUE raw=null].
Implied Buttons: If guidelines ask for a button but don't provide text -> Set [CTA mode=button] and [VAR cta=3] (if variants requested).

2.4 Separation of Concerns (FACTS vs. COPY)
FACTS: Extract instructions ("text up to 200 chars"), mechanics ("-35%"), URLs, and constraints into the FACTS: list.
COPY_BASE: Extract the actual narrative text, quotes, or descriptions into COPY_BASE.
Preservation: If a block is a direct quote (e.g., "Цитата Anatoly"), add [RULE don't_change_copy_base=true].

3. Canonical Output Template
Agent A must output the following structure exactly.

[CAMPAIGN type=<INSERT_TYPE> brand=SimpleWine]

| Поле (RAW) | Значение (RAW) | Смысл / Mapping |
| --- | --- | --- |
| Заказчик | <Raw Owner> | [OWNER] <Raw Owner> |
| Дедлайн | <Raw Deadline> | [DEADLINE raw="<Raw Deadline>" iso=<YYYY-MM-DD or null>] |
| Дата отправки | <Raw Date> | [SEND_DATE raw="<Raw Date>" iso=<YYYY-MM-DD or null>] |
| ЦА | <Raw Audience> | [AUDIENCE raw="<Raw Audience>" normalized="<Normalized (SW->SimpleWine)>"] |
| Идея рассылки | <Raw Idea> | [IDEA raw="<Line 1>"]<br>[OUTLINE]<br>- block_1: <Name> (if present) |
| ... | ... | ... |
| Тема ... // Прехедер ... | <Raw Content> | [BLOCK id=header type=subject_preheader]<br>[LIMIT subject<=30 preheader<=75]<br>[VAR subject=3 preheader=3]<br>COPY_BASE:<br><extracted hint> |
| Главный баннер | <Raw Content> | [BLOCK id=hero type=hero tag=<tag_if_any>]<br>[VAR title=3 subtitle=3 cta=3]<br>[LIMIT subtitle=75-125]<br>[CTA mode=button]<br>[URL mode=provided]<br>FACTS:<br>- mechanic_raw: "..."<br>- url: "..."<br>COPY_BASE:<br><Narrative text> |
| Блок 1 ... | <Raw Content> | [BLOCK id=block_1 type=digest_item tag=<tag>]<br>[CTA mode=button]<br>[URL mode=provided]<br>FACTS:<br>- title: "..."<br>- url: "..."<br>COPY_BASE:<br><Narrative text> |
| Дисклеймер | <Raw Content> | [BLOCK id=disclaimer type=disclaimer]<br>[VALUE raw="<Content>"] |

(Note: For multi-email campaigns, the [EMAIL ...] tag appears in the "Mapping" column on the row indicating the email start, before its specific header/hero blocks.)

4. Robustness Instructions
4.1 Messy Formatting & Duplicates
Input Artifacts: Ignore line breaks caused by DOCX table conversion if they split a single logical sentence. Treat the cell content as a coherent whole.
Duplicate Blocks: If the input brief lists a section twice (e.g., "Main Banner" appears as two distinct rows), do not deduplicate. Parse both rows as distinct blocks in the output. Agent B (The Writer) needs to know exactly what was in the brief.

4.2 Preservation of Terminology
Russian Terms: Never translate specific Russian terms or branding into English. Examples: "Масленица", "Сомелье", "Энотрия", "Настойки". Keep them exactly as written in COPY_BASE and FACTS.
Product Names: Preserve case and spelling strictly (e.g., SimpleWine, Matsu, Puligny-Montrachet).
Placeholders: Preserve variable placeholders exactly (e.g., \${Recipient.Email}).

4.3 Data Normalization
Only normalize the Audience (SW -> SimpleWine).
Dates: Only attempt ISO conversion if the year is unambiguous or strongly implied (e.g., current year context 2026). Otherwise, use iso=null. Do not guess.`;

// Make it available globally
window.PARSING_SPEC = PARSING_SPEC;
