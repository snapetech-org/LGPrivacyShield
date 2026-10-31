#### Expected TV scope and QR feedback

We expect LGPrivacyShield to support all 18 LG OLED model families—B1–B6,
C1–C6, and G1–G6—on webOS 6.x, 22, 23, 24, 25, and 26. Every family is in
scope on every listed version, including after a TV receives a software update
beyond its launch-year version.

When a TV is unmapped or a control cannot be read, scanning the app's QR code
opens a prefilled GitHub compatibility form. Owners can review it, add an
optional region or menu-path observation, and submit it as a public issue. The
report includes model and software details plus control-read results, but no
current setting values or agreement choices. These reports tell us which
controls are readable across models, software versions, and regions, helping
us spot gaps and improve the compatibility maps.

#### What LGPrivacyShield does

I built LGPrivacyShield to help me review and change the privacy settings my LG
TV exposes. Overview shows the model, software, Live Plus, and voice status.
Controls lets me change supported settings, verify each change, and save
settings to restore later. I can also review saved LG agreement choices and
their documented effects. Dark mode is the default; my light-theme choice is
saved on the TV.

The app runs locally using webOS settings services and sends no app data during
normal use. The TV's system software and other apps may still use the network;
LGPrivacyShield does not monitor that traffic. It does not record audio or
screenshots, run a background service, inspect encrypted network traffic, or
upload TV settings or viewing activity. Network destination history requires
separate router or DNS logs. A software voice switch cannot disconnect a
physical microphone unless the TV exposes a verified disconnect control to the
app.

#### Expected TV compatibility scope

We expect LGPrivacyShield to support all 18 LG OLED model families: B1–B6,
C1–C6, and G1–G6. Every family is in scope on webOS 6.x, 22, 23, 24, 25, and 26,
including versions newer than the TV's launch-year software:

| TV generation | B family | C family | G family | Expected webOS versions |
|---|---|---|---|---|
| 2021 | B1 | C1 | G1 | 6.x, 22, 23, 24, 25, 26 |
| 2022 | B2 | C2 | G2 | 6.x, 22, 23, 24, 25, 26 |
| 2023 | B3 | C3 | G3 | 6.x, 22, 23, 24, 25, 26 |
| 2024 | B4 | C4 | G4 | 6.x, 22, 23, 24, 25, 26 |
| 2025 | B5 | C5 | G5 | 6.x, 22, 23, 24, 25, 26 |
| 2026 | B6 | C6 | G6 | 6.x, 22, 23, 24, 25, 26 |

The settings map follows the model family and installed webOS version, so a TV
updated to a later release uses its current software profile. Available
controls depend on the TV's model, region, firmware, and Homebrew access. A
setting appears only when its current value is readable, and changes are
confirmed by readback. I physically tested it on my LG C6 (OLED77C6HUP),
running webOS 26 / Rockhopper 11.2.0-3512, firmware 43.21.79. The Homebrew IPK
verifier reports ES2017 and runtime API support on webOS 6.4.0, 7.4.0, 8.3.0,
9.2.0, 10.2.0, and 11.2.0 profiles.

When a model is missing or a control cannot be read:

1. In Controls, I choose **Prepare compatibility report**.
2. I scan its QR code to open GitHub's form with the report prefilled in the
   link.
3. I submit the form to create a public issue for maintainers to review.

The report includes the TV model, software and firmware, profile and service
access, and whether each of the 17 controls could be read. It excludes current
setting values and LG agreement choices. I can add the TV region or a menu-path
observation before submitting. These reports let us compare which controls are
readable across models, software versions, and regions, spot coverage gaps, and
improve the model maps.

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

#### Submission details

- Release: [LGPrivacyShield 0.4.2](https://github.com/snapetech-org/LGPrivacyShield/releases/tag/v0.4.2)
- License: AGPL-3.0-only
- Listing: `packages/org.privacyshield.webos.yml`

I listed it in Homebrew's system category and open-source `main` pool, with
paired dark and light screenshots. I also included my Ko-fi link for support:
[ko-fi.com/snapetech](https://ko-fi.com/snapetech).

#### Current status

Version 0.4.2 is published. This listing uses the stable latest-release
manifest URL, which resolves to the matching IPK. The PR is ready for
maintainer review.

#### Validation

The 0.4.2 release passed 61 Node.js tests, 51 Python tests, and 18 packaged
app browser checks; `npm audit` found no vulnerabilities.
