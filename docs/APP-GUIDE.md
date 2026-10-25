# PrivacyShield app guide

## Contents

- [Overview](#overview)
- [Controls](#controls)
- [LG agreements](#lg-agreements)
- [About](#about)
- [Remote and appearance](#remote-and-appearance)
- [Availability and reports](#availability-and-reports)

For installation, see the [TV guide](TEST-ON-YOUR-TV.md). The [documentation index](README.md) links to setting, agreement, and compatibility references.

Screenshots are 1920×1080 captures using synthetic C5/webOS 25 data. They show page layout and navigation; they do not represent live TV values or guarantee that a control is available on another TV. Click a screenshot to open the full-size image.

## Overview

<a href="screenshots/overview.png"><img src="screenshots/overview.png" width="640" alt="Overview showing model, software version, Live Plus, and voice settings"></a>

Overview shows the TV model, software version, current Live Plus and voice settings, and the **Review controls** button. **Refresh** in the footer reads the TV again.

## Controls

<a href="screenshots/controls-top.png"><img src="screenshots/controls-top.png" width="640" alt="Controls showing preset and first available settings"></a>

<a href="screenshots/controls-bottom.png"><img src="screenshots/controls-bottom.png" width="640" alt="Controls showing later available settings"></a>

Controls lists settings mapped to the connected TV and software. Settings the TV does not expose are left out. A mapped setting stays read-only until PrivacyShield reads its current value. After a change, the app reads it again to check the result.

**Save current settings** stores readable values as a restore point that stays available after restoring; save again to replace it. If no restore point exists, PrivacyShield saves the starting values before the first change. **Apply recommended settings** changes readable controls that have a recommended value; **Restore saved settings** applies the saved values.

The position indicator and progress bar show where you are in the available list. Use Up and Down on the remote to move between controls.

When no controls are mapped, Controls shows that status and offers a compatibility report. It also offers a report when mapped controls cannot be read.

## LG agreements

<a href="screenshots/agreements-top.png"><img src="screenshots/agreements-top.png" width="640" alt="LG agreements showing saved choices and their effects"></a>

<a href="screenshots/agreements-bottom.png"><img src="screenshots/agreements-bottom.png" width="640" alt="LG agreements showing required terms and the action to open LG User Agreements"></a>

The page shows saved agreement choices and summaries of documented accepted and declined effects. The Privacy Policy and Terms of Use are marked as required for LG smart services. Additional agreements from the TV appear with an **Effect not mapped** label when PrivacyShield has not verified their effects.

Choose **Open LG User Agreements** to review or change a choice in LG's screen. PrivacyShield refreshes saved status when you return.

## About

<a href="screenshots/about.png"><img src="screenshots/about.png" width="640" alt="About showing local operation, license, source code, and a Ko-fi support QR code"></a>

About shows the app version, explains local operation, links to the license and source code, and provides a QR code and link for donations and support at [ko-fi.com/snapetech](https://ko-fi.com/snapetech).

## Remote and appearance

Use the arrow keys to move between tabs, controls, and buttons. Press OK to select or toggle. Back returns to Overview, then exits the app. A setting change is reported as successful only after the TV returns the new value.

PrivacyShield starts in dark theme. Choose **Use light theme** in the header to switch. The preference is saved locally on the TV. With the remote, press Up from the section tabs to reach the theme button, press OK, then press Down to return to the current section.

## Availability and reports

Control availability depends on the TV model, region, software, and Homebrew permissions. A setting appears when the TV profile maps it; its switch is enabled only when the TV returns a readable value. See [device compatibility](DEVICE-COMPATIBILITY.md) and [setting effects](FEATURE-IMPACT.md) for details.

When no profile matches the TV, or a mapped setting is unavailable, choose **Prepare compatibility report** in Controls. The app builds the report locally and shows one QR code. Scan it with a phone to open GitHub's form with the report included. Review and submit the form to create a public issue. The report contains model and software versions, service access, and yes/no results for whether each control returned a value. It excludes setting values and agreement choices.
