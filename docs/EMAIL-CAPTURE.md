# Standalone weekly email capture

This capture is separate from the account-linked saved-chart digest. It sends
only a normalized email address and an optional, self-declared sun-sign slug to
the configured email provider. It never reads or sends chart, birth-date,
birth-time, birthplace, profile, or saved-chart data.

The static component is omitted from built HTML unless `EMAIL_PROVIDER` names a
fully configured adapter. All three placements use the same
`src/components/EmailCapture.astro` component. The birth-chart placement stays
hidden until a full chart has been computed in the browser.

## Provider configuration

Choose exactly one provider with `EMAIL_PROVIDER=resend|buttondown|loops`.

### Resend

Required:

- `RESEND_API_KEY` — server-only Resend key.
- `RESEND_FROM_EMAIL` — verified sender used for the plain-text confirmation.
- `EMAIL_CONFIRM_SECRET` — at least 32 characters; signs the 48-hour opt-in
  token. Rotate only after allowing outstanding confirmation links to expire.

Optional:

- `EMAIL_CONFIRM_BASE_URL` — HTTPS origin; defaults to `https://zodiacs.org`.
- `RESEND_SEGMENT_ID` — segment added only after confirmation.
- `RESEND_SIGN_PROPERTY` — contact property for the selected sign; defaults to
  `sun_sign`.

Resend has no provider-native double-opt-in contact flow in this integration.
The adapter therefore sends a first-party signed confirmation link without
creating a contact. Link `GET` is read-only to tolerate mail scanners; an
explicit form `POST` creates the contact. A replay is a no-op, and the confirm
endpoint never updates an existing contact because doing so could reverse an
earlier unsubscribe. Contact creation follows Resend's
[Contacts API](https://resend.com/docs/api-reference/contacts/create-contact).

### Buttondown

Required:

- `BUTTONDOWN_API_KEY` — server-only API key with subscriber write access.

The adapter deliberately omits Buttondown's `type` field. Buttondown therefore
creates an `unactivated` subscriber and sends its native double-opt-in message.
The selected sign is stored in subscriber metadata as `sun_sign`. Duplicate
submissions are treated as a neutral pending response and never overwrite
existing consent history. This behavior is the documented default for
[creating a Buttondown subscriber](https://docs.buttondown.com/api-subscribers-create).

### Loops

Required:

- `LOOPS_FORM_ENDPOINT` — the account's exact
  `https://app.loops.so/api/newsletter-form/...` endpoint.
- `LOOPS_DOUBLE_OPT_IN_CONFIRMED=1` — operator acknowledgement that double
  opt-in is enabled in Loops Settings → Sending and the confirmation email is
  published. Without this acknowledgement the site hides the component.

Optional:

- `LOOPS_MAILING_LIST_ID` — a public mailing-list ID.
- `LOOPS_SIGN_PROPERTY` — pre-created contact-property API name for the sign;
  defaults to `sunSign`.

Loops currently gates double opt-in on form endpoints, not Contacts API calls,
so this adapter accepts only the provider's form endpoint. The endpoint has
provider-managed rate limits. See Loops' [double opt-in](https://loops.so/docs/contacts/double-opt-in)
and [custom form](https://loops.so/docs/forms/custom-form) documentation.

## Contract tests

`src/lib/email/email.test.ts` covers visibility gating, input minimization,
token expiry/tampering, scanner-safe Resend confirmation, and an end-to-end
mocked request from `/api/email/subscribe` through the Buttondown adapter. Run:

```sh
npm test -- --run src/lib/email/email.test.ts
```
