# RN `<Text>` issue/PR survey

A ranked survey of `react/react-native` (formerly `facebook/react-native`,
which now redirects there) issues and unmerged PRs about `<Text>`, gathered
from GitHub search sorted by reaction count plus keyword sweeps
(`numberOfLines`, `letter-spacing`, `adjustsFontSizeToFit`, `selectable`,
`writingDirection`, `onTextLayout`, etc.). Purpose: know what people are
actually hitting in core, so we can check whether `PlainText` inherits the
same bug, is structurally immune to it, or represents a feature gap worth
closing.

Entries tagged **[NESTED TEXT]** are about `<Text>` containing other `<Text>`/
views (styling inheritance, touch targets, alignment, layout introspection of
fragments). `PlainText` is deliberately non-nested — see
[rn-text-history.md](rn-text-history.md#what-this-means-for-plaintext) — so
these don't concern us unless nesting support is ever considered.

Numbers are reaction counts (all emoji) at the time of the survey
(2026-09-03).

### A note on "closed" vs "merged"

RN doesn't merge PRs through GitHub's own Merge button. `facebook-github-bot`
imports each PR into Meta's internal Phabricator, it lands there, and the PR
is then **closed** on GitHub — so the REST API reports `state: closed`,
`merged: false` even for PRs that genuinely shipped. The only reliable tell is
a bot comment on the PR itself: *"This pull request was successfully merged by
@X in `<sha>`"* (or the older *"This pull request has been merged in
`<sha>`"*). `merge_commit_sha` on the PR object is not reliable either — GitHub
populates it with a speculative test-merge commit for many closed/open PRs
regardless of outcome, and that commit is often unreachable/GC'd
(`404` when fetched directly). Every "unmerged" / "merged" tag below was
checked against the actual bot comment, not the API's `merged` field or issue
`state_reason`.

## Already fixed here

- **Line-height clipping on iOS** — RN's
  [PR #46884](https://github.com/react/react-native/pull/46884) (97
  reactions, 43 comments, unmerged since 2024-10) is still open upstream.
  `PlainText` fixed the equivalent bug in
  [`3e1e134`](https://github.com/callstack/rn-plain-text/commit/3e1e13415004c4b4215d14152d28a99e88826811)
  ("fix(ios): line height clipping",
  [#8](https://github.com/callstack/rn-plain-text/pull/8)).

## Already implemented on both RN Text and PlainText

- **`text-transform` CSS support** —
  [#2088](https://github.com/react/react-native/issues/2088), closed, 97
  reactions, 94 comments, filed 2015. Despite the huge reaction count, this
  is stale: RN core shipped `textTransform` years ago, and `PlainText`
  implements it on both platforms
  ([PlainText.tsx:94](../../src/PlainText.tsx),
  [PlainTextView.kt](../../android/src/main/java/com/mdjstack/plaintext/PlainTextView.kt),
  [PlainTextTextTransform.mm](../../ios/PlainTextTextTransform.mm)). High
  reaction counts on old issues aren't a reliable signal of what's still
  missing — check current behavior before trusting the number.

## Merged/shipped upstream (found during this survey)

These looked like open gaps from their reaction counts or from
GitHub's `state`/`merged` flags, but turned out to already be implemented in
RN core — either landed through the internal-Phabricator flow described
above, or resolved as part of a checklist issue. Pulled out of the ranked
list below so it stays a list of things that are actually still open.

- **`[w3c]` Web Styles umbrella issue** —
  [#34425](https://github.com/react/react-native/issues/34425), closed, 98
  reactions. A checklist issue, not a single fix — checked its actual task
  list: **55 of 74 checkboxes are ticked (~74%)**, and every remaining
  unchecked one is a `View`/`Image` border-logical-property or `objectFit`
  detail, nothing `Text`-specific. The `Text`-relevant tasks are **all
  done**: `fontVariant` space-separated values
  ([#34641](https://github.com/react/react-native/pull/34641),
  [#36740](https://github.com/react/react-native/pull/36740)), numeric
  `fontWeight` ([#34598](https://github.com/react/react-native/pull/34598)),
  `userSelect` as a `selectable` equivalent
  ([#34575](https://github.com/react/react-native/pull/34575)), and
  `verticalAlign` mapping to `textAlignVertical`
  ([#34567](https://github.com/react/react-native/pull/34567)). One thing
  the issue's example code dangled but never turned into a tracked
  checkbox: a **`textShadow` CSS shorthand** for `Text` (`View` did get an
  equivalent `boxShadow` shorthand later, shipped separately from this
  issue) — `TextStyle` still only exposes the longhand
  `textShadowColor`/`textShadowOffset`/`textShadowRadius` props, confirmed
  against current `react/react-native` sources. Not a gap versus RN,
  though: `PlainText` also only implements the longhand props
  ([Props.h](../../android/src/main/jni/react/renderer/components/RNPlainTextSpec/Props.h)),
  so the two are at parity here.
- **`lineBreakStrategy` for Text/TextInput** —
  [#31272](https://github.com/react/react-native/pull/31272), 10 reactions.
  Landed internally as `048194849bda980eecf7bb006ca4e71e2d60ff4c`, confirmed
  by `react-native-bot`'s "successfully merged" comment, despite the API
  reporting `merged: false`. Shipped: iOS-native line-break strategies (e.g.
  hangul word priority, push-out).
- **Android ignores soft hyphen `­`** —
  [#28279](https://github.com/react/react-native/issues/28279), 10
  reactions. Fixed by merged PR
  [#29258](https://github.com/react/react-native/pull/29258), landed as
  `7d8aeb4955a4101ca7e8e486f935309c21ab76ff`.
- **`maxFontSizeMultiplier` not respected** —
  [#47499](https://github.com/react/react-native/issues/47499), 4 reactions.
  Fixed by [#47614](https://github.com/react/react-native/pull/47614) (3
  reactions), actually merged as `c0e6523d0ffed85f9fd596182097f97b79fe8af0`
  per its `react-native-bot` comment, though the API shows `merged: false`.
- **Remove gating for "optimized text"** —
  [#45317](https://github.com/react/react-native/pull/45317), 4 reactions.
  Landed as `9fbc904592f65ca8dd5ded189326563fcec924ea`, confirmed via
  `facebook-github-bot`'s "has been merged in" comment. See
  [caching.md](caching.md) for how our own caching compares.

## Ranked list

1. **Native text selection ("click and hold")** —
   [#13938](https://github.com/react/react-native/issues/13938), open, 91
   reactions, 54 comments, open since 2017; companion unmerged PR
   [#56236](https://github.com/react/react-native/pull/56236) (iOS native
   selection).
2. **Android 15/16 text clipping/measurement cluster** —
   [#53286](https://github.com/react/react-native/issues/53286) (48, still
   open — its own linked fix [#53344](https://github.com/react/react-native/issues/53344)
   never shipped), [#56402](https://github.com/react/react-native/issues/56402)
   (31, open), [#53666](https://github.com/react/react-native/issues/53666)
   (10, open), plus unmerged fix PR
   [#57117](https://github.com/react/react-native/pull/57117). Two narrower
   duplicates from the same cluster **are** actually fixed:
   [#56185](https://github.com/react/react-native/issues/56185) (17) and
   [#56186](https://github.com/react/react-native/issues/56186) (16) were
   closed by the merged PR
   [#56282](https://github.com/react/react-native/pull/56282) (landed as
   `5964a197a309bbff45b1eff8ef1d85d139407ddb`) — confirmed via its
   `react-native-bot` "successfully merged" comment. So this is a real,
   still-open bug, not fully resolved despite one round of fixes landing.
   PR [#54721](https://github.com/react/react-native/pull/54721) remains
   unmerged. Worth explicitly verifying `PlainText` doesn't inherit any of
   this, since it's about Fabric's `TextLayoutManager` visual-bounds math,
   which we don't use.
3. **`Touchable` + `Text` "cannot transition" error** —
   [#1693](https://github.com/react/react-native/issues/1693), closed, 73
   reactions. Paper-era, but shows Text's gesture-responder fragility.
4. **Line-height behaves differently iOS vs Android** —
   [#10712](https://github.com/react/react-native/issues/10712), closed, 73
   reactions.
5. **Long text in inverted `FlatList` tanks Android perf** —
   [#30034](https://github.com/react/react-native/issues/30034), closed **not
   planned** — 41 reactions, 81 comments, but never fixed.
6. **[NESTED TEXT] Nested views inside `<Text>`** —
   [#26577](https://github.com/react/react-native/issues/26577) (22) plus
   decade-old attempts that were closed without ever landing —
   confirmed genuinely abandoned, no merge-bot comment on any of them:
   [#7304](https://github.com/react/react-native/pull/7304) (iOS),
   [#8619](https://github.com/react/react-native/pull/8619) and
   [#23195](https://github.com/react/react-native/pull/23195) (Android, two
   separate attempts).
7. **`fontWeight: 'bold'` cuts off text** —
   [#21729](https://github.com/react/react-native/issues/21729), closed, 25
   reactions, 45 comments.
8. **Custom-font width measurement wrong** —
   [#25481](https://github.com/react/react-native/issues/25481), closed **not
   planned** — 25 reactions, never fixed.
9. **[NESTED TEXT] Nested View/Text vertical alignment** —
   [#31955](https://github.com/react/react-native/issues/31955), open since
   2021, 24 reactions.
10. **Font size randomly shifts** —
    [#2519](https://github.com/react/react-native/issues/2519), closed, 24
    reactions.
11. **Font-weight issue with custom fonts on RN 0.83** —
    [#54934](https://github.com/react/react-native/issues/54934), closed, 23
    reactions.
12. **`allowFontScaling={false}` ignored on Android** —
    [#17898](https://github.com/react/react-native/issues/17898), closed, 20
    reactions. Shared text-scaling pipeline bug (reported against
    `TextInput` but the mechanism is shared with `Text`).
13. **[NESTED TEXT] Nested `<Text>` + `onPress`/`TouchableOpacity` bug** —
    [#27549](https://github.com/react/react-native/issues/27549), open, 19
    reactions.
14. **[NESTED TEXT] `textAlignVertical` broken on nested Android text** —
    [#30375](https://github.com/react/react-native/issues/30375), open, 18
    reactions.
15. **[NESTED TEXT] Custom fonts not applied on nested Text (Android)** —
    [#20398](https://github.com/react/react-native/issues/20398), closed, 18
    reactions.
16. **LineHeight weird on specific fonts (Android)** —
    [#29232](https://github.com/react/react-native/issues/29232), open, 18
    reactions.
17. **Incorrect font scaling with `adjustsFontSizeToFitWidth`** —
    [#52642](https://github.com/react/react-native/issues/52642), open, 17
    reactions. See our own
    [adjusts-font-size-to-fit.md](adjusts-font-size-to-fit.md).
18. **[NESTED TEXT] `onLayout`/`.measure()` broken for nested Text** —
    [#11650](https://github.com/react/react-native/issues/11650), closed, 14
    reactions.
19. **Auto-adjust font size to fit request** —
    [#728](https://github.com/react/react-native/issues/728), closed, 14
    reactions, one of the oldest open asks (later partially shipped as
    `adjustsFontSizeToFit`).
20. **Android `TextView` doesn't support letter-spacing/padding combo** —
    [#3233](https://github.com/react/react-native/issues/3233), closed, 14
    reactions.
21. **RTL layout bug in Text** —
    [#10812](https://github.com/react/react-native/issues/10812), closed, 13
    reactions.
22. **`textAlign` renders on wrong side (0.59.3)** —
    [#24267](https://github.com/react/react-native/issues/24267), closed, 13
    reactions.
23. **`adjustsFontSizeToFit` not working** —
    [#20906](https://github.com/react/react-native/issues/20906), closed, 13
    reactions. Distinct concrete repro from #19 above.
24. **Extra line-wrap with `lineHeight`+`letterSpacing` combos** —
    [#46436](https://github.com/react/react-native/issues/46436), open, 10
    reactions.
25. **Multi-line Text can no longer size-to-content** —
    [#54571](https://github.com/react/react-native/issues/54571), open, 10
    reactions, regression.
26. **`selectable` prop's selection highlight invisible** —
    [#33494](https://github.com/react/react-native/issues/33494), closed **not
    planned** — 9 reactions, never fixed.
27. **Text inside `FlatList` not selectable on Android** —
    [#26264](https://github.com/react/react-native/issues/26264), closed, 9
    reactions.
28. **Proposal: improved box and text shadows** —
    [#26110](https://github.com/react/react-native/issues/26110), closed, 8
    reactions, feature proposal.
29. **`color="transparent"` ignored on Android `<Text>`** —
    [#53343](https://github.com/react/react-native/issues/53343), open, 8
    reactions (RN 0.81).
30. **[NESTED TEXT] Accessibility for nested text components** —
    [#32004](https://github.com/react/react-native/issues/32004), open, 6
    reactions.
31. **`onTextLayout` not firing** —
    [#37902](https://github.com/react/react-native/issues/37902), open, 6
    reactions.
32. **`letter-spacing` breaks line-wrap positions** —
    [#29958](https://github.com/react/react-native/issues/29958), closed, 5
    reactions.
33. **Aligning icon baseline with text baseline** —
    [#49144](https://github.com/react/react-native/issues/49144), open, 3
    reactions, niche but recurring layout ask.
34. **Support slashed-zero `font-variant`** —
    [#39523](https://github.com/react/react-native/issues/39523), closed **not
    planned** — 2 reactions, minor typography request, never shipped.

## Reading this list

- The Android 15/16 clipping family (#2) and line-height/vertical-centering
  math (#4, #16, #24) are one underlying theme: RN's text-measurement code
  has never fully reconciled font metrics (ascent/descent) with layout bounds
  across platform versions, recurring across 6+ years of issues. Worth a
  standing check that `PlainText` doesn't reproduce it, since it measures
  with the platform widget instead of Fabric's `TextLayoutManager` (see
  [rn-text-history.md](rn-text-history.md)).
- **[NESTED TEXT]** entries (#6, #9, #13, #14, #15, #18, #30) are out of
  scope by design.
- See [merged/shipped upstream](#mergedshipped-upstream-found-during-this-survey)
  above for items that looked open here at a glance but actually landed —
  `lineBreakStrategy`, soft-hyphen support, `maxFontSizeMultiplier`, the
  `[w3c]` Web Styles checklist, and the internal text-measurement-cache PR.
- Genuine standalone feature gaps that could plausibly apply to `PlainText`:
  native selection (#1) and text/box shadow (#28) — both still open/rejected
  upstream with real demand behind them.
- Confirmed **closed as "not planned"**, i.e. reactions never translated into
  a fix: `FlatList` perf (#5), custom-font width measurement (#8), selectable
  highlight visibility (#26), slashed-zero font-variant (#34). These are
  genuinely unresolved upstream, not stale-but-fixed.
- High reaction counts don't imply "still missing," and "closed" doesn't
  imply "fixed" (see the note on RN's merge flow above) — always check the
  actual bot comment or current behavior before trusting either signal (see
  #2088 above).
