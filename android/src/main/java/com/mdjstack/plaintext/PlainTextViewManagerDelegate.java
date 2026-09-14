package com.mdjstack.plaintext;

import androidx.annotation.Nullable;
import com.facebook.react.bridge.ColorPropConverter;
import com.facebook.react.bridge.DynamicFromObject;
import com.facebook.react.uimanager.BackgroundStyleApplicator;
import com.facebook.react.uimanager.LengthPercentage;
import com.facebook.react.uimanager.style.BorderRadiusProp;
import com.facebook.react.uimanager.style.BorderStyle;
import com.facebook.react.uimanager.style.LogicalEdge;
import com.facebook.react.viewmanagers.RNPlainTextManagerDelegate;

/**
 * The generated delegate, plus the border styles: borders are view styles, not text styles, so
 * they arrive as flattened raw props rather than through our codegen spec, and every Android view
 * family forwards them to {@code BackgroundStyleApplicator} itself since {@code BaseViewManager}
 * has no border setters.
 *
 * <p>This lives in the delegate rather than {@code @ReactProp} setters because a delegate-driven
 * view manager never falls back to reflecting over annotations.
 *
 * <p>SYNC: a {@code @ReactProp} for anything the codegen spec doesn't declare is never called.
 * A new view-style prop belongs here, not as an annotation on {@link PlainTextViewManager}. See
 * docs/contributing/sync-points.md#set-14--padding-and-border-width-not-props.
 *
 * <p>Java rather than Kotlin, unlike the rest of the library: subclassing the generated Java
 * delegate from Kotlin fails to compile (the two {@code receiveCommand} overloads collapse onto
 * one JVM signature).
 */
class PlainTextViewManagerDelegate
    extends RNPlainTextManagerDelegate<PlainTextView, PlainTextViewManager> {
  PlainTextViewManagerDelegate(PlainTextViewManager viewManager) {
    super(viewManager);
  }

  @Override
  public void setProperty(PlainTextView view, String propName, @Nullable Object value) {
    // Gate on the prefix first: non-border props (text, fontSize, color) bail out via
    // startsWith immediately instead of hashing through the switch below.
    if (propName.startsWith("border")) {
      switch (propName) {
        // No block-axis widths exist to mirror the block-axis colors below (RN has none either).
        case "borderWidth":
          applyBorderWidth(view, LogicalEdge.ALL, value);
          return;
        case "borderLeftWidth":
          applyBorderWidth(view, LogicalEdge.LEFT, value);
          return;
        case "borderRightWidth":
          applyBorderWidth(view, LogicalEdge.RIGHT, value);
          return;
        case "borderTopWidth":
          applyBorderWidth(view, LogicalEdge.TOP, value);
          return;
        case "borderBottomWidth":
          applyBorderWidth(view, LogicalEdge.BOTTOM, value);
          return;
        case "borderStartWidth":
          applyBorderWidth(view, LogicalEdge.START, value);
          return;
        case "borderEndWidth":
          applyBorderWidth(view, LogicalEdge.END, value);
          return;

        case "borderColor":
          applyBorderColor(view, LogicalEdge.ALL, value);
          return;
        case "borderLeftColor":
          applyBorderColor(view, LogicalEdge.LEFT, value);
          return;
        case "borderRightColor":
          applyBorderColor(view, LogicalEdge.RIGHT, value);
          return;
        case "borderTopColor":
          applyBorderColor(view, LogicalEdge.TOP, value);
          return;
        case "borderBottomColor":
          applyBorderColor(view, LogicalEdge.BOTTOM, value);
          return;
        case "borderStartColor":
          applyBorderColor(view, LogicalEdge.START, value);
          return;
        case "borderEndColor":
          applyBorderColor(view, LogicalEdge.END, value);
          return;
        case "borderBlockColor":
          applyBorderColor(view, LogicalEdge.BLOCK, value);
          return;
        case "borderBlockStartColor":
          applyBorderColor(view, LogicalEdge.BLOCK_START, value);
          return;
        case "borderBlockEndColor":
          applyBorderColor(view, LogicalEdge.BLOCK_END, value);
          return;

        case "borderRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_RADIUS, value);
          return;
        case "borderTopLeftRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_TOP_LEFT_RADIUS, value);
          return;
        case "borderTopRightRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_TOP_RIGHT_RADIUS, value);
          return;
        case "borderBottomRightRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_BOTTOM_RIGHT_RADIUS, value);
          return;
        case "borderBottomLeftRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_BOTTOM_LEFT_RADIUS, value);
          return;
        case "borderTopStartRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_TOP_START_RADIUS, value);
          return;
        case "borderTopEndRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_TOP_END_RADIUS, value);
          return;
        case "borderBottomStartRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_BOTTOM_START_RADIUS, value);
          return;
        case "borderBottomEndRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_BOTTOM_END_RADIUS, value);
          return;
        case "borderStartStartRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_START_START_RADIUS, value);
          return;
        case "borderStartEndRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_START_END_RADIUS, value);
          return;
        case "borderEndStartRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_END_START_RADIUS, value);
          return;
        case "borderEndEndRadius":
          applyBorderRadius(view, BorderRadiusProp.BORDER_END_END_RADIUS, value);
          return;

        case "borderStyle":
          BackgroundStyleApplicator.setBorderStyle(
              view, value == null ? null : BorderStyle.fromString((String) value));
          return;

        default:
          // A border prop we don't handle (borderCurve, say), fall through.
          break;
      }
    }

    // Everything our codegen spec declares, plus the base view props.
    super.setProperty(view, propName, value);
  }

  /** Widths arrive in DIP. BackgroundStyleApplicator scales them. null clears. */
  private static void applyBorderWidth(PlainTextView view, LogicalEdge edge, @Nullable Object value) {
    BackgroundStyleApplicator.setBorderWidth(
        view, edge, value == null ? null : ((Double) value).floatValue());
  }

  private static void applyBorderColor(PlainTextView view, LogicalEdge edge, @Nullable Object value) {
    BackgroundStyleApplicator.setBorderColor(
        view, edge, ColorPropConverter.getColor(value, view.getContext()));
  }

  private static void applyBorderRadius(
      PlainTextView view, BorderRadiusProp corner, @Nullable Object value) {
    // A radius may be a percentage string, hence the Dynamic round-trip.
    // setFromDynamic warns for any other type, null included, so a cleared
    // radius short-circuits here.
    LengthPercentage radius =
        value == null ? null : LengthPercentage.setFromDynamic(new DynamicFromObject(value), false);
    BackgroundStyleApplicator.setBorderRadius(view, corner, radius);
  }
}
