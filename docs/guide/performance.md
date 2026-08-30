# Performance

## Summary

Compared with RN `<Text>` rendering the same content on the same device:

|                          | iOS           | Android     |
| ------------------------ | ------------- | ----------- |
| Time to mount 1000 views | 13–21% faster | ~30% faster |
| Memory per mounted view  | 15–25% less   | ~33% less   |

Time to mount covers input dispatch, React render, Fabric commit, Yoga layout
with text measurement, and native view creation, but not rasterization. It is
the `event` entry duration reported by `PerformanceObserver`, the RN metric
closest to INP on the web. Self-measured from the example app: see
[measuring.md](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/docs/agent/measuring.md)
for the method and
[performance.md](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/docs/agent/performance.md)
for per-run data.

## Detailed results

<details>
<summary>Measured numbers behind the percentages</summary>

Time to mount 1000 views, release builds:

|                            | `PlainText` | RN `Text` | Difference |
| -------------------------- | ----------- | --------- | ---------- |
| Android, small (Pixel 3)   | 502 ms      | 716 ms    | 30% faster |
| Android, regular (Pixel 3) | 505 ms      | 724 ms    | 30% faster |
| Android, large (Pixel 3)   | 504 ms      | 718 ms    | 30% faster |
| iOS, small (iPhone 16)     | 142 ms      | 164 ms    | 13% faster |
| iOS, regular (iPhone 16)   | 144 ms      | 171 ms    | 16% faster |
| iOS, large (iPhone 16)     | 165 ms      | 210 ms    | 21% faster |

Memory per mounted view:

| Text size        | `PlainText` | RN `Text` | Difference |
| ---------------- | ----------- | --------- | ---------- |
| iOS, small       | 34.5 KB     | 42.6 KB   | 19% less   |
| iOS, regular     | 49.6 KB     | 58.4 KB   | 15% less   |
| iOS, large       | 148.6 KB    | 197.6 KB  | 25% less   |
| Android, small   | 35.1 KB     | 52.9 KB   | 34% less   |
| Android, regular | 35.4 KB     | 52.7 KB   | 33% less   |
| Android, large   | 35.3 KB     | 53.2 KB   | 34% less   |

Each figure is a mean of 3 runs.

</details>
