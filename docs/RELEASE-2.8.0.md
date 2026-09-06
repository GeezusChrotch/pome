# Pome 2.8.0 release verification

The release preserves the approved settings and two-step touch implementation.
The approved installed candidate used version 2.7.0, so the public update uses
2.8.0 to distinguish it from the previous public release.

## Artifact identity

- Approved candidate: `Pome-two-step.pbw`
- Candidate SHA-256: `1a3c6569e2734efb4bf3c56a2d6c29aeaf8bef294efbfcc7a97406c338a57311`
- Release: `Pome-2.8.0.pbw`
- Release SHA-256: `e6a0ae44f57360c1e627a7f9de1c2fdebd5ab08ced919ce2bee5ba175d803921`

Before the version bump, every uncompressed package entry matched the approved
candidate byte-for-byte. Following the version bump and clean build:

- JavaScript, its source map, and both platform resource packs are byte-identical.
- `appinfo.json` changes only `versionLabel` from 2.7.0 to 2.8.0.
- Both watch binaries retain identical lengths and executable content. Differences
  are confined to version byte 13, checksum bytes 20–23, resource timestamp bytes
  124–127, and the GNU build-ID bytes 148–167. All bytes from offset 168 onward
  are identical. SDK ELF section inspection confirms executable code begins at 168.
- Platform manifests change only build timestamps and application checksums.
- ZIP packaging timestamps may differ.

## Gates

JavaScript syntax, pinned-scene persistence, group controls, voice controls,
theme controls, whitespace checks, and clean Basalt/Emery builds passed.
The release pass performed no watch or Mac installation. Hardware approval applies
to the candidate identified above; the release differs only in version/build metadata.

GitHub hosts the source, these settings instructions, and the release PBW.
Pebble Appstore publication is coordinated separately; this record does not
claim dashboard publication.
