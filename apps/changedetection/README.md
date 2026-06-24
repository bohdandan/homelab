# ChangeDetection

Tracked notes for ChangeDetection watches that are operationally important.

## Passport Queue Watch

Desired watch definition: `config/passport-queue-watch.json`.

Purpose:

- Monitor `https://london.pasport.org.ua/solutions/e-queue`.
- Use the browser-backed fetcher because the site rejects the default HTTP fetcher.
- Watch only `div[role="alert"]`.
- Notify via ntfy topic `passport-queue` when the alert block changes, especially when `Наразі всі місця зайняті.` disappears.

The watch is currently applied through the ChangeDetection API after deployment.
