# LG agreement effects

For the agreements screen and how to change a saved choice, see the
[app guide](APP-GUIDE.md).

This document maps the agreement choices shown by LGPrivacyShield to the effects
LG documents. It describes permissions and feature gates; an accepted status
does not prove that a feature ran or that information was collected or sent.

## Evidence scope

The exact `OLED77C6HUP` / webOS 26 agreement response contained seven current
selectable entries (`type: M`) with the IDs and titles below. This is a direct,
read-only observation of that TV's agreement service. LG's documents describe
what the agreements cover, but they do not define the firmware IDs. Titles and
available agreements can vary by country, model, and software version.

The TV response also contained `Overview`, `Select All`, and `Legal Notice`
records. Those are not individual selectable agreements. Older agreement
records appeared in a separate legacy record and are not used as current
choices. LGPrivacyShield displays any additional current selectable agreement
returned by a TV, but marks its effect **not mapped** until evidence supports
a model-specific description.

## Current C6 choices

| TV ID and title | If accepted | If not accepted | Evidence and limit |
|---|---|---|---|
| `S_ADG` — Viewing Information Agreement | Makes ACR eligible when Live Plus is on. LG says ACR may use content fingerprints with device, source, and network information for audience analysis. Some source-aware voice commands may also need this agreement. | ACR is unavailable. Some source-aware voice commands may be limited. | **High** for the title/ID on this C6 and LG's stated feature dependencies. ACR still needs the separate Live Plus setting. LG says ACR uses audio fingerprints, not screenshots or voice recordings. |
| `S_VNG` — Voice Information | Makes LG voice recognition available after a user action, such as pressing the remote microphone button, or enabling supported hands-free voice. | LG voice recognition is unavailable. | **High** for the voice requirement in LG's statement. Acceptance alone does not start a voice session or enable hands-free voice. |
| `S_TAG` — Interest-Based Advertisement Agreement | Permits interest-based and cross-device ads under this agreement. LG says ACR viewing information is not used for these ads unless both this agreement and Viewing Information are accepted. | No consent for interest-based or cross-device ads under this agreement. Other ad or service processing may be covered elsewhere. | **High** for the two-agreement condition in LG's statement. The exact title on this Canadian TV differs from LG's current US legal-document title. |
| `S_MKT` — Marketing Communications Agreement | Permits marketing communications covered by this agreement. | This consent is absent. | **Limited.** The C6 supplies the title and LG lists the agreement as optional, but LG's public support summary does not specify communication channels or affected TV features. LGPrivacyShield does not claim that every LG promotion depends on it. |
| `S_DPA` — Data Partners Agreement | LG's regional software notes, for markets including Canada, describe this agreement as covering use of data for ad measurement and analytics with third-party partners. | This agreement's consent is absent. LG does not identify a specific TV service that stops when it is declined. | **Moderate.** The C6 supplies the exact title and ID. LG's regional notes explain the purpose, but do not enumerate the data fields, partner list, or exact C6 service gates. |
| `S_PRG` — Privacy Policy | Required with Terms of Use for LG smart services, including apps such as Netflix and YouTube. | LG smart services remain unavailable. LG says regular TV features can continue if agreement choices are deferred. | **High** for LG's current support guidance. The policy text and data terms can change by region and version. |
| `S_SVC` — Terms of Use | Required with the Privacy Policy for LG smart services, including apps such as Netflix and YouTube. | LG smart services remain unavailable. LG says regular TV features can continue if agreement choices are deferred. | **High** for LG's current support guidance. Read the version presented on the TV before accepting. |

## How to read the status

- **Accepted** means the TV reports a saved acceptance for that agreement.
- **Not accepted** means the TV reports no acceptance for that agreement.
- **Unavailable** means LGPrivacyShield could not read a current status.
- Consent and feature state are separate. For ACR, Live Plus must also be on.
  For voice, LG requires a user-activated voice session or supported
  hands-free voice. Acceptance alone does not enable either behavior.
- LG says the optional viewing, voice, and advertising agreements are not
  required for basic smart services. The Privacy Policy and Terms of Use are
  required for LG smart services.
- On this C6, LG's native agreement flow warned that changing a required
  agreement can revoke other choices and restart setup. Review the native
  confirmation before saving changes.
- Agreement status is not a network observation. It cannot show whether a
  service used information, whether a partner received it, or whether a DNS
  block prevented a connection.

LGPrivacyShield does not accept agreements, edit cached consent records, or
change agreement state through SettingsService. The **Open LG User Agreements**
button launches LG's native screen. The app refreshes the displayed state when
it returns.

## Sources

- [LG: Understanding Privacy on LG Smart TVs](https://www.lg.com/us/newsroom/corporate/statement-understanding-privacy-on-lg-smart-tvs), published 2026-09-12. Covers voice activation, ACR, separate advertising consent, and service partners.
- [LG: How to Accept the Updated User Agreements on Your LG TV](https://www.lg.com/us/support/help-library/seeing-a-user-agreements-screen-on-your-lg-tv-CT10000018-20155426555618), updated 2026-09-02. Says Terms of Use and Privacy Policy are required for smart services, other agreements are optional, and regular TV features remain available when a choice is deferred.
- [LG Smart TV legal documents](https://us.lgappstv.com/main/terms). LG notes that the applicable text can differ by model and software; the TV shows the documents that apply to it.
- [LG TV product support and software notes](https://www.lg.com/np/support/product/lg-55UR8050PSB.ATC). The page's regional release notes identify Data Partners Agreement as an agreement for ad measurement and analytics with third-party partners in listed markets, including Canada. It also cautions that update details vary by model and country.
- [Glasshouse implementation notes](https://github.com/rorygallagher2024/glasshouse/blob/main/docs/IMPLEMENTATION.md). Community reverse-engineering evidence confirms `S_ADG` as the Viewing Information Agreement and documents firmware-specific agreement-to-setting dependencies. This is corroborating firmware research, not an LG guarantee.
