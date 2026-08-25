import Image from "next/image";

export function Logo({
  className = "h-8 w-auto",
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <Image
      src="/floors-ng-logo.png"
      alt="Floors NG — Floors Nigeria"
      width={200}
      height={48}
      className={className}
      style={invert ? { filter: "brightness(0) invert(1)" } : undefined}
      priority
    />
  );
}
