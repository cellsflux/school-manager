// src/components/windows/ColorSchemeToggle.tsx
import { useMantineColorScheme, SegmentedControl } from "@mantine/core";

export function ColorSchemeToggle({
  onChange,
}: {
  onChange: (v: "light" | "dark" | "auto") => void;
}) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <SegmentedControl
      size="xs"
      value={colorScheme}
      onChange={(value) => {
        setColorScheme(value as "light" | "dark" | "auto");
        onChange(value);
      }}
      data={[
        { label: "Clair", value: "light" },
        { label: "Sombre", value: "dark" },
        { label: "Système", value: "auto" },
      ]}
    />
  );
}
