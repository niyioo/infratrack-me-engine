import { useState, type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

/**
 * Pressable with a static style plus an optional pressed style.
 *
 * Use this instead of `<Pressable style={({ pressed }) => ...}>`: NativeWind's
 * css-interop wraps Pressable and drops function styles, so backgrounds, borders
 * and shadows set that way never render.
 */
export function PressableSurface({
  style,
  pressedStyle,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[style, pressed && pressedStyle]}
    >
      {children}
    </Pressable>
  );
}
