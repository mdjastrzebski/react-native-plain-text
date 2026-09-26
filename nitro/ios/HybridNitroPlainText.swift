import CoreText
import NitroModules
import UIKit

// Nitro Views port of ios/RNPlainText.mm, kept to the same shape for a fair
// benchmark: one UILabel, one attributedText write per prop transaction
// (afterUpdate), fonts from a port of PlainText's resolver (NitroPlainTextFont).
//
// SYNC: sized by ios/NitroPlainTextShadowNode+iOS.mm, which must mirror every
// size-affecting attribute set here, as PlainTextShadowNode.mm mirrors RNPlainText.mm.
final class HybridNitroPlainText: HybridNitroPlainTextSpec {
  let view: NitroPlainTextLabel = {
    let label = NitroPlainTextLabel()
    label.numberOfLines = 0
    // Always set explicitly: UILabel's own default wraps earlier than measureContent's.
    label.lineBreakStrategy = []
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
    let fontSizeMultiplier = NitroPlainTextFont.fontSizeMultiplier(
      withAllowFontScaling: allowFontScaling ?? true,
      maxFontSizeMultiplier: CGFloat(maxFontSizeMultiplier ?? 0)
    )
    let font = NitroPlainTextFont.font(
      withFamily: fontFamily,
      weight: fontWeight,
      style: fontStyle,
      size: CGFloat(fontSize ?? 14),
      multiplier: fontSizeMultiplier
    )

    var string = text ?? ""
    switch textTransform {
    case .uppercase: string = string.uppercased()
    case .lowercase: string = string.lowercased()
    case .capitalize: string = NitroPlainTextFont.capitalizedString(string)
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

    // Mirrors RN <Text>: drawn whenever textShadowOffset was provided; unset
    // radius/color fall back to NSShadow's own defaults.
    if textShadowOffsetWidth != nil || textShadowOffsetHeight != nil {
      let shadow = NSShadow()
      shadow.shadowOffset = CGSize(width: textShadowOffsetWidth ?? 0, height: textShadowOffsetHeight ?? 0)
      shadow.shadowBlurRadius = textShadowRadius ?? 0
      if let textShadowColor {
        shadow.shadowColor = uiColor(textShadowColor)
      }
      attributes[.shadow] = shadow
    }

    if let lang, !lang.isEmpty {
      attributes[NSAttributedString.Key(kCTLanguageAttributeName as String)] = lang
    }

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = textAlignment
    // The paragraph style overrides the label's own lineBreakMode/lineBreakStrategy.
    paragraph.lineBreakMode = lineBreakMode
    paragraph.lineBreakStrategy = []
    if hyphens == .auto {
      paragraph.usesDefaultHyphenation = true
    }

    // RNPlainText.mm's centering of a pinned lineHeight (RN#46884's algorithm).
    var verticalTextShift: CGFloat = 0
    if let lineHeight, lineHeight > 0 {
      let scaled = CGFloat(lineHeight) * fontSizeMultiplier
      paragraph.minimumLineHeight = scaled
      paragraph.maximumLineHeight = scaled
      if scaled >= font.lineHeight {
        verticalTextShift = (scaled - font.lineHeight) / 2
      } else {
        let textHeight = font.ascender + abs(font.descender)
        verticalTextShift = (scaled - textHeight) / 2
      }
    }
    view.verticalTextShift = verticalTextShift
    attributes[.paragraphStyle] = paragraph

    view.attributedText = NSAttributedString(string: string, attributes: attributes)
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
    switch ellipsizeMode {
    case .head: return .byTruncatingHead
    case .middle: return .byTruncatingMiddle
    case .clip: return .byClipping
    default: return .byTruncatingTail
    }
  }
}

// RNPlainTextLabel (ios/RNPlainText.mm), minus textAlignVertical (not in the spec):
// top-aligned, with the whole drawn block shifted to center a pinned lineHeight.
final class NitroPlainTextLabel: UILabel {
  var verticalTextShift: CGFloat = 0 {
    didSet {
      // UILabel won't redraw for an isEqual attributedText, see RNPlainText.mm.
      if verticalTextShift != oldValue {
        setNeedsDisplay()
      }
    }
  }

  override func textRect(forBounds bounds: CGRect, limitedToNumberOfLines numberOfLines: Int) -> CGRect {
    var rect = super.textRect(forBounds: bounds, limitedToNumberOfLines: numberOfLines)
    rect.origin.y = bounds.origin.y - verticalTextShift
    return rect
  }

  override func drawText(in rect: CGRect) {
    super.drawText(in: textRect(forBounds: rect, limitedToNumberOfLines: numberOfLines))
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
