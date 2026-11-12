# International SMS rollout matrix

Research checked 12 November 2026 against the official sources below.
**Every destination outside the United States remains disabled.** Canada is
not enabled merely because its numbers use +1. This is a readiness plan, not a
claim of legal approval or guaranteed sender availability.

Recommended order: Canada and UK as separate pilots, then Germany and France
individually, then Australia. Selection reflects language/provider reach, not
permission to send. Owner approval, local legal review and country-specific
carrier evidence are required before each pilot.

## Sender, registration and identity matrix

| Market | Candidate sender / registration | Entity or identity dependency | Blocking decision |
|---|---|---|---|
| **Canada — candidate pilot** | Twilio recommends short code or **verified toll-free** for A2P delivery. Canadian carriers aggressively filter A2P long codes. Alphanumeric is not supported. US 10DLC approval does not approve Canadian traffic. [CA SMS] | Existing toll-free verification must actually cover the intended Canada use case. Short-code applications require business and campaign materials. Do not assume a universal local-entity requirement or exemption: confirm the selected sender's current compliance bundle with Twilio before spending. [CA SMS], [TF] | Obtain Canada-specific sender acceptance, CASL-reviewed consent and English/French HELP/STOP handling. US-only validation, suppression wording and provider geo permissions must be deliberately expanded. |
| **UK — candidate pilot** | UK mobile numeric sender supports replies; alphanumeric supports one-way messaging, with registration/allowlisting for protected brands. BT protected-brand filtering must be reviewed. A one-way alpha sender cannot accept reply STOP; alternative opt-out is mandatory. [GB SMS] | Number-type-specific regulatory bundle. UK local/national business numbers require a valid UK business address; mobile business address may be anywhere in the world, with business/registration details. Do not buy a UK local number on the assumption that the mobile requirements apply. [GB ID] | Choose a reply-capable sender or build a real localized web opt-out; approve PECR/UK GDPR copy and actual registration requirements. No silent reliance on a previous-customer "soft opt-in". |
| **Germany — later EU market** | Branded alphanumeric or a supported mobile sender after carrier/number-type review. Generic or misleading sender identity invites filtering; alpha cannot receive STOP. Verify actual inventory and throughput before promising two-way service. [DE SMS] | German local numbers are business-only and require business-registration evidence and an address within the prefix locality; national numbers have separate requirements. These restrictions on buying local numbers are not proof that every permitted alpha route needs a German subsidiary. Obtain written provider confirmation for the chosen route. [DE ID] | German consent/copy review, GDPR processor/transfer assessment and a functioning opt-out compatible with the sender. Do not infer that a US consent record transfers to a new subject/market. |
| **France — later EU market** | Twilio's SMS guideline says use alphanumeric IDs for A2P; brand-specific sender, no special characters, and possible letter of authorization for sensitive brands. Generic "Info/Verify/Help" senders are discouraged/filtered. [FR SMS] | French local numbers require French address/identity documentation; consumer mobile-number ranges are not an A2P workaround. Technical-platform ranges have different permitted use cases. An alpha sender still needs proof of brand entitlement if requested. [FR ID] | French consent, sender authorization, a compliant opt-out (not a mobile-number opt-out), holiday/quiet-calendar handling, and provider-approved classification of game-engagement reminders. |
| **Australia — later other market** | Alphanumeric IDs must be pre-registered with proof of entitlement. From **1 July 2026**, ACMA requires sender ID registration through **every** message provider used; unregistered IDs are replaced with "Unverified". Alternatively evaluate supported two-way mobile inventory. Twilio pre-registration alone is not assumed to satisfy every national confirmation step. [AU SMS], [AU REGISTER] | Local-number bundles require Australian address and business/identity evidence; Australian businesses provide ASIC extract and ABN/ACN as applicable. Authorized-representative identity/authority may be required. ACMA provides a separate sender-ID process for entities **without an ABN**; do not invent a local address or assume they are ineligible. [AU ID], [AU REGISTER] | Sender registration confirmed by the owner through the ACMA process, Spam Act consent/identification/unsubscribe review, Australian timezone handling and an approved domestic pilot. |

## Consent, age, opt-out, timing and localization

**Common age policy:** keep SMS restricted to self-confirmed **18+** until each
market's child/privacy and contractual-capacity review is approved. This is a
product restriction, **not** a statement that local SMS law universally mandates
18. GDPR Article 8 (where relevant to consent-based information-society services)
and local child-consent rules are not a replacement for specific SMS permission
or account-holder ownership. Do not add minors by changing only an age checkbox.

| Market | Consent / age review | Opt-out and help | Quiet hours / timezones | Localization and segmentation |
|---|---|---|---|---|
| **CA** | CASL can apply to commercial SMS received in Canada even from abroad. CRTC requires consent, sender identification and a functioning unsubscribe mechanism. Use separate express opt-in/evidence, not inferred gameplay activity. CASL does not establish a universal age-18 permission rule; review minors' capacity/privacy separately; retain the 18+ restriction. [CRTC] | Reply STOP/HELP and equivalent local-language terms with prompt suppression; confirm any required business/address/contact disclosures and unsubscribe timing. Do not assume US provider keywords cover French. | Validate recipient IANA zone across Canadian regions, including DST exceptions. Proposed pilot policy 09:00–19:59 local; legal/provider review may require stricter rules. No claim of a single national statutory SMS curfew from the cited FAQ. | English/French consent, HELP, rates and opt-out copy. Test French accents; GSM-7 extension characters and Unicode can increase billed segments. |
| **GB** | ICO says marketing email/text needs specific consent unless a narrow exception applies; this product should not depend on that exception. Guidance is being updated following the Data (Use and Access) Act. Review game reminders' classification, UK GDPR and children's-design obligations. Remain 18+. [ICO] | Valid opt-out contact in every relevant message; reply STOP with numeric sender, or a tested easy web opt-out for one-way alpha. Never say "reply STOP" to a non-reply sender. | Europe/London with BST/GMT DST. Proposed daytime-only pilot; verify any applicable sector-specific rules rather than inventing a universal PECR quiet-hours number. | UK English, UK time/date formats, support hours. Twilio warns certain characters may be substituted; verify the final text on UK networks. |
| **DE** | Review GDPR, national electronic-marketing law and proof of affirmative consent. Use unticked specific SMS consent, purpose limitation, documented withdrawal and independent ownership proof; keep 18+. The EU GDPR Article 8 baseline is 16 for its specific context, not an SMS eligibility shortcut. [GDPR] | German localized unsubscribe/help; numeric STOP or a tested easy web method for alpha. Update suppression across all sessions, not just the initiating profile. | Europe/Berlin CET/CEST. Proposed 09:00–19:59 weekdays until local counsel approves a broader event schedule; do not assume German provider guidance is a statutory blanket curfew. | German copy, expanded text length, umlauts/GSM extensions; preserve brand identity and avoid public URL shorteners. Measure actual segments before budget approval. |
| **FR** | CNIL requires free, specific, informed and affirmative consent for consumer electronic advertising; a prechecked box or general terms acceptance is insufficient. The threshold for consent-based online services and child protections require separate French review; keep 18+. [CNIL], [GDPR] | Local-language HELP/STOP or an accepted web unsubscribe. Twilio says a web link is acceptable for opt-out and **a mobile phone number as opt-out is forbidden**; do not import the US numeric reply instruction blindly. [FR SMS] | Provider guideline: marketing 08:00–21:30 Mon–Sat; Sundays/public holidays heavily filtered/blocked. Transactional exemption is **not assumed for game engagement**. Implement France holiday calendar and Europe/Paris DST before approval. | French localized consent and replies; avoid generic alpha names, generic URL shorteners and special characters in sender IDs. Test segments and accents. |
| **AU** | Spam Act commercial-message requirements include consent, identification and unsubscribe; no assumption that a US event consent is sufficient. Review capacity/children's privacy and current national requirements; retain 18+. [ACMA], [AU SMS] | A low/no-cost unsubscribe in every relevant message. Reply STOP only on a reply-capable number; otherwise tested web opt-out, with real contact details. Confirm statutory processing time with ACMA at launch. | Australia spans multiple zones, 30-minute offsets and DST/no-DST states. Validate a named zone, not "+10". Proposed 09:00–19:59 local subject to approval; do not confuse voice telemarketing curfews with SMS rules. | Australian English and support contact; GSM/Unicode segmentation checked on Telstra/Optus/Vodafone paths, not inferred from a single test. |

## Costs, throughput/filtering and geographic permissions

Public list-price observations in **USD per outbound SMS segment**, not quotes.
Verify, line Lookup, number rental, registration, inbound/keyword traffic,
taxes, exchange rates and carrier surcharges may add cost. Failed-message
processing charges can apply. Re-fetch the pricing page and provider account
quote immediately before each approval; no international budgets are approved.

| Market | Observed outbound base | Capacity / filtering blocker | Geo permissions and pilot gate |
|---|---|---|---|
| CA | Long-code/toll-free **$0.0083**; short code **$0.0315**, plus applicable carrier fees. [CA PRICE] | Obtain approved route/MPS with carrier acceptance; long-code A2P filtering is a known risk. Include short-code rental/setup if selected. No invented throughput promise. | Enable CA separately in Messaging and Verify only after approval; verify metadata distinguishes CA from US despite shared +1. Test major networks and bilingual STOP paths. |
| GB | Mobile/alpha **$0.056**; short code **$0.0524**, plus applicable extras. [GB PRICE] | Registration/protected-brand allowlisting, sender type and carrier filtering determine throughput. Avoid M2M claims; provider calls it best effort. | Enable GB only after registration and opt-out-path approval; test multiple UK networks, BST transition, and reply/web opt-out. |
| DE | Mobile/alpha **$0.112**, plus applicable extras. [DE PRICE] | Significantly higher base spend than US; sender/inventory-specific MPS must be quoted. Avoid generic identity, shorten without removing required disclosures. | Enable DE individually, not "EU". Test major networks, German unsubscribe and CET/CEST before a capped pilot. |
| FR | International numeric/alpha **$0.0798**, plus applicable extras. [FR PRICE] | Alpha identity rules, authorization, holidays, quiet hours and URL filtering materially affect delivery. Do not buy consumer mobile numbers to bypass A2P requirements. | Enable FR only after approved sender, opt-out and public-holiday scheduling. Test French carriers and localized opt-out before launch. |
| AU | Mobile/alpha **$0.0515**, plus applicable extras. [AU PRICE] | Sender registration, destination carrier, alpha versus mobile and segmentation determine cost/MPS. Recheck sender-ID rules effective on the actual launch date. | Enable AU individually in Messaging/Verify after registration/identity review, AU-zone tests and approved carrier evidence. |

Do not shard numbers, swap sender identities, or route via other countries to
evade filtering, throughput limits, fees or registration. Country allowlists in
both application metadata validation **and** Twilio geographic permissions are
required. A provider delivery callback and a recipient's actual device receipt
are different evidence; retain both with no public phone numbers.

## Required approval record per country

Before implementation of a destination: selected sender type and inventory;
business/identity bundle accepted; campaign classification and copy approved;
local lawyer/privacy review including age and cross-border processing;
localized affirmative consent and withdrawal; timezone/quiet/holiday policy;
tested opt-out method compatible with sender; segmentation/carrier-rate quote;
per-country budget and allowed throughput; provider geographic permissions;
owner-controlled recipient and separately approved live-test cost/window;
actual callback and device evidence; rollback/kill-switch procedure.

Every item is **pending** for CA/GB/DE/FR/AU. No international number is accepted
by the current request endpoint and no international send path is enabled.

## Official source index

[CA SMS]: https://www.twilio.com/en-us/guidelines/ca/sms
[GB SMS]: https://www.twilio.com/en-us/guidelines/gb/sms
[DE SMS]: https://www.twilio.com/en-us/guidelines/de/sms
[FR SMS]: https://www.twilio.com/en-us/guidelines/fr/sms
[AU SMS]: https://www.twilio.com/en-us/guidelines/au/sms
[GB ID]: https://www.twilio.com/en-us/guidelines/gb/regulatory
[DE ID]: https://www.twilio.com/en-us/guidelines/de/regulatory
[FR ID]: https://www.twilio.com/en-us/guidelines/fr/regulatory
[AU ID]: https://www.twilio.com/en-us/guidelines/au/regulatory
[TF]: https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding
[CRTC]: https://crtc.gc.ca/eng/com500/faq500.htm
[ICO]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/
[CNIL]: https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel
[GDPR]: https://eur-lex.europa.eu/eli/reg/2016/679/oj
[ACMA]: https://www.acma.gov.au/avoid-sending-spam
[AU REGISTER]: https://www.acma.gov.au/1-introduction-businesses-and-organisations
[CA PRICE]: https://www.twilio.com/en-us/sms/pricing/ca
[GB PRICE]: https://www.twilio.com/en-us/sms/pricing/gb
[DE PRICE]: https://www.twilio.com/en-us/sms/pricing/de
[FR PRICE]: https://www.twilio.com/en-us/sms/pricing/fr
[AU PRICE]: https://www.twilio.com/en-us/sms/pricing/au

- [International SMS guide](https://www.twilio.com/docs/messaging/guides/sending-international-sms-guide)
- [Number regulatory requirements](https://www.twilio.com/en-us/guidelines/regulatory)
- [Messaging geographic permissions](https://www.twilio.com/docs/messaging/guides/sms-geo-permissions)
- [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy)
