import React from "react";

interface VyikaLogoProps {
  className?: string;
  variant?: "dark" | "white" | "auto";
  darkBackground?: boolean;
}

export const VyikaLogo: React.FC<VyikaLogoProps> = ({
  className = "h-10 md:h-14 w-auto",
  variant = "auto",
  darkBackground = false,
}) => {
  const isWhite = variant === "white" || (variant === "auto" && darkBackground);
  const logoSrc = isWhite ? "/vyika_logo_horizontal_white.svg" : "/vyika_logo_horizontal_dark.svg";

  return (
    <div className={`flex items-center justify-center gap-2 ${darkBackground ? "bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-md" : ""}`}>
      <img
        src={logoSrc}
        alt="VYIKA Logo"
        className={`w-auto object-contain transition-all duration-200 filter drop-shadow-sm font-black ${className}`}
      />
    </div>
  );
};

export default VyikaLogo;




