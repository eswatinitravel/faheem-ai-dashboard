# Impeccable (third-party)

The anti-pattern detector used here is Impeccable by Paul Bakaus
(https://github.com/pbakaus/impeccable, https://impeccable.style), version 4.8.0,
licensed under the Apache License 2.0 (see LICENSE in this folder).

Faheem AI Dashboard does not modify Impeccable. It installs the official npm
package `impeccable` and runs its `detect` command; `rules.json` is the
unmodified output of `impeccable detect --list-rules --json`.
Telemetry is turned off on every call (IMPECCABLE_NO_TELEMETRY=1, DO_NOT_TRACK=1).
