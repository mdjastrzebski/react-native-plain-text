/*
 * A table of inputs against expected results for parseFontVariations.
 *
 * Lives outside ios/ and cpp/ on purpose: the podspec globs the cpp sources
 * under both of those directories, and android/src/main/jni/CMakeLists.txt
 * globs the ones under cpp/, so a test file in either would compile into the
 * shipped pod and into the Android build.
 *
 * Run with `yarn test:cpp`. No framework and no include paths, because the unit
 * under test pulls in nothing but the standard library. Keep it that way.
 *
 * What this pins is our parser's behavior, not parity with Android's. The
 * grammar is meant to be the one FontVariationAxis.fromFontVariationSettings
 * accepts, plus the "normal" keyword that RN's Android wrapper recognizes one
 * layer above that grammar, and the cases below say which side of the line
 * each input falls on — but nothing here executes the Java parser. Those
 * expectations were read off android-36's FontVariationAxis.java, and the
 * "known divergences" section lists the inputs where the two disagree.
 */

#include "../../ios/PlainTextFontVariations.h"

#include <cstdio>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

using facebook::react::parseFontVariations;
using facebook::react::PlainTextFontVariationAxis;

namespace {

// 'wght' -> 0x77676874, the form CoreText keys variations by.
constexpr uint32_t tag(const char (&code)[5])
{
  return (static_cast<uint32_t>(static_cast<unsigned char>(code[0])) << 24) |
      (static_cast<uint32_t>(static_cast<unsigned char>(code[1])) << 16) |
      (static_cast<uint32_t>(static_cast<unsigned char>(code[2])) << 8) |
      static_cast<uint32_t>(static_cast<unsigned char>(code[3]));
}

struct Case {
  // What the input is meant to exercise, printed when the case fails.
  const char *what;
  const char *input;
  // The axes expected out, in order. An unset optional expects a rejection.
  std::optional<std::vector<PlainTextFontVariationAxis>> expected;
};

// Shorthand for the rejection cases, which are most of the table.
const std::optional<std::vector<PlainTextFontVariationAxis>> kInvalid = std::nullopt;

const Case kCases[] = {
    // Accepted, the shapes a real fontVariationSettings prop takes.
    {"empty string sets no axes", "", std::vector<PlainTextFontVariationAxis>{}},
    {"double quotes", "\"wght\" 700", {{{tag("wght"), 700}}}},
    {"single quotes", "'wght' 700", {{{tag("wght"), 700}}}},
    {"two axes", "'wght' 700, 'wdth' 85", {{{tag("wght"), 700}, {tag("wdth"), 85}}}},
    {"three axes", "'wght' 300, 'wdth' 100, 'slnt' -10", {{{tag("wght"), 300}, {tag("wdth"), 100}, {tag("slnt"), -10}}}},
    {"axis order is preserved", "'wdth' 85, 'wght' 700", {{{tag("wdth"), 85}, {tag("wght"), 700}}}},
    {"a repeated tag is kept twice, for the caller to resolve",
     "'wght' 400, 'wght' 700",
     {{{tag("wght"), 400}, {tag("wght"), 700}}}},
    {"fractional value", "'wght' 412.5", {{{tag("wght"), 412.5}}}},
    {"negative value", "'slnt' -12.25", {{{tag("slnt"), -12.25}}}},
    // Float.parseFloat takes all three, so Android does too. The
    // STYLE_VALUE_PATTERN regex in the same Java file would reject them, but
    // fromFontVariationSettings never calls it.
    {"explicitly positive value", "'wght' +700", {{{tag("wght"), 700}}}},
    {"exponent notation", "'wght' 7e2", {{{tag("wght"), 700}}}},
    {"hex float", "'wght' 0x1p3", {{{tag("wght"), 8}}}},
    {"no space between tag and value", "'wght'700", {{{tag("wght"), 700}}}},
    {"leading and trailing whitespace", "  \t'wght' 700\n ", {{{tag("wght"), 700}}}},
    {"whitespace around the separating comma", "'wght' 700 ,\t 'wdth' 85", {{{tag("wght"), 700}, {tag("wdth"), 85}}}},
    // Android's scanner reads the comma as the value terminator and then runs
    // off the end of the string, so a trailing comma is not an empty entry
    // there. Getting this wrong is the bug this file exists for.
    {"trailing comma", "'wght' 700,", {{{tag("wght"), 700}}}},
    {"trailing comma with trailing space", "'wght' 700, ", {{{tag("wght"), 700}}}},
    {"trailing comma after several axes", "'wght' 700, 'wdth' 85,", {{{tag("wght"), 700}, {tag("wdth"), 85}}}},
    // U+0020 and U+007E, the two ends of Android's TAG_PATTERN.
    {"tag characters at the ends of the allowed range", "'   ~' 1", {{{tag("   ~"), 1}}}},
    {"a tag padded with spaces, as the Android docs write it", "'AX  ' 2.0", {{{tag("AX  "), 2}}}},
    {"a double-quoted tag may contain a single quote", "\"a'b'\" 1", {{{tag("a'b'"), 1}}}},

    // "normal" is CSS's own spelling of "sets no axes" — not a shape
    // fromFontVariationSettings itself recognizes, but one parseFontVariations
    // special-cases the same way RN's Android wrapper does, one layer above
    // the raw grammar.
    {"normal sets no axes", "normal", std::vector<PlainTextFontVariationAxis>{}},
    {"normal is case-insensitive", "NoRmAl", std::vector<PlainTextFontVariationAxis>{}},
    {"normal is trimmed before the comparison", "  normal  ", std::vector<PlainTextFontVariationAxis>{}},

    // Rejected, and refused by Android too, so the prop cannot mean two
    // different things across the two platforms.
    //
    // Whitespace-only is rejected rather than treated as "normal": the
    // comparison above only ever matches the literal word, and the string
    // that reaches the grammar below when it doesn't is the original,
    // un-trimmed one — so this stays a rejection rather than silently
    // becoming "" and passing as no axes.
    {"whitespace only", "   ", kInvalid},
    {"normal is only recognized as the whole string, not one entry among others",
     "'wght' 700, normal",
     kInvalid},
    {"tag without quotes", "wght 700", kInvalid},
    {"no closing quote", "'wght 700", kInvalid},
    {"mismatched quotes", "'wght\" 700", kInvalid},
    {"tag shorter than four characters", "'wgt' 700", kInvalid},
    {"tag longer than four characters", "'wghtx' 700", kInvalid},
    {"empty tag", "'' 700", kInvalid},
    {"tag holding a character below U+0020", "'wg\tt' 700", kInvalid},
    {"tag holding a character above U+007E", "'wg\xC3\xA9' 700", kInvalid},
    {"tag with no value", "'wght'", kInvalid},
    {"tag with whitespace where the value goes", "'wght'  ", kInvalid},
    {"value that is not a number", "'wght' bold", kInvalid},
    // Java's Float.parseFloat spells these "Infinity" and "NaN" and rejects the
    // lowercase forms; std::strtod takes the lowercase ones, and the finite
    // check is what turns them away here.
    {"lowercase infinity", "'wght' inf", kInvalid},
    {"lowercase not-a-number", "'wght' nan", kInvalid},
    {"trailing garbage after the value", "'wght' 700px", kInvalid},
    {"a second value on one entry", "'wght' 700 800", kInvalid},
    {"leading comma", ",'wght' 700", kInvalid},
    {"interior empty entry", "'wght' 700,, 'wdth' 85", kInvalid},
    {"two trailing commas", "'wght' 700,,", kInvalid},
    {"a comma on its own", ",", kInvalid},
    {"one bad entry rejects the whole string, including the entries that parsed",
     "'wght' 700, nonsense, 'wdth' 85",
     kInvalid},

    // Known divergences. All four come from the value side, where Android runs
    // Float.parseFloat and we run std::strtod, and the two disagree at the
    // edges. Listed here so the difference is a recorded decision rather than a
    // surprise: none of them is a value a real font could use, and matching
    // Java exactly would mean hand-rolling a float grammar.
    {"Java's spelling of infinity, which Android accepts", "'wght' Infinity", kInvalid},
    {"Java's spelling of not-a-number, which Android accepts", "'wght' NaN", kInvalid},
    {"a Java float suffix, which Float.parseFloat accepts", "'wght' 700f", kInvalid},
    {"a Java double suffix, which Float.parseFloat accepts", "'wght' 700d", kInvalid},
};

void describe(const std::optional<std::vector<PlainTextFontVariationAxis>> &axes, std::string &out)
{
  if (!axes.has_value()) {
    out = "rejected";
    return;
  }
  out = "{";
  for (size_t index = 0; index < axes->size(); ++index) {
    const PlainTextFontVariationAxis &axis = (*axes)[index];
    char buffer[64];
    std::snprintf(
        buffer,
        sizeof(buffer),
        "%s%c%c%c%c=%g",
        index == 0 ? "" : ", ",
        static_cast<char>((axis.tag >> 24) & 0xFF),
        static_cast<char>((axis.tag >> 16) & 0xFF),
        static_cast<char>((axis.tag >> 8) & 0xFF),
        static_cast<char>(axis.tag & 0xFF),
        axis.value);
    out += buffer;
  }
  out += "}";
}

bool equal(
    const std::optional<std::vector<PlainTextFontVariationAxis>> &a,
    const std::optional<std::vector<PlainTextFontVariationAxis>> &b)
{
  if (a.has_value() != b.has_value()) {
    return false;
  }
  if (!a.has_value()) {
    return true;
  }
  if (a->size() != b->size()) {
    return false;
  }
  for (size_t index = 0; index < a->size(); ++index) {
    // Exact comparison: every expected value above is representable, so a
    // tolerance would only hide a parser that lost precision.
    if ((*a)[index].tag != (*b)[index].tag || (*a)[index].value != (*b)[index].value) {
      return false;
    }
  }
  return true;
}

} // namespace

int main()
{
  int failures = 0;
  for (const Case &testCase : kCases) {
    std::optional<std::vector<PlainTextFontVariationAxis>> actual = parseFontVariations(testCase.input);
    if (equal(actual, testCase.expected)) {
      continue;
    }
    ++failures;
    std::string expectedText;
    std::string actualText;
    describe(testCase.expected, expectedText);
    describe(actual, actualText);
    std::printf(
        "FAIL %s\n  input:    \"%s\"\n  expected: %s\n  actual:   %s\n",
        testCase.what,
        testCase.input,
        expectedText.c_str(),
        actualText.c_str());
  }

  int total = static_cast<int>(sizeof(kCases) / sizeof(kCases[0]));
  if (failures > 0) {
    std::printf("\nparseFontVariations: %d of %d cases failed\n", failures, total);
    return 1;
  }
  std::printf("parseFontVariations: %d cases passed\n", total);
  return 0;
}
