---
name: spicetify-drive
description: Attach to the running Spotify desktop client over the Chrome DevTools Protocol to inspect or drive it — read Spicetify internals, run real GraphQL requests, measure computed styles and geometry, dispatch real key/mouse/wheel input, and take screenshots. Also covers the build → refresh → reload → attach loop for testing a Spicetify custom app or extension in the real client, including recovering the app's route from Spotify's error boundary. Use when a claim about Spotify's runtime needs verifying rather than guessing (does this GraphQL definition exist, what shape does it return, which element actually receives this click, does this scroll chain), or when the user asks to run, test, or screenshot a Spicetify app in Spotify.
---

# Driving Spotify over the debug port

Spotify is Chromium, so it speaks the DevTools Protocol. That turns guesses about
its private internals into measurements. Reach for this whenever the honest answer
would otherwise be "probably" — undocumented GraphQL definitions, Spotify's own
class names, computed styles, hit testing, scroll behaviour.

## Preconditions

The endpoint only exists if devtools are enabled:

```bash
grep always_enable_devtools "$(spicetify -c)"   # want: = 1
```

If it is `0`: `spicetify enable-devtools`, then relaunch Spotify.

**The port is 8088, not the usual 9222.** There is no `--remote-debugging-port`
flag on the process, so do not go looking for one.

```bash
curl -s http://127.0.0.1:8088/json | python3 -m json.tool   # find the xpui target
```

## Inspecting vs driving

### Inspect — cheap, do this freely

Attaching changes nothing. No build, no restart, no disruption. Use it constantly.

```bash
node .claude/skills/spicetify-drive/driver.mjs ./probe.mjs
```

```js
// probe.mjs
export default async (d) => {
  console.log(await d.eval(`Object.keys(Spicetify.GraphQL.Definitions).filter(k => /search/i.test(k))`));
};
```

Good for: does a definition exist; what does a GraphQL call actually return; what
are the computed styles; what does `document.elementFromPoint` return at these
coordinates; what is in the console.

Note it inspects **the installed build**, which may be older than the working
tree. Check before drawing conclusions:

```bash
ls -la "$(dirname "$(spicetify -c)")/CustomApps/<app>/"
```

### Drive — build, refresh, reload

Testing working-tree changes needs the code inside Spotify's xpui. Three steps,
and skipping the third is the classic mistake:

```bash
pnpm build                 # into the live CustomApps folder
spicetify refresh -a       # copies CustomApps into Spotify.app; PID unchanged
                           # then reload the client -- see below
```

Spotify keeps running throughout, so playback survives. The reload does blank the
UI mid-use and can leave the app's route on an error boundary, so say what you are
doing rather than cycling this repeatedly while the user watches.

**`-a` alone, never combined.** It copies both the app and its extension, because
this project builds `extension.js` into the CustomApps folder. `-e` is for the
standalone `Extensions/` directory and does nothing here. Measured by touching the
sources and watching what lands inside `Spotify.app`: `-a -e` copies **neither**
while still printing `success`, and `-l` is a `watch` flag that `refresh` quietly
treats as `-e`.

**Copying the files is not enough, and the failure is silent.** The running
renderer keeps serving the stylesheet and bundle it already parsed, so measuring
before a reload measures the **old** build while the correct file sits on disk —
indistinguishable from a fix that did not work. After reloading, confirm you are
looking at the new code before you believe any measurement:

```js
// the rule you just changed, as the client actually has it
await d.eval(`(() => {
  for (const s of document.styleSheets) {
    if (!(s.href || '').includes('<app-name>')) continue;
    for (const r of s.cssRules) if (/YourClass/.test(r.selectorText || '')) return r.cssText;
  }
})()`);
```

A full apply **is** required after Spotify itself updates: the update replaces
`Spotify.app` and takes the patch with it, so the custom app stops loading and the
debug port stops answering. Take a fresh backup in the same breath, because the
existing one describes the previous Spotify. Apply quits the client and does not
relaunch it:

```bash
spicetify backup apply && open -a Spotify && sleep 14
```

To tell whether the backup matches the installed client — and so whether this has
already been done — compare the version Spicetify recorded against the running one:

```bash
grep -A1 '^\[Backup\]' "$(spicetify -c)"      # version = 1.2.96.518.g366879e1
defaults read /Applications/Spotify.app/Contents/Info.plist CFBundleVersion
```

`always_enable_devtools` lives in the config and survives the update, but the patch
that acts on it does not, so the port comes back with the re-apply rather than
needing `enable-devtools` run again.

## Reloading, and Spotify's error boundary

"Something went wrong / Try reloading the page" is usually **a route-level error
boundary inside the main view, not a dead client.** The node lives under `MAIN`
inside `.Root__main-view`; the library sidebar, top bar and player keep working,
and `Spicetify.Platform` stays available throughout. So `Spicetify` being present
proves nothing, and neither does the chrome looking fine. The worse variant — the
client never finishing boot at all — is covered further down.

Two consequences that cost real time:

- **Scope the health check to the main view.** `document.body.innerText` cannot
  tell a dead client from one bad route, because the body contains both the
  boundary and the working chrome.
- **The boundary latches, and reloading restores the last route.** If that route
  is the one that failed, every reload lands straight back on it and re-latches.
  That looks like the reload being broken when it is the route.

Clicking the dialog's own `RELOAD PAGE` button is not a reliable escape: it only
helps if whatever broke was transient. Measured on one stuck client, twelve
clicks — six synthetic, six as real dispatched mouse events at the button's
centre — recovered nothing. **Navigate somewhere known-good first, then reload:**

```js
const reload = async (d, safeRoute = '/collection/tracks') => {
  // Park somewhere that renders, so the reload does not restore the broken route.
  await d.eval(`Spicetify.Platform.History.push({ pathname: ${JSON.stringify(safeRoute)} })`)
    .catch(() => {});
  await d.eval(`new Promise(r => setTimeout(r, 1500))`).catch(() => {});

  await d.send('Page.enable', {}).catch(() => {});
  await d.send('Page.reload', { ignoreCache: true });
  await d.waitFor(`window.Spicetify && Spicetify.Platform ? 1 : 0`, { timeout: 40000 });
  await d.eval(`new Promise(r => setTimeout(r, 3000))`).catch(() => {});

  const broken = await d.eval(
    `document.querySelector('.Root__main-view').innerText.includes('Something went wrong')`,
  ).catch(() => true);
  if (broken) throw new Error('main view still on the error boundary after reload');
};
```

Then navigate to the app route and confirm it mounted, rather than assuming.

### Why it happens, and why it is an app bug

The trigger is not the reload API and not a rebuild. `location.reload()` and CDP
`Page.reload` both produce it, no build or `refresh` is needed, and reloading a
healthy client parked on some other route is fine. What matters is **which route
is active when you reload**: Spotify restores the last route on startup, so
reloading while the custom app is open makes Spotify load the app bundle *during
its own boot* rather than on navigation.

Custom app bundles are usually written assuming the opposite. `Spicetify.React`,
`Spicetify.ReactDOM` and `Spicetify.Locale` do not exist for the first few
hundred milliseconds, and a bundle that touches any of them at module scope
throws when it is loaded that early. Measured on a failing boot:

```
app <script> tag appears at 762ms
Spicetify.Locale.getLocale     never became available
the app's global               never appeared
```

So the module never finished evaluating, and Spicetify's own initialisation
stalled behind it — `.Root__main-view` never rendered at all.

That means the symptom varies, which is what makes it confusing:

- sometimes the chrome renders and only the app's route shows the boundary
- sometimes the client never finishes booting, with no main view and no
  `Spicetify.Locale`

A stalled boot does not recover by reloading; quit and relaunch Spotify.

The durable fix belongs in the app, not the harness: gate the bundle the way
Spicetify extensions are already gated, so it waits for the globals rather than
assuming them.

```js
(async function () {
  while (!Spicetify.React || !Spicetify.ReactDOM || !Spicetify.Locale) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // ... bundle ...
})();
```

Until a project does that, treat "reload while the app route is open" as the
thing to avoid, and park elsewhere first.

`spicetify restart` is the heavier fallback — but it **quits Spotify without
relaunching it**, so follow it with `open -a Spotify` and wait for the port.

## Side effects, and putting things back

Driving a real client leaves marks. Save state first, restore after, and tell the
user what moved:

```js
// before
const before = await d.eval(`({
  pathname: Spicetify.Platform.History.location.pathname,
  context: Spicetify.Player.data?.context?.uri,
})`);

// after
await d.eval(`Spicetify.Platform.History.push({ pathname: ${JSON.stringify(before.pathname)} })`);
await d.eval(`Spicetify.Player.pause()`);
```

Playback position and the current track generally cannot be restored — say so
rather than implying it was. Watch for apps that persist to `localStorage`
(name-that-tune writes `name-that-tune:stats`); a test run can leave junk there.

To try a **light theme** without touching the user's actual theme, override the
Spicetify vars inline and remove them afterwards:

```js
await d.eval(`(() => { const s = document.documentElement.style;
  s.setProperty('--spice-main', '#ffffff'); s.setProperty('--spice-text', '#121212'); })()`);
// ... screenshot ...
await d.eval(`['--spice-main','--spice-text'].forEach(p => document.documentElement.style.removeProperty(p))`);
```

## Gotchas

Every one of these cost real debugging time, and every one presents as a bug in
the app rather than in the harness. Rule out the harness first.

**Input**

- **Printable characters must be a lone `char` event.** Pairing `char` with a
  `keyDown` that also carries `text` types everything twice — `bohem` arrives as
  `bboohheemm`. `d.type()` handles this.
- **Enter needs a real `keyDown` with `text: '\r'`.** A `rawKeyDown` suppresses the
  keypress, so Chromium never runs a form's default submit and the Enter appears
  to do nothing. `d.key('Enter', 13)` handles this.
- **Dispatch real events, never `el.value = x`.** Spotify's UI is React, and
  assigning to `value` does not drive a controlled input.

**Selectors**

- **Spotify's chrome answers to generic selectors.** `input[role=combobox]` is the
  main search bar, and its design-system class names contain words like
  `tertiary`, so a `className.includes(...)` filter over every `button` can match
  its chrome before it reaches yours. Scope to something app-specific.
- **`[class*=...]` also matches your own longer class names.**
  `[class*="app__input"]` matches the input *and* its `app__inputContainer`, and
  the container wins on document order. The symptom is `d.clear()` throwing
  `TypeError: Illegal invocation`, because the value setter it borrows from
  `HTMLInputElement.prototype` lands on a `div`. Lead with the tag:
  `input[class*="app__input"]`.
- **`d.clickText` matches the full trimmed text, not a prefix.** A label that grew
  a suffix — `Skip` becoming `Skip +1s` — stops matching, and reads as the button
  having vanished. Use a structural selector when the label is dynamic.

**Navigation**

- **`History.push` to the route you are already on does not re-fire an extension's
  `History.listen`.** Body classes the extension owns therefore do not update,
  which looks like the app failing to set them. Navigate away and back to test
  that path for real.

**Window state**

- **Wheel events need a visible window; key and click events do not.** Scrolling
  is handled by the compositor, which stops running when the window is hidden or
  minimised, so the event neither scrolls nor gets acknowledged and an awaited
  dispatch hangs forever. Because everything else keeps working, this reads as
  `d.wheel` alone being broken. `d.wheel` now checks `document.hidden` and says
  so; bring Spotify to the front for scroll checks:

  ```js
  await d.eval(`({ hidden: document.hidden, visibility: document.visibilityState })`);
  ```

## Driver API

`driver.mjs` needs no dependencies (Node's built-in `WebSocket`). Your script
default-exports an async function taking `d`:

| | |
|---|---|
| `d.eval(expr)` | evaluate in the page, by value, awaits promises |
| `d.waitFor(expr, {timeout})` | poll until truthy |
| `d.type(str, delay?)` | printable text as real key events |
| `d.key(name, keyCode)` | ArrowUp 38, ArrowDown 40, Enter 13, Escape 27, Tab 9 |
| `d.clear(selector)` | empty a React-controlled input |
| `d.click(selector)` / `d.clickText(text, tag?)` | real mouse events |
| `d.wheel(selector, deltaY)` | for overscroll / scroll-chaining checks |
| `d.shot(path)` | PNG screenshot |
| `d.consoleLines` | captured console output |
| `d.send(method, params)` | any raw CDP call |

**`d.eval` has no timeout.** It sets `awaitPromise`, so an expression whose promise
never settles hangs the whole run with no output — and if you piped through `tail`,
no partial output either, which looks like the client being stuck rather than your
own probe. Race anything network-bound:

```js
await d.eval(`Promise.race([
  Spicetify.GraphQL.Request(Spicetify.GraphQL.Definitions.searchSuggestions, { query: 'test', limit: 5 }),
  new Promise(r => setTimeout(() => r({ timedOut: true }), 5000)),
])`);
```

Log progress with timestamps in any probe that does more than a couple of steps,
so a hang points at the step rather than the harness.

## Worked checks

**Does a GraphQL definition exist, and what does it return?** Definitions are
persisted queries (`{name, operation, sha256Hash, value: null}`) — there is no
local AST to read, so run it and inspect the response, wrapped in the race above.
The server validates variables against the stored operation, so a wrong variable
set gives `HttpResponseError`; different operations take different variables.

**Which element really receives a click?** Settles overlay questions that reading
CSS cannot.

```js
await d.eval(`(() => {
  const r = document.querySelector('button').getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
  return hit.tagName + '.' + hit.className;
})()`);
```

**Does scrolling chain to the page?** Wheel past the end and watch every
scrollable ancestor — if one moves off 0, the inner element needs
`overscroll-behavior: contain`.

## Reporting

Quote the measurement, not the impression: "ancestor `scrollTop` went 0 → 12"
beats "it seems to scroll the page". When a fix is verified, show before and
after from the same probe.

If the harness is what misbehaved, say so rather than reporting it as an app bug —
and if you have already reported it the other way round, correct it plainly.
