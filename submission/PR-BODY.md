#### Application description

LGPrivacyShield runs locally on LG webOS TVs. Overview shows the TV model,
software, Live Plus, and voice status. Controls lets users change settings the
TV exposes, checks each change, and saves settings for later restoration. LG
agreements shows saved choices and their documented effects. Dark mode is the
default; the light-theme choice is saved on the TV.

Compatibility reports are prepared locally. One QR code opens a prefilled
GitHub issue form on a phone. The report includes model and software, service
access, and control readability; it excludes setting values and agreement
choices. Opening the link sends the report to GitHub, and the issue becomes
public only if the user submits the form. This lets maintainers add support for
TV models and controls they have not seen.

The app does not record audio or screenshots, run a background service,
inspect encrypted network traffic, or upload TV settings or viewing activity.
Expected compatibility is webOS 6 and later. Physical testing is on an LG
OLED77C6HUP (C6), webOS 26 / Rockhopper release 11.2.0-3512, firmware 43.21.79;
earlier releases are untested.

#### Submission checklist

- [x] I have tested this application on a real webOS TV.
- [x] I confirm that this submission complies with the repository rules.

#### AI-use declaration

- [ ] No AI tools were used.
- [ ] AI tools were used for limited assistance (for example, explanations, small snippets, or editing).
- [ ] AI tools were used for research or planning; the application was developed by a human.
- [ ] AI coding agents were used; an experienced developer has reviewed and tested all generated code.
- [ ] The application was produced primarily by AI without meaningful human development or review.
- [x] Other: AI tools were used extensively for research, implementation, documentation, and tests. The project owner set the product and privacy requirements, directed revisions, reviewed app behavior and wording, and supplied physical-TV observations. The owner is responsible for this submission.

#### Validation

The 0.4.0 candidate passed 59 Node.js tests, 49 Python tests, and 18 packaged-app browser checks. The Homebrew IPK verifier passed its static package check; it reports a Runtime APIs warning for webOS 6.4.0 that requires manual testing. The app was launched on the C6 listed above. Earlier webOS releases have not been tested.

The 0.4.0 IPK and matching manifest have not been published. This listing's stable manifest URL currently resolves to v0.1.12. Please do not merge until the matching 0.4.0 release assets are available.
