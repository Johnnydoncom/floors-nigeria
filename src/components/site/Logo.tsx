import logoAsset from "@/assets/floors-ng-logo.png.asset.json";

export function Logo({ className = "h-8 w-auto", invert = false }: { className?: string; invert?: boolean }) {
  return (
    <img
      src={logoAsset.url}
      alt="Floors NG — Floors Nigeria"
      width={200}
      height={48}
      className={className}
      style={invert ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}
