import SquishSwitch from "@/components/bits/SquishSwitch";
import { useTheme } from "@/lib/theme";

/** On/off switch (React Bits SquishSwitch) in Ecoisland colors. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const { resolved } = useTheme();
  const dark = resolved === "dark";
  return (
    <SquishSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      ariaLabel={label}
      width={46}
      height={28}
      trackColor={dark ? "#26332d" : "#dcd8cc"}
      trackOnColor={dark ? "#46c48a" : "#1c7c50"}
      thumbColor="#ffffff"
      thumbOnColor="#ffffff"
    />
  );
}
