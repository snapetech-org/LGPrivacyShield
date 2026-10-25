# Privacy setting effects

For where these controls appear in the app, see the [app guide](APP-GUIDE.md).

Each switch changes one TV setting and reads it back. The recommended preset
changes ten reviewed settings. Do Not Sell, the HbbTV master switch, HbbTV
third-party cookies, Bluetooth wake, and Sleep on Absence remain separate
choices.

| Setting | Privacy effect | Feature effect or limit |
|---|---|---|
| Live Plus / ACR | Disables LG's viewing-recognition feature. | Live Plus recommendations and some viewing-based features may disappear. This is separate from agreement status. |
| Hands-free voice recognition | Disables far-field voice commands. | Wake-word commands stop working. This does not disconnect the built-in microphone or remote microphone. |
| Voice wake | Stops voice commands from waking the TV from standby. | The power button and remote remain available. |
| Limit Ad Tracking | Limits advertising-related use of personal data. | Ad personalization may change; advertisements remain. |
| Do Not Sell My Personal Information | Asks LG to instruct third-party providers to stop commercializing personal information. | Some ad-supported services may remain. PrivacyShield calls LG's ad-manager service; it does not change DNS blocking. |
| Screen Saver Promotion | Hides promotions shown by supported screen savers and apps. | Promotions in other TV apps or screens may remain. |
| Home menu ads | Hides sponsored items shown in the Home menu. | Other advertisements on the TV may remain. |
| Live Promotion | Disables custom ads and services while watching content. | LG makes this setting available when Live Plus is on. |
| Home content recommendations | Hides recommendation categories in the Home menu. | Availability varies by country. |
| HbbTV Do Not Track | Asks HbbTV apps and services to disable user tracking. | Applies only when HbbTV services are used. |
| HbbTV Device ID | Stops sharing the distinct HbbTV-only ID when off. | Has no effect while HbbTV is disabled. Interactive services may behave differently when enabled. |
| HbbTV third-party cookies | Disables third-party cookies for HbbTV when off. | May affect sign-in or interactive features in HbbTV apps. This does not control cookies used by other TV apps. |
| HbbTV interactive services | Disables broadcast-linked interactive services when off. | Broadcaster apps and interactive broadcast features can be unavailable. |
| Bluetooth wake | Stops supported mobile devices from turning on the TV over Bluetooth when off. | LG warns that enabling it can increase energy use in networked standby. |
| Sleep on Absence | Disables LG's automatic turn-off after it detects that the user is away. | LG describes a one-week learning period. The feature also requires the TV and mobile device not to share a network for an hour. |

The preset sets Live Plus off, both voice controls off, Limit Ad Tracking on,
Screen Saver Promotion off, Home menu ads off, Live Promotion off, Home
content recommendations off, HbbTV Do Not Track on, and HbbTV Device ID off.
It leaves the five separate choices above unchanged.

## LG agreements

PrivacyShield shows the saved agreement status, the documented accepted and
declined effects, and any additional agreement the TV reports without a
verified effect map. Changes remain in LG's native User Agreements screen.
PrivacyShield does not write cached consent records.

The Privacy Policy and Terms of Use are required for LG smart services such as
Netflix and YouTube. Optional consents gate ACR, voice recognition, and
advertising uses. Consent alone does not turn on a feature: Live Plus controls
ACR separately, and voice features require an additional user action or enabled
voice setting. A saved agreement status does not prove data was processed or
sent. See [LG-AGREEMENT-EFFECTS.md](LG-AGREEMENT-EFFECTS.md) for the per-ID map,
evidence quality, source links, and remaining limits.

On this C6, LG's native flow warned that changing a required agreement can
revoke other choices and restart setup. Review its confirmation before saving.
Menu behavior and agreement terms may differ by region and firmware.

## Microphone

The C6-family manual shows one hardware layout with a microphone switch and a
second layout without it. It does not say which layout is fitted to the exact
TV. Check the bottom edge of the set. The software voice settings disable
recognition features but do not electrically disconnect a microphone.

See [TV-PRIVACY-CAPABILITY-MAP.md](TV-PRIVACY-CAPABILITY-MAP.md) for the
evidence, confidence levels, and settings that remain unmapped.
