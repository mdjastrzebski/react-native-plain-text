import CoreText
import NitroModules
import UIKit

// Nitro Views port of ios/RNPlainText.mm, kept to the same shape for a fair
// benchmark: one UILabel, one attributedText write per prop transaction
// (afterUpdate), fonts cached per family/weight/style/size.
//
// Unlike RNPlainText there is no custom shadow node, so nothing measures the
// text: the view is only as big as its style makes it.
final class HybridNitroPlainText: HybridNitroPlainTextSpec {
  let view: UILabel = {
    let label = UILabel()
    label.numberOfLines = 0
    return label
  }()

  var text: String?
  var color: Double?
  var fontSize: Double?
  var fontFamily: String?
  var fontWeight: String?
  var fontStyle: String?
  var lineHeight: Double?
  var letterSpacing: Double?
  var textAlign: NitroTextAlign?
  var textDecorationLine: String?
  var textTransform: NitroTextTransform?
  var textShadowColor: Double?
  var textShadowOffsetWidth: Double?
  var textShadowOffsetHeight: Double?
  var textShadowRadius: Double?
  var hyphens: NitroHyphens?
  var lang: String?
  var numberOfLines: Double?
  var ellipsizeMode: NitroEllipsizeMode?
  var allowFontScaling: Bool?
  var maxFontSizeMultiplier: Double?

  func afterUpdate() {
    applyContent()
  }

  private func applyContent() {
    let font = resolveFont()

    var string = text ?? ""
    switch textTransform {
    case .uppercase: string = string.uppercased()
    case .lowercase: string = string.lowercased()
    case .capitalize: string = string.capitalized
    default: break
    }

    var attributes: [NSAttributedString.Key: Any] = [
      .font: font,
      .foregroundColor: color.map(uiColor) ?? UIColor.black,
    ]

    if let letterSpacing {
      attributes[.kern] = letterSpacing
    }

    if let textDecorationLine {
      if textDecorationLine.contains("underline") {
        attributes[.underlineStyle] = NSUnderlineStyle.single.rawValue
      }
      if textDecorationLine.contains("line-through") {
        attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
      }
    }

    if textShadowOffsetWidth != nil || textShadowOffsetHeight != nil {
      let shadow = NSShadow()
      shadow.shadowOffset = CGSize(width: textShadowOffsetWidth ?? 0, height: textShadowOffsetHeight ?? 0)
      shadow.shadowBlurRadius = textShadowRadius ?? 0
      shadow.shadowColor = textShadowColor.map(uiColor) ?? UIColor.black.withAlphaComponent(1.0 / 3.0)
      attributes[.shadow] = shadow
    }

    if let lang, !lang.isEmpty {
      attributes[NSAttributedString.Key(kCTLanguageAttributeName as String)] = lang
    }

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = textAlignment
    if let lineHeight, lineHeight > 0 {
      let scaled = CGFloat(lineHeight) * fontSizeMultiplier
      paragraph.minimumLineHeight = scaled
      paragraph.maximumLineHeight = scaled
      // Centers glyphs in the pinned line, as RN <Text> does.
      attributes[.baselineOffset] = (scaled - font.lineHeight) / 2
    }
    if hyphens == .auto {
      if #available(iOS 15.0, *) {
        paragraph.usesDefaultHyphenation = true
      } else {
        paragraph.hyphenationFactor = 1
      }
    }
    attributes[.paragraphStyle] = paragraph

    view.attributedText = NSAttributedString(string: string, attributes: attributes)
    // Set after attributedText, which would otherwise reset them from the paragraph style.
    view.numberOfLines = Int(numberOfLines ?? 0)
    view.lineBreakMode = lineBreakMode
  }

  private var textAlignment: NSTextAlignment {
    switch textAlign {
    case .left: return .left
    case .right: return .right
    case .center: return .center
    case .justify: return .justified
    default: return .natural
    }
  }

  private var lineBreakMode: NSLineBreakMode {
    // Wrapping only when unlimited lines, like RN <Text>.
    if (numberOfLines ?? 0) <= 0 { return .byWordWrapping }
    switch ellipsizeMode {
    case .head: return .byTruncatingHead
    case .middle: return .byTruncatingMiddle
    case .clip: return .byClipping
    default: return .byTruncatingTail
    }
  }

  // Mirrors RN's RCTEffectiveFontSizeMultiplierFromTextAttributes.
  private var fontSizeMultiplier: CGFloat {
    if allowFontScaling == false { return 1 }
    let multiplier = UIFontMetrics.default.scaledValue(for: 1)
    if let max = maxFontSizeMultiplier, max >= 1 {
      return min(multiplier, CGFloat(max))
    }
    return multiplier
  }

  private func resolveFont() -> UIFont {
    let size = CGFloat(fontSize ?? 14) * fontSizeMultiplier
    let key = FontKey(family: fontFamily, weight: fontWeight, style: fontStyle, size: size)
    if let cached = HybridNitroPlainText.fontCache[key] {
      return cached
    }

    let weight = HybridNitroPlainText.uiFontWeight(fontWeight)
    var font: UIFont
    if let family = fontFamily, !family.isEmpty {
      // An exact PostScript/font name first, then the family with the weight trait.
      if fontWeight == nil, fontStyle == nil, let named = UIFont(name: family, size: size) {
        font = named
      } else {
        let descriptor = UIFontDescriptor(fontAttributes: [
          .family: family,
          .traits: [UIFontDescriptor.TraitKey.weight: weight],
        ])
        font = UIFont(descriptor: descriptor, size: size)
      }
    } else {
      font = UIFont.systemFont(ofSize: size, weight: weight)
    }

    if fontStyle == "italic",
      let italic = font.fontDescriptor.withSymbolicTraits(font.fontDescriptor.symbolicTraits.union(.traitItalic))
    {
      font = UIFont(descriptor: italic, size: size)
    }

    HybridNitroPlainText.fontCache[key] = font
    return font
  }

  private struct FontKey: Hashable {
    let family: String?
    let weight: String?
    let style: String?
    let size: CGFloat
  }

  // Main thread only: Nitro applies view props on the main thread.
  nonisolated(unsafe) private static var fontCache: [FontKey: UIFont] = [:]

  private static func uiFontWeight(_ weight: String?) -> UIFont.Weight {
    switch weight {
    case "100", "ultralight": return .ultraLight
    case "200", "thin": return .thin
    case "300", "light": return .light
    case "500", "medium": return .medium
    case "600", "semibold": return .semibold
    case "700", "bold": return .bold
    case "800", "heavy": return .heavy
    case "900", "black": return .black
    default: return .regular
    }
  }
}

// processColor's 0xAARRGGBB, as a JS number.
private func uiColor(_ value: Double) -> UIColor {
  let argb = UInt32(truncatingIfNeeded: Int64(value))
  return UIColor(
    red: CGFloat((argb >> 16) & 0xFF) / 255,
    green: CGFloat((argb >> 8) & 0xFF) / 255,
    blue: CGFloat(argb & 0xFF) / 255,
    alpha: CGFloat((argb >> 24) & 0xFF) / 255
  )
}
