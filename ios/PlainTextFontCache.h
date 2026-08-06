/*
 * A key -> object cache that invalidates itself whenever fonts are
 * registered or unregistered at runtime (expo-font,
 * CTFontManagerRegisterFontsForURL), since that changes what a fontFamily
 * resolves to — RCTFont.mm clears its own family-name cache on the same
 * notification. PlainTextFont.mm's three caches (family face names, resolved
 * face name, resolved UIFont) each wrap one of these instead of repeating the
 * NSCache/notification wiring.
 *
 * A miss runs `compute` and stores whatever it returns, nil included: nil
 * means "cache this as unresolvable" rather than "don't cache", since
 * re-deriving that a fontFamily is unresolvable costs the same font-database
 * walk (and the same log line) as deriving it the first time. Callers don't
 * need their own sentinel for this, unlike a raw NSCache, which cannot store
 * nil at all.
 */

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface PlainTextFontCache<KeyType : NSString *, ObjectType : id> : NSObject

/*
 * `countLimit` of 0 means unlimited, same as NSCache's own default.
 */
- (instancetype)initWithCountLimit:(NSUInteger)countLimit;

/*
 * `key`'s cached value. On a miss, `compute` runs once, its result is stored
 * under `key`, and that result is returned.
 */
- (nullable ObjectType)objectForKey:(KeyType)key orSet:(ObjectType _Nullable (^)(void))compute;

@end

NS_ASSUME_NONNULL_END
