# Privacy

YazNot is designed to keep note content and audio under the user's control. The
project does not operate a central backend and includes no analytics or
telemetry.

## What is stored, and where

| Data | Location | Notes |
|---|---|---|
| Notes, trash, settings | IndexedDB on the device | Keyed per account |
| Notes (cloud copy) | The Supabase project configured by the operator | `kv_store`, protected by RLS |
| Account sessions | localStorage on the device | One key per account |
| Automatic backups | `%APPDATA%\YazNot\backups` on Windows | Last seven per account |
| Speech model | Cache Storage on the device | Downloaded once, about 56 MB |
| Window size and position | `%APPDATA%\YazNot\window-state.json` | Desktop only |

## Speech-to-text

Audio is decoded and transcribed inside a Web Worker on the device. Recordings
and uploaded audio files are not sent to a server. The only network request is
the one-time model download from Hugging Face; each file is verified by size and
SHA-256 before it is cached.

## Network requests

The application talks to:

- the Supabase project URL in `ui/config.js` (authentication and note sync),
- Hugging Face (model download on first use),
- Google (only when the user chooses Google sign-in; the request is made inside
  the OAuth window).

No other endpoints are contacted. There is no crash reporting, advertising or
usage tracking SDK.

## Retention and deletion

- Trash records are removed after 30 days.
- Automatic backups keep the last seven snapshots per account; older files are
  deleted locally.
- Deleting an account in Supabase removes its `kv_store` and `shares` rows
  through foreign-key cascade. Local copies can be removed by clearing the
  application's site data or the Windows app data folder.

## Children and sensitive data

YazNot is a general-purpose note-taking tool. Operators are responsible for the
content they store and for complying with the laws that apply to them.

## Changes

This document describes the behaviour of the open-source client. If you deploy
your own instance, you are responsible for its privacy policy and for the
configuration of your Supabase project.
