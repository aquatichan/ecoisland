import SquishSwitch from "@/components/bits/SquishSwitch";
import { COLORS } from "@/lib/tokens";

/** On/off switch (React Bits SquishSwitch) in Ecoisland colors. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <SquishSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      ariaLabel={label}
      className="[&_button]:rounded-full"
      width={46}
      height={28}
      trackColor={COLORS.track}
      trackOnColor={COLORS.brand}
      thumbColor={COLORS["brand-fg"]}
      thumbOnColor={COLORS["brand-fg"]}
    />
  );
}
