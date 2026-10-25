#### What LGPrivacyShield does

I built LGPrivacyShield to help me review and change the privacy settings my LG
TV exposes. Overview shows the model, software, Live Plus, and voice status.
Controls lets me change supported settings, verify each change, and save
settings to restore later. I can also review saved LG agreement choices and
their documented effects. Dark mode is the default; my light-theme choice is
saved on the TV.

The app runs locally. The app and TV send no data during normal use. It does
not record audio or screenshots, run a background service, inspect encrypted
network traffic, or upload TV settings or viewing activity. Network destination
history requires separate router or DNS logs. A software voice switch cannot
disconnect a physical microphone unless the TV exposes a verified disconnect
control to the app.

When I find a compatibility problem, I can prepare a report in Controls and
scan one QR code with my phone. Opening its link sends the allowlisted report to
GitHub and fills in the issue form. The issue becomes public only if I submit
it. The report includes the model, software, service access, and control
readability; it excludes setting values and agreement choices.

#### Submission checklist

- [x] I have tested this application on a real webOS TV.
- [x] I confirm that this submission complies with the repository rules.

#### AI-use declaration

- [ ] No AI tools were used.
- [ ] AI tools were used for limited assistance (for example, explanations, small snippets, or editing).
- [ ] AI tools were used for research or planning; the application was developed by a human.
- [x] AI coding agents were used; an experienced developer has reviewed and tested all generated code.
- [ ] The application was produced primarily by AI without meaningful human development or review.
- [x] Other (please describe below).

I used AI tools extensively for research, implementation, documentation, and
tests. I set the product and privacy requirements, directed revisions,
reviewed app behavior and wording, and supplied observations from my TV. I take
responsibility for this submission.

#### Compatibility and testing

I expect the app to work on webOS 6 and later. I tested it on my LG C6
(OLED77C6HUP), running webOS 26 / Rockhopper 11.2.0-3512, firmware 43.21.79.
Earlier webOS releases have not been tested. Setting availability depends on
the TV's model, software, firmware, and permissions.

#### Submission details

- Release: [LGPrivacyShield 0.4.0](https://github.com/snapetech-org/LGPrivacyShield/releases/tag/v0.4.0)
- License: AGPL-3.0-only
- Listing: `packages/org.privacyshield.webos.yml`

I listed it in Homebrew's system category and open-source `main` pool, with
paired dark and light screenshots. I also included my Ko-fi link for support:
[ko-fi.com/snapetech](https://ko-fi.com/snapetech).

#### Validation

The 0.4.0 candidate passed 59 Node.js tests, 49 Python tests, and 18 packaged
app browser checks. The Homebrew IPK verifier reports ES2017 support on the
webOS 6.4.0 and later profiles. It marks runtime APIs as `polyfill?` on 6.4.0,
so that oldest claimed profile still needs manual testing; it reports native
runtime APIs on 7.4.0 and later. Earlier webOS releases have not been tested.
