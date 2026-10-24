# Feature impact notes

PrivacyShield separates optional agreement consent from software controls.

| Setting or agreement | Privacy effect | Feature effect when off/withdrawn |
|---|---|---|
| `Live Plus` | Disables the associated viewing-recognition feature. | Live Plus recommendations and related viewing-information features can disappear. Normal streaming and HDMI playback remain separate. |
| `S_VNG` Voice Information | Withdraws consent for LG voice processing. | LG voice recognition, including remote push-to-talk, may be unavailable. Acceptance permits voice processing when recognition is activated. |
| `voiceLongDistance` | Disables far-field/hands-free voice recognition in software. | Hands-free wake-word commands stop working. This is not an electrical microphone disconnect; remote push-to-talk remains a separate path. |
| `turnOnByVoice` | Disables voice wake from standby. | Voice cannot wake the TV; power and remote control remain. |
| `S_ADG` Viewing Information | Withdraws consent for viewing-information processing. | Some viewing features and context-aware voice commands may be unavailable. LG says some voice commands may need this agreement. Acceptance alone does not turn on ACR; `Live Plus` is the separate ACR control. |
| `S_TAG` Interest-Based Advertisement | Disables interest-based ad processing. | Ads may be less personalized; ordinary playback is not dependent on this consent. |
| `S_MKT` Marketing Communications | Stops marketing communications. | LG promotional communications may stop; playback is unaffected. |
| `S_DPA` Data Partners | Withdraws consent for partner data processing. | Partner-dependent services may be unavailable; exact dependencies vary by region. |
| `S_PRG` Privacy Policy / `S_SVC` Terms of Use | Required agreements. | LG states these are required for smart services such as Netflix and YouTube. |

Agreement effects are region- and firmware-dependent. The app reports the
device's current agreement record and leaves actual consent changes to the
LG User Agreements screen. The app never changes an agreement by editing
cached preference files.

When preserving voice features while reducing collection, accept only the
agreements needed for the desired commands, then keep `Live Plus`, hands-free
voice, and voice wake off unless those features are wanted. Some context-aware
voice commands may still depend on viewing recognition being enabled; verify
those commands on the TV before deciding whether to re-enable Live Plus.
