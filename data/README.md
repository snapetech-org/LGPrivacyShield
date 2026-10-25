# Firmware catalog data

`lg-oled-firmware-catalog.json` is generated from the public EPK Firmware
Archive index at <https://tv.slada.sk/processed_fw.json>. The matching
`webos-app/src/firmware-catalog-data.js` embeds the same records in the
installable app.

The checked-in snapshot was retrieved on 2026-10-24. Its SHA-256 is
`f27b1f8aed59da60b48fcdabd534ffff72cb84ad8d90ab1c59fd92829b0b2269`.
It contains 405 checksummed package records for 525 exact model codes across
B1–B6, C1–C6, and G1–G6. The records preserve model suffixes, regions, firmware
and platform versions, OTA IDs, archive URLs, and ZIP/EPK checksums.

This is maintainer research data. It contains no firmware image, extracted
settings registry, current preference value, or proof that a setting works on
a physical TV. It is not loaded by the app or included in the installable IPK.

Regenerate both outputs after downloading the source index:

```sh
python3 scripts/build_firmware_catalog.py --input /path/to/processed_fw.json
```

The source snapshot did not identify its original author or license. The
project owner has chosen to retain this source-only research data; it is not
included in the TV IPK. Remove the catalog if its source owner requests it.
This project makes no claim that the archive metadata is LG-authored or covered
by LGPrivacyShield's AGPL-3.0-only license.
